import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

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
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

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
      }
    }

    console.log('✅ Centcom authentication successful for:', email)
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
    // Query user profile and license information
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        username,
        full_name,
        company,
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

    // Get user licenses - prioritize CentCom enterprise license
    const { data: licenses } = await supabase
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

    return {
      username: profile.username,
      roles: profile.role ? [profile.role] : ['user'],
      license_type: detectedLicenseType,
      security_clearance: 'internal', // Default for now
      organization: profile.company
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
