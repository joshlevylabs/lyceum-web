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
        // Try multiple possible foreign key column names
        // First try: user_id
        let { data: licenses, error: licensesError } = await supabase
          .from('license_keys')
          .select('*')
          .eq('user_id', user.id)

        // If error or no results, try: assigned_to
        if (licensesError || !licenses || licenses.length === 0) {
          const result = await supabase
            .from('license_keys')
            .select('*')
            .eq('assigned_to', user.id)

          if (!result.error && result.data && result.data.length > 0) {
            licenses = result.data
            licensesError = null
          }
        }

        // If still no results, try: assigned_to_user_id
        if (!licenses || licenses.length === 0) {
          const result = await supabase
            .from('license_keys')
            .select('*')
            .eq('assigned_to_user_id', user.id)

          if (!result.error && result.data && result.data.length > 0) {
            licenses = result.data
            licensesError = null
          }
        }

        const userLicenses = licensesError ? [] : (licenses || [])

        // Count licenses by category (check multiple possible field names)
        const centcomLicenses = userLicenses.filter(l => {
          const category = l.category || l.license_category || ''
          const licensetype = l.license_type || ''
          const keyCode = l.key_code || ''

          return category.toLowerCase().includes('centcom') ||
                 category.toLowerCase().includes('app') ||
                 licensetype.toLowerCase().includes('centcom') ||
                 keyCode.toLowerCase().includes('centcom')
        })

        const pluginLicenses = userLicenses.filter(l => {
          const category = l.category || l.license_category || ''
          const licensetype = l.license_type || ''
          const keyCode = l.key_code || ''

          return category.toLowerCase().includes('plugin') ||
                 licensetype.toLowerCase().includes('plugin') ||
                 keyCode.toLowerCase().includes('plugin')
        })

        // Count by status
        const activeLicenses = userLicenses.filter(l => l.status === 'active')
        const trialLicenses = userLicenses.filter(l => l.status === 'trial' || l.license_type === 'trial')
        const expiredLicenses = userLicenses.filter(l => l.status === 'expired')

        // Fetch download count for this user
        const { count: downloadsCount, error: downloadsError } = await supabase
          .from('application_downloads')
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
          license_count: userLicenses.length,
          licenses: userLicenses,
          downloads_count: downloadsCount || 0,
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