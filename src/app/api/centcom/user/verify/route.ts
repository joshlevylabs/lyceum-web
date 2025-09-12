import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface UserVerificationResponse {
  success: boolean
  exists: boolean
  user?: {
    id: string
    email: string
    license_type: string
    status: string
    roles: string[]
  }
  error?: string
}

export async function GET(req: NextRequest) {
  // CORS headers for Centcom and testing
  const origin = req.headers.get('origin')
  const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'null']
  const corsOrigin = allowedOrigins.includes(origin || 'null') ? (origin || '*') : 'http://localhost:3003'
  
  const headers = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({
        success: false,
        exists: false,
        error: 'Email parameter is required'
      }, { status: 400, headers })
    }

    console.log('🔍 Verifying user exists in Lyceum:', email)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Check if user exists in Supabase auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      throw new Error(`Auth lookup failed: ${authError.message}`)
    }

    const authUser = authUsers.users.find(u => u.email === email)
    
    if (!authUser) {
      return NextResponse.json({
        success: true,
        exists: false
      }, { headers })
    }

    // Get user profile and license info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        role,
        is_active
      `)
      .eq('id', authUser.id)
      .single()

    // Get user licenses
    const { data: licenses } = await supabase
      .from('licenses')
      .select('license_type, status')
      .or(`user_id.eq.${authUser.id}`)
      .limit(1)

    const activeLicense = licenses?.find(l => l.status === 'active') || licenses?.[0]

    const userInfo = {
      id: authUser.id,
      email: authUser.email!,
      license_type: activeLicense?.license_type || 'trial',
      status: profile?.is_active ? 'active' : 'inactive',
      roles: profile?.role ? [profile.role] : ['user']
    }

    console.log('✅ User verification result:', { email, exists: true })

    return NextResponse.json({
      success: true,
      exists: true,
      user: userInfo
    }, { headers })

  } catch (error: any) {
    console.error('❌ User verification error:', error)
    return NextResponse.json({
      success: false,
      exists: false,
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
