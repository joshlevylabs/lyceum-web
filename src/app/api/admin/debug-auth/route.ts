import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/admin/debug-auth
 * Debug endpoint to check authentication and role
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasAuthHeader: !!authHeader,
      authHeaderFormat: authHeader?.substring(0, 20) + '...',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...'
    }

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid authorization header',
        debug: debugInfo
      }, { status: 401 })
    }

    const token = authHeader.substring(7)
    debugInfo.tokenPrefix = token.substring(0, 20) + '...'

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    debugInfo.authError = authError?.message
    debugInfo.hasUser = !!user
    debugInfo.userId = user?.id
    debugInfo.userEmail = user?.email

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid token or user not found',
        debug: debugInfo
      }, { status: 401 })
    }

    // Check user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    debugInfo.profileError = profileError?.message
    debugInfo.hasProfile = !!userProfile
    debugInfo.profileRole = userProfile?.role
    debugInfo.profileData = userProfile

    // Check if admin
    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin'
    debugInfo.isAdmin = isAdmin
    debugInfo.hasAdminAccess = isAdmin

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: userProfile?.role,
        isAdmin
      },
      debug: debugInfo
    })

  } catch (error) {
    console.error('Debug auth error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
