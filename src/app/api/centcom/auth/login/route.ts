import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import { getLicenseTypeConfig } from '@/lib/license-types'

interface CentcomAuthRequest {
  email: string
  password: string
  app_id?: string
  client_info?: {
    version: string
    instance_id: string
    user_agent?: string
    platform?: string
    build?: string
    device_name?: string
    os_version?: string
    license_type?: string  // Added for enhanced CentCom license tracking
    app_name?: string      // Added for clean app identification
  }
}

interface CentcomAuthResponse {
  success: boolean
  user?: {
    id: string
    email: string
    username?: string
    roles: string[]
    license_type: string
    security_clearance: string
    organization?: string
  }
  session?: {
    access_token: string
    expires_at: string
    permissions: string[]
  }
  licenses?: Array<{
    id: string
    key_code: string
    license_category: string
    license_type: string
    status: string
    license_config: {
      main_app_version: string
      main_app_permissions: Record<string, boolean>
      feature_configurations: Record<string, any>
      [key: string]: any
    }
    expires_at: string | null
  }>
  error?: string
}

export async function POST(req: NextRequest) {
  // CORS headers for Centcom and testing
  const origin = req.headers.get('origin')
  const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'null']
  const corsOrigin = allowedOrigins.includes(origin || 'null') ? (origin || '*') : 'http://localhost:3003'
  
  const headers = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  try {
    const body: CentcomAuthRequest = await req.json()
    const { email, password, app_id, client_info } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required'
      }, { status: 400, headers })
    }

    console.log('🔐 Centcom authentication attempt:', { email, app_id })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTU0MTYsImV4cCI6MjA2ODQ3MTQxNn0.5Wzzoat1TsoLLbsqjuoUEKyawJgYmvrMYbJ-uvosdu0'
    const supabase = createClient(supabaseUrl, anonKey)

    // Step 1: Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      console.log('❌ Supabase authentication failed:', authError?.message)
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials'
      }, { status: 401, headers })
    }

    console.log('✅ Supabase authentication successful:', authData.user.id)

    // Step 2: Get user profile and license information
    const userProfile = await getUserProfile(supabase, authData.user.id)
    
    if (!userProfile) {
      return NextResponse.json({
        success: false,
        error: 'User profile not found'
      }, { status: 404, headers })
    }

    // Step 3: Generate Centcom session token
    const sessionToken = generateCentcomToken(authData.user, userProfile)

    // Step 4: Log authentication event
    await logAuthenticationEvent(supabase, authData.user.id, app_id, client_info)

    // Step 4.5: Create CentCom session entry for real-time tracking
    await createCentComSessionEntry(req, supabase, authData.user.id, userProfile, app_id, client_info)

    // Step 4.7: Fetch user licenses with full configuration
    console.log('🔍 About to call getUserLicenses for user:', authData.user.id)
    let userLicenses: any[] = []
    try {
      userLicenses = await getUserLicenses(supabase, authData.user.id)
      console.log('✅ getUserLicenses completed successfully, returned:', userLicenses.length, 'licenses')
    } catch (licenseError: any) {
      console.error('❌ CRITICAL: getUserLicenses threw an error:', licenseError)
      console.error('❌ Error details:', {
        message: licenseError.message,
        stack: licenseError.stack
      })
      // Continue with empty array but log the error
      userLicenses = []
    }

    console.log('📦 License data prepared:', {
      count: userLicenses.length,
      licenses: userLicenses.map(l => ({
        key_code: l.key_code,
        type: l.license_type,
        has_local_cluster: !!l.license_config?.feature_configurations?.local_cluster
      }))
    })

    // Step 5: Return authentication response
    const response: CentcomAuthResponse = {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        username: userProfile.username || authData.user.email!.split('@')[0],
        roles: userProfile.roles || ['user'],
        license_type: userProfile.license_type || 'trial',
        security_clearance: userProfile.security_clearance || 'internal',
        organization: userProfile.organization
      },
      session: {
        access_token: sessionToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        permissions: mapRolesToPermissions(userProfile.roles || ['user'])
      },
      licenses: userLicenses
    }

    console.log('✅ Centcom authentication successful for:', email)
    console.log('📤 Response includes licenses:', response.licenses?.length || 0)
    if (response.licenses && response.licenses.length > 0) {
      console.log('📤 First license structure:', JSON.stringify({
        key_code: response.licenses[0].key_code,
        has_license_config: !!response.licenses[0].license_config,
        has_feature_configs: !!response.licenses[0].license_config?.feature_configurations,
        local_cluster_enabled: response.licenses[0].license_config?.feature_configurations?.local_cluster?.enabled
      }, null, 2))
    }

    return NextResponse.json(response, { headers })

  } catch (error: any) {
    console.error('❌ Authentication error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500, headers })
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'null']
  const corsOrigin = allowedOrigins.includes(origin || 'null') ? (origin || '*') : 'http://localhost:3003'
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// Helper function: Get user profile with license info
async function getUserProfile(supabase: any, userId: string) {
  try {
    // IMPORTANT: Use service role key to bypass RLS and get authoritative role data
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const serviceSupabase = createClient(supabaseUrl, serviceKey)

    // Query user profile and license information using service role
    const { data: profile, error: profileError } = await serviceSupabase
      .from('user_profiles')
      .select(`
        username,
        full_name,
        role,
        is_active
      `)
      .eq('id', userId)
      .single()

    if (profileError) {
      console.log('⚠️ Profile query error:', profileError.message)
      // Return basic profile if detailed lookup fails
      return {
        username: null,
        roles: ['user'],
        license_type: 'trial',
        security_clearance: 'internal',
        organization: null
      }
    }

    // Get user licenses - prioritize CentCom enterprise license (using service role)
    const { data: licenses } = await serviceSupabase
      .from('licenses')
      .select('license_type, status, key_code')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    console.log('🎫 Found licenses for user:', licenses?.length || 0, licenses?.map(l => `${l.license_type} (${l.key_code})`))

    // Prioritize CentCom licenses, then any enterprise license, then fallback
    const centcomLicense = licenses?.find(l => l.key_code?.includes('CENTCOM'))
    const enterpriseLicense = licenses?.find(l => l.license_type === 'enterprise')
    const activeLicense = centcomLicense || enterpriseLicense || licenses?.[0]

    const detectedLicenseType = activeLicense?.license_type || 'trial'
    console.log('🎫 Selected license:', activeLicense?.key_code || 'none', 'type:', detectedLicenseType)

    const userRoles = profile.role ? [profile.role] : ['user']
    console.log('🔐 SECURITY: Authoritative role from database:', profile.role, '→ roles array:', userRoles)

    return {
      username: profile.username,
      roles: userRoles,
      license_type: detectedLicenseType,
      security_clearance: 'internal', // Default for now
      organization: null // Company column doesn't exist
    }

  } catch (error) {
    console.error('❌ Error getting user profile:', error)
    return null
  }
}

// Helper function: Generate JWT token for Centcom
function generateCentcomToken(user: any, profile: any): string {
  const payload = {
    iss: 'lyceum',
    aud: 'centcom',
    sub: user.id,
    email: user.email,
    roles: profile.roles,
    license_type: profile.license_type,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iat: Math.floor(Date.now() / 1000)
  }

  // Use CENTCOM_SIGNING_KEY for JWT signing
  const signingKey = process.env.CENTCOM_SIGNING_KEY || 'default-dev-key'
  return jwt.sign(payload, signingKey, { algorithm: 'HS256' })
}

// Helper function: Map roles to Centcom permissions
function mapRolesToPermissions(roles: string[]): string[] {
  const rolePermissionMap: Record<string, string[]> = {
    'admin': ['*:*'], // Full access
    'superadmin': ['*:*'], // Full access
    'user': ['data:read', 'assets:read'],
    'engineer': ['data:read', 'data:write', 'assets:read', 'analytics:read'],
    'analyst': ['data:read', 'assets:read', 'analytics:read'],
    'viewer': ['data:read']
  }

  const permissions = new Set<string>()
  
  for (const role of roles) {
    const rolePerms = rolePermissionMap[role] || ['data:read']
    rolePerms.forEach(perm => permissions.add(perm))
  }

  return Array.from(permissions)
}

// Helper function: Log authentication events
async function logAuthenticationEvent(
  supabase: any,
  userId: string, 
  appId?: string, 
  clientInfo?: any
) {
  try {
    console.log('📝 Logging CentCom authentication event for user:', userId)
    
    // Try to insert into auth_logs table
    const { data, error } = await supabase
      .from('auth_logs')
      .insert({
        user_id: userId,
        event_type: 'login',
        app_id: appId || 'centcom',
        client_info: clientInfo || {},
        ip_address: '127.0.0.1',
        success: true,
        session_type: 'centcom',
        application_type: 'centcom',
        created_at: new Date().toISOString()
      })
      .select()
    
    if (error) {
      console.error('❌ Failed to log to auth_logs:', error.message)
      if (error.code === '42P01') {
        console.log('⚠️  auth_logs table does not exist. Run CREATE_AUTH_TABLES_FOR_SESSIONS.sql to create it.')
      }
    } else {
      console.log('✅ CentCom login logged to auth_logs successfully')
    }
    
    // Also try to log to user_activity_logs
    try {
      const { data: activityData, error: activityError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: userId,
          activity_type: 'login',
          description: `CentCom login from ${appId || 'centcom'}`,
          ip_address: '127.0.0.1',
          user_agent: clientInfo?.user_agent || 'CentCom Desktop Application',
          metadata: {
            app_id: appId || 'centcom',
            client_info: clientInfo,
            login_type: 'centcom'
          },
          created_at: new Date().toISOString()
        })
        .select()
      
      if (activityError) {
        console.error('❌ Failed to log to user_activity_logs:', activityError.message)
        if (activityError.code === '42P01') {
          console.log('⚠️  user_activity_logs table does not exist. Run CREATE_AUTH_TABLES_FOR_SESSIONS.sql to create it.')
        }
      } else {
        console.log('✅ CentCom login logged to user_activity_logs successfully')
      }
    } catch (activityErr) {
      console.error('⚠️ Activity logging failed:', activityErr)
    }
    
  } catch (error) {
    console.error('⚠️ Failed to log auth event (non-critical):', error)
    // Don't fail authentication if logging fails
  }
}

