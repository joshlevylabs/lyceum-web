import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback_key'
    
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Get all authentication users (this shows who has passwords)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      throw new Error(`Auth query failed: ${authError.message}`)
    }

    // Get user profiles for additional info
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('*')

    const userSummary = authUsers.users.map(user => {
      const profile = profiles?.find(p => p.id === user.id)
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in: user.last_sign_in_at,
        email_confirmed: !!user.email_confirmed_at,
        has_password: true, // All auth.users have passwords
        invited_by_admin: user.user_metadata?.invited_by_admin || false,
        role: user.user_metadata?.role || profile?.role || 'user',
        full_name: user.user_metadata?.full_name || profile?.full_name || 'Unknown',
        company: user.user_metadata?.company || profile?.company || '',
        profile_exists: !!profile
      }
    })

    return NextResponse.json({
      success: true,
      total_auth_users: authUsers.users.length,
      users: userSummary,
      summary: {
        confirmed_emails: userSummary.filter(u => u.email_confirmed).length,
        admin_invited: userSummary.filter(u => u.invited_by_admin).length,
        with_profiles: userSummary.filter(u => u.profile_exists).length,
        last_week_signins: userSummary.filter(u => 
          u.last_sign_in && new Date(u.last_sign_in) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length
      }
    })

  } catch (error: any) {
    console.error('Auth users debug error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}







