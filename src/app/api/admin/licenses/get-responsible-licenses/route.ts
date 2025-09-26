import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Get all licenses for which a user is responsible for payment
 * GET /api/admin/licenses/get-responsible-licenses?user_id=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'user_id parameter is required' 
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get licenses from both tables where user is responsible
    const [licensesResult, licenseKeysResult] = await Promise.all([
      supabase
        .from('licenses')
        .select(`
          id,
          key_id,
          license_type,
          status,
          user_id,
          responsible_user_id,
          expires_at,
          created_at,
          max_users,
          max_projects,
          max_storage_gb,
          features
        `)
        .eq('responsible_user_id', user_id),
      
      supabase
        .from('license_keys')
        .select(`
          id,
          key_code,
          license_type,
          status,
          assigned_to,
          responsible_user_id,
          expires_at,
          created_at,
          max_users,
          max_projects,
          max_storage_gb,
          features
        `)
        .eq('responsible_user_id', user_id)
    ])

    if (licensesResult.error) {
      console.error('Error fetching licenses:', licensesResult.error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch licenses'
      }, { status: 500 })
    }

    if (licenseKeysResult.error) {
      console.error('Error fetching license keys:', licenseKeysResult.error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch license keys'
      }, { status: 500 })
    }

    // Get user profile information
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('id', user_id)
      .single()

    // Combine results and add source table information
    const allLicenses = [
      ...licensesResult.data.map(license => ({
        ...license,
        source_table: 'licenses',
        key: license.key_id
      })),
      ...licenseKeysResult.data.map(license => ({
        ...license,
        source_table: 'license_keys',
        key: license.key_code,
        key_id: license.key_code, // Normalize field name
        user_id: license.assigned_to // Normalize field name
      }))
    ]

    // Calculate billing summary
    const licenseCounts = allLicenses.reduce((counts, license) => {
      if (license.status === 'active') {
        let billingType = license.license_type
        if (billingType === 'trial' || billingType === 'standard') {
          billingType = 'basic'
        }
        counts[billingType] = (counts[billingType] || 0) + 1
      }
      return counts
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      user_profile: userProfile,
      licenses: allLicenses,
      license_counts: licenseCounts,
      total_licenses: allLicenses.length,
      active_licenses: allLicenses.filter(l => l.status === 'active').length,
      summary: {
        message: `User is responsible for ${allLicenses.filter(l => l.status === 'active').length} active licenses`,
        billing_breakdown: licenseCounts
      }
    })

  } catch (e: any) {
    console.error('Error getting responsible licenses:', e)
    return NextResponse.json({
      success: false,
      error: e?.message || 'Internal error'
    }, { status: 500 })
  }
}