// Helper function: Create CentCom session entry for real-time tracking
async function createCentComSessionEntry(
  req: NextRequest,
  supabase: any,
  userId: string,
  userProfile: any,
  appId?: string,
  clientInfo?: any
) {
  try {
    console.log('📝 Creating CentCom session entry for user:', userId)
    console.log('📊 Client info received:', JSON.stringify(clientInfo, null, 2))
    
    // Generate unique session ID
    const sessionId = `centcom-${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    // Extract real IP address from request
    const realIp = getClientIP(req)
    console.log('🌐 Client IP detected:', realIp)
    
    // Get user agent from request headers or client_info
    const userAgent = req.headers.get('user-agent') || 
                     clientInfo?.user_agent || 
                     'CentCom Desktop Application'
    
    // Enhanced device and platform detection
    const deviceInfo = parseDeviceInfo(userAgent, clientInfo)
    console.log('📱 Device info parsed:', deviceInfo)
    
    // Get location data from IP
    const locationInfo = await getLocationFromIP(realIp)
    console.log('📍 Location info:', locationInfo)
    
    // Extract app version (prioritize client_info.version)
    const appVersion = clientInfo?.version || 
                      extractVersionFromUserAgent(userAgent) || 
                      '1.0.0' // Default to 1.0.0 instead of 2.1.0
    
    // Extract license type (prioritize client_info.license_type from CentCom)
    const licenseType = clientInfo?.license_type ||           // CentCom enhanced client_info (highest priority)
                       userProfile?.license_type ||           // Lyceum user profile lookup
                       'trial'                                // Fallback default
    
    console.log('🔢 App version extracted:', appVersion)
    console.log('🎫 License type extracted:', licenseType, 'from', clientInfo?.license_type ? 'client_info' : userProfile?.license_type ? 'user_profile' : 'default')
    
    const sessionData = {
      user_id: userId,
      centcom_session_id: sessionId,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      session_status: 'active',
      source_ip: realIp,
      user_agent: userAgent,
      mfa_verified: false, // Default, can be updated by session sync
      risk_score: calculateRiskScore(realIp, deviceInfo),
      country: locationInfo.country,
      city: locationInfo.city,
      timezone: locationInfo.timezone,
      platform: deviceInfo.platform,
      device_type: deviceInfo.device_type,
      browser: deviceInfo.browser,
      app_name: 'CentCom',
      app_version: appVersion,
      build_number: clientInfo?.build || 'unknown',
      license_type: licenseType,
      sync_timestamp: new Date().toISOString(),
      sync_source: 'centcom_login_endpoint',
      sync_version: '1.0'
    }
    
    console.log('💾 Session data to insert:', JSON.stringify(sessionData, null, 2))
    
    const { data, error } = await supabase
      .from('centcom_sessions')
      .insert(sessionData)
      .select()
    
    if (error) {
      console.warn('⚠️ Failed to create CentCom session entry:', error.message)
      // Don't fail login if session creation fails
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('💡 Run database-setup-centcom-sessions.sql to enable session tracking')
      }
    } else {
      console.log('✅ CentCom session entry created successfully:', sessionId)
    }
    
  } catch (error) {
    console.error('⚠️ Failed to create CentCom session entry (non-critical):', error)
    // Don't fail authentication if session creation fails
  }
}

// Helper function: Extract real client IP address
function getClientIP(req: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list, take the first one
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp
  }
  
  // Fall back to localhost for development
  return '127.0.0.1'
}

// Helper function: Parse device and platform information
function parseDeviceInfo(userAgent: string, clientInfo?: any) {
  const ua = userAgent.toLowerCase()
  
  // Platform detection (prioritize client_info if available)
  let platform = clientInfo?.platform || 'Unknown'
  if (platform === 'Unknown') {
    if (ua.includes('windows')) platform = 'Windows'
    else if (ua.includes('mac') || ua.includes('darwin')) platform = 'macOS'
    else if (ua.includes('linux')) platform = 'Linux'
    else if (ua.includes('android')) platform = 'Android'
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) platform = 'iOS'
  }
  
  // Device type detection
  let deviceType = 'desktop'
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    deviceType = 'mobile'
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'tablet'
  }
  
  // Browser/App detection
  let browser = 'Desktop Application'
  if (ua.includes('centcom')) {
    browser = 'CentCom Desktop'
  } else if (ua.includes('tauri')) {
    browser = 'Tauri WebView'
  } else if (ua.includes('electron')) {
    browser = 'Electron'
  } else if (ua.includes('chrome')) {
    browser = 'Chrome'
  } else if (ua.includes('firefox')) {
    browser = 'Firefox'
  } else if (ua.includes('safari')) {
    browser = 'Safari'
  }
  
  return {
    platform,
    device_type: deviceType,
    browser,
    device_name: clientInfo?.device_name || `${platform} Device`
  }
}

// Helper function: Extract version from user agent
function extractVersionFromUserAgent(userAgent: string): string | null {
  // Look for patterns like "CentCom/1.0.0" or "Version/1.0.0"
  const versionMatch = userAgent.match(/(?:CentCom|Version)\/(\d+\.\d+\.\d+)/i)
  return versionMatch ? versionMatch[1] : null
}

// Helper function: Get location information from IP address
async function getLocationFromIP(ip: string) {
  // Default values for localhost/private IPs (IPv4 and IPv6)
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || 
      ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.') ||
      ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return {
      country: 'Local',
      city: 'Development',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  }
  
  try {
    // Use ipapi.co for geolocation (free tier: 1000 requests/day)
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: {
        'User-Agent': 'Lyceum-CentCom-Session-Tracker/1.0'
      },
      signal: AbortSignal.timeout(3000) // 3 second timeout
    })
    
    if (response.ok) {
      const data = await response.json()
      return {
        country: data.country_name || 'Unknown',
        city: data.city || 'Unknown',
        timezone: data.timezone || 'UTC'
      }
    }
  } catch (error) {
    console.log('⚠️ IP geolocation failed:', error.message)
  }
  
  // Fallback if geolocation fails
  return {
    country: 'Unknown',
    city: 'Unknown', 
    timezone: 'UTC'
  }
}

// Helper function: Calculate risk score based on various factors
function calculateRiskScore(ip: string, deviceInfo: any): number {
  let score = 0
  
  // Base score
  score += 5
  
  // Local/development IPs are low risk (IPv4 and IPv6)
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || 
      ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.') ||
      ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    score += 0 // Local IPs are safe
  } else {
    score += 10 // External IP adds some risk
  }
  
  // Known platforms are lower risk (case-insensitive check)
  const platform = deviceInfo.platform?.toLowerCase() || 'unknown'
  if (['windows', 'macos', 'linux'].includes(platform)) {
    score += 0
  } else {
    score += 15 // Unknown platform adds risk
  }
  
  // Desktop applications are typically lower risk than web browsers
  if (deviceInfo.device_type === 'desktop') {
    score += 0
  } else {
    score += 10
  }
  
  // Cap at reasonable range (0-100)
  return Math.min(Math.max(score, 0), 100)
}

// Helper function: Get user licenses with full configuration
async function getUserLicenses(supabase: any, userId: string) {
  try {
    console.log('🔍 getUserLicenses called for user:', userId)

    // Use service role to fetch licenses
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const serviceSupabase = createClient(supabaseUrl, serviceKey)

    // Method 0: Try license_keys table with assigned_to field (PRIMARY METHOD)
    console.log('📊 Method 0: Querying license_keys table with assigned_to:', userId)
    const { data: licenseKeys, error: licenseKeysError } = await serviceSupabase
      .from('license_keys')
      .select('*')
      .eq('assigned_to', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (licenseKeysError) {
      console.error('❌ Error fetching license_keys:', licenseKeysError)
    } else {
      console.log('✅ license_keys query returned:', licenseKeys?.length || 0, 'licenses')
    }

    // Method 1: Try direct user_id lookup in licenses table (ALTERNATIVE TABLE)
    console.log('📊 Method 1: Querying licenses table with user_id:', userId)
    const { data: directLicenses, error: directError } = await serviceSupabase
      .from('licenses')
      .select(`
        id,
        key_code,
        license_category,
        license_type,
        status,
        main_app_version,
        main_app_permissions,
        usage_limits,
        license_config,
        expires_at,
        allows_local_cluster,
        local_cluster_limits
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (directError) {
      console.error('❌ Error fetching direct licenses:', directError)
    } else {
      console.log('✅ Direct licenses query returned:', directLicenses?.length || 0, 'licenses')
    }

    // Method 2: Try user_license_assignments relationship table
    console.log('📊 Querying user_license_assignments table for user:', userId)
    const { data: assignedLicenses, error: assignmentError } = await serviceSupabase
      .from('user_license_assignments')
      .select(`
        id,
        assigned_at,
        is_primary,
        licenses (
          id,
          key_code,
          license_category,
          license_type,
          status,
          main_app_version,
          main_app_permissions,
          usage_limits,
          license_config,
          expires_at,
          allows_local_cluster,
          local_cluster_limits
        )
      `)
      .eq('user_id', userId)
      .is('revoked_at', null)
      .order('assigned_at', { ascending: false})

    if (assignmentError) {
      console.error('❌ Error fetching assigned licenses:', assignmentError)
    } else {
      console.log('✅ Assigned licenses query returned:', assignedLicenses?.length || 0, 'assignments')
    }

    // Combine licenses from ALL three sources
    const allLicenses = [
      ...(licenseKeys || []),  // Method 0: license_keys table
      ...(directLicenses || []),  // Method 1: licenses table
      ...(assignedLicenses || []).map(assignment => assignment.licenses).filter(Boolean)  // Method 2: user_license_assignments
    ]

    // Remove duplicates based on license id
    const uniqueLicenses = allLicenses.filter((license, index, self) =>
      index === self.findIndex(l => l.id === license.id)
    )

    console.log('🎫 Total unique licenses found:', uniqueLicenses.length)
    console.log('   - From license_keys:', licenseKeys?.length || 0)
    console.log('   - From licenses table:', directLicenses?.length || 0)
    console.log('   - From user_license_assignments:', assignedLicenses?.length || 0)

    if (uniqueLicenses.length === 0) {
      console.log('⚠️ No licenses found for user:', userId, '(checked both direct and assignment tables)')
      return []
    }

    console.log('🎫 Processing', uniqueLicenses.length, 'license(s):',
      uniqueLicenses.map(l => l.key_code || l.id).join(', ')
    )

    // Build complete license structure with feature_configurations
    return uniqueLicenses.map(license => {
      // Get base feature configurations from license type
      const licenseTypeConfig = getLicenseTypeConfig(license.license_type)

      // IMPORTANT: Make a deep copy to avoid mutating the shared config object
      const feature_configurations = JSON.parse(JSON.stringify(
        licenseTypeConfig?.feature_configurations || {}
      ))

      // Add local_cluster configuration to feature_configurations
      // Check if local_cluster_limits exists (from license_keys table or licenses table)
      const hasLocalClusterLimits = license.local_cluster_limits &&
        typeof license.local_cluster_limits === 'object' &&
        Object.keys(license.local_cluster_limits).length > 0

      const local_cluster_config = hasLocalClusterLimits ? {
        enabled: license.allows_local_cluster !== false,  // Default to true if field doesn't exist
        max_storage_gb: license.local_cluster_limits.max_storage_gb ?? 10,
        max_monthly_queries: license.local_cluster_limits.max_monthly_queries ?? 100000,
        max_users: license.local_cluster_limits.max_users ?? 1,
        lifecycle_tiers_enabled: license.local_cluster_limits.lifecycle_tiers_enabled ?? false,
        offline_grace_days: license.local_cluster_limits.offline_grace_days ?? 7
      } : {
        enabled: false
      }

      feature_configurations.local_cluster = local_cluster_config

      console.log('🔍 License', license.key_code, 'local_cluster_limits source:',
        hasLocalClusterLimits ? 'FOUND' : 'NOT FOUND',
        hasLocalClusterLimits ? JSON.stringify(license.local_cluster_limits) : 'N/A'
      )

      console.log('🎫 License', license.key_code, '- local_cluster:',
        local_cluster_config.enabled ? 'ENABLED' : 'DISABLED',
        local_cluster_config.enabled ?
          `(${local_cluster_config.max_storage_gb}GB, ${local_cluster_config.max_monthly_queries === -1 ? 'Unlimited' : local_cluster_config.max_monthly_queries} queries, ${local_cluster_config.max_users === -1 ? 'Unlimited' : local_cluster_config.max_users} users)` :
          ''
      )

      // Build license_config with nested structure as Centcom expects
      // Start with existing license_config (if any), then override with our constructed values
      const existingConfig = license.license_config || {}
      const license_config = {
        ...existingConfig,  // Spread existing config first
        main_app_version: license.main_app_version || existingConfig.main_app_version || '1.0.0',
        main_app_permissions: license.main_app_permissions || existingConfig.main_app_permissions || {},
        feature_configurations  // Our constructed feature_configurations takes precedence
      }

      console.log('📦 Built license_config for', license.key_code, '- has local_cluster:',
        !!license_config.feature_configurations?.local_cluster?.enabled
      )

      return {
        id: license.id,
        key_code: license.key_code || 'UNKNOWN',
        license_category: license.license_category || 'main_application',
        license_type: license.license_type || 'trial',
        status: license.status || 'active',
        license_config,
        expires_at: license.expires_at
      }
    })

  } catch (error) {
    console.error('❌ Error in getUserLicenses:', error)
    return []
  }
}


