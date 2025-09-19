import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force explicit values to avoid environment variable loading issues
const supabaseUrl = 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET /api/admin/users/[userId]/licenses - Get licenses for a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    console.log('GET /api/admin/users/[userId]/licenses - Starting request for user:', userId)

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'

    // Get user's licenses
    let licensesQuery = supabase
      .from('license_keys')
      .select(`
        id,
        key_code,
        license_type,
        status,
        expires_at,
        enabled_plugins,
        created_at,
        assigned_at
      `)
      .eq('assigned_to', userId)

    if (!includeInactive) {
      licensesQuery = licensesQuery.eq('status', 'active')
    }

    const { data: licenses, error: licensesError } = await licensesQuery.order('created_at', { ascending: false })

    if (licensesError) {
      console.error('Error fetching licenses for user:', userId, licensesError)
      return NextResponse.json({
        licenses: [],
        error: `Database error: ${licensesError.message}`,
        details: licensesError
      }, { status: 500 })
    }

    // Enrich licenses with computed fields
    const enrichedLicenses = licenses?.map(license => {
      const isExpired = license.expires_at && new Date(license.expires_at) < new Date()
      const daysUntilExpiry = license.expires_at 
        ? Math.ceil((new Date(license.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null

      return {
        ...license,
        is_expired: isExpired,
        days_until_expiry: daysUntilExpiry,
        enabled_plugins_count: Array.isArray(license.enabled_plugins) ? license.enabled_plugins.length : 0,
        formatted_expiry: license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'Never',
        status_display: license.status.charAt(0).toUpperCase() + license.status.slice(1)
      }
    })

    console.log(`Successfully fetched ${enrichedLicenses?.length || 0} licenses for user ${userId}`)

    return NextResponse.json({
      licenses: enrichedLicenses || [],
      total: enrichedLicenses?.length || 0,
      user_id: userId,
      message: `Found ${enrichedLicenses?.length || 0} licenses`
    })

  } catch (error) {
    console.error('Unexpected error fetching user licenses:', error)
    return NextResponse.json({
      licenses: [],
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}
