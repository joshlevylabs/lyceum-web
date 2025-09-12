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

    // Get user licenses
    const { data: licenses } = await supabase
      .from('licenses')
      .select('license_type, status')
      .or(`user_id.eq.${userId}`)
      .eq('status', 'active')
      .limit(1)

    const activeLicense = licenses?.[0]

    return {
      username: profile.username,
      roles: profile.role ? [profile.role] : ['user'],
      license_type: activeLicense?.license_type || 'trial',
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
    // Try to insert into auth_logs table if it exists
    await supabase
      .from('auth_logs')
      .insert({
        user_id: userId,
        event_type: 'centcom_login',
        app_id: appId || 'centcom',
        client_info: clientInfo,
        ip_address: '127.0.0.1', // You can get real IP from request
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.log('⚠️ Failed to log auth event (table may not exist):', error)
    // Don't fail authentication if logging fails
  }
}
