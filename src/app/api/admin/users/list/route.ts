import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/admin/users/list - Starting request...')
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')

    let query = supabase
      .from('user_profiles')
      .select('id, email, username, full_name, company, role, created_at')

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,company.ilike.%${search}%`)
    }

    if (limit > 0) {
      query = query.range(offset, offset + limit - 1)
    }

    query = query.order('created_at', { ascending: false })

    const { data: users, error } = await query

    if (error) {
      console.error('Database error in users list:', error)
      return NextResponse.json({
        users: [],
        error: `Database error: ${error.message}`,
        details: error
      }, { status: 500 })
    }

    // Enrich users with license count and activity status
    const enrichedUsers = await Promise.all((users || []).map(async (user) => {
      // Get user's license count
      const { data: licenses, error: licenseError } = await supabase
        .from('license_keys')
        .select('id, key_code, license_type, status')
        .eq('assigned_to', user.id)

      console.log(`Checking licenses for user ${user.id} (${user.email}):`, licenses?.length || 0, 'licenses found')

      // Get user auth status and last login from auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id)

      const licenseCount = licenseError ? 0 : (licenses?.length || 0)
      const isActive = authUser?.user && !authError ? true : false
      
      // Get last login time
      const lastSignInAt = authUser?.user?.last_sign_in_at
      const lastLogin = lastSignInAt ? new Date(lastSignInAt).toLocaleDateString() : 'Never'
      
      // Determine onboarding status (simplified for now)
      const onboardingStatus = licenseCount > 0 ? 'in_progress' : 'pending'

      console.log(`User ${user.email}: licenses=${licenseCount}, active=${isActive}, lastLogin=${lastLogin}`)

      return {
        ...user,
        is_active: isActive,
        license_count: licenseCount,
        last_login: lastLogin,
        onboarding_status: onboardingStatus,
        // Ensure username is available, fallback to email local part if needed
        username: user.username || user.email?.split('@')[0] || '',
        licenses: licenses || [] // Include full license data for debugging
      }
    }))

    console.log(`Successfully fetched ${enrichedUsers?.length || 0} users with license data`)
    
    return NextResponse.json({
      users: enrichedUsers || [],
      total: enrichedUsers?.length || 0,
      message: `Found ${enrichedUsers?.length || 0} users`
    })

  } catch (error) {
    console.error('Unexpected error in users list API:', error)
    return NextResponse.json({
      users: [],
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}