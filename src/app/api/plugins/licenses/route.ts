import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-direct'

export async function GET(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's plugin licenses with plugin details
    const { data: licenses, error } = await supabaseAdmin
      .from('plugin_licenses')
      .select(`
        *,
        plugin:plugins (
          id,
          name,
          slug,
          version,
          icon_url,
          category
        )
      `)
      .eq('user_id', user.id)
      .order('activated_at', { ascending: false })

    if (error) {
      console.error('Error fetching plugin licenses:', error)
      return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 })
    }

    // Enhance licenses with computed fields
    const enhancedLicenses = licenses?.map(license => {
      const isExpired = license.expires_at && new Date(license.expires_at) < new Date()
      const daysRemaining = license.expires_at
        ? Math.ceil((new Date(license.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null

      return {
        ...license,
        is_expired: isExpired,
        days_remaining: daysRemaining,
        is_active: license.status === 'active' || (license.status === 'trial' && !isExpired)
      }
    })

    return NextResponse.json({
      success: true,
      licenses: enhancedLicenses || []
    })

  } catch (error: any) {
    console.error('Plugin licenses API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch plugin licenses', details: error.message },
      { status: 500 }
    )
  }
}
