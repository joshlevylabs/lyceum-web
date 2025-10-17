import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Get list of all users for admin operations
 * GET /api/admin/users/list
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get all user profiles with user_key (without license count for now to avoid join errors)
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, username, role, is_active, user_key, created_at, company')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch users'
      }, { status: 500 })
    }

    // Fetch license counts for each user separately
    const usersWithLicenseCount = await Promise.all(
      (users || []).map(async (user) => {
        const { count, error: countError } = await supabase
          .from('license_keys')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        return {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          username: user.username,
          role: user.role,
          is_active: user.is_active,
          user_key: user.user_key,
          created_at: user.created_at,
          company: user.company,
          license_count: countError ? 0 : (count || 0)
        }
      })
    )

    return NextResponse.json({
      success: true,
      users: usersWithLicenseCount,
      count: usersWithLicenseCount.length
    })

  } catch (error: any) {
    console.error('Users list error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}