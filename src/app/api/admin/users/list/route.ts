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

    // Fetch detailed license information for each user
    const usersWithLicenses = await Promise.all(
      (users || []).map(async (user) => {
        // Get all licenses for this user with detailed info
        const { data: licenses, error: licensesError } = await supabase
          .from('license_keys')
          .select('id, key_code, license_type, status, category, expires_at')
          .eq('user_id', user.id)

        const userLicenses = licensesError ? [] : (licenses || [])

        // Count licenses by category
        const centcomLicenses = userLicenses.filter(l =>
          l.category?.toLowerCase().includes('centcom') ||
          l.category?.toLowerCase().includes('app')
        )
        const pluginLicenses = userLicenses.filter(l =>
          l.category?.toLowerCase().includes('plugin')
        )

        // Count by status
        const activeLicenses = userLicenses.filter(l => l.status === 'active')
        const trialLicenses = userLicenses.filter(l => l.status === 'trial')
        const expiredLicenses = userLicenses.filter(l => l.status === 'expired')

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
          license_count: userLicenses.length,
          licenses: userLicenses,
          license_summary: {
            total: userLicenses.length,
            centcom: centcomLicenses.length,
            plugin: pluginLicenses.length,
            active: activeLicenses.length,
            trial: trialLicenses.length,
            expired: expiredLicenses.length,
            has_licenses: userLicenses.length > 0,
            has_centcom: centcomLicenses.length > 0,
            has_plugin: pluginLicenses.length > 0
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      users: usersWithLicenses,
      count: usersWithLicenses.length
    })

  } catch (error: any) {
    console.error('Users list error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}