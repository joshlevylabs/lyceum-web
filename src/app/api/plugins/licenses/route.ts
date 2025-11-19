import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-direct'

export async function GET(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's plugin licenses from license_keys table
    // Plugin licenses have license_type of 'klippel_qc' or 'apx500'
    const { data: licenses, error } = await supabaseAdmin
      .from('license_keys')
      .select('*')
      .eq('assigned_to', user.id)
      .in('license_type', ['klippel_qc', 'apx500'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching plugin licenses:', error)
      return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 })
    }

    // Get plugin details from plugins table
    const { data: plugins, error: pluginsError } = await supabaseAdmin
      .from('plugins')
      .select('id, name, slug, current_version, icon_url, category')
      .in('slug', ['klippel-qc', 'apx500'])

    if (pluginsError) {
      console.error('Error fetching plugin details:', pluginsError)
    }

    // Map plugin type to slug
    const pluginTypeToSlug: Record<string, string> = {
      'klippel_qc': 'klippel-qc',
      'apx500': 'apx500'
    }

    // Create a map of slug to plugin details
    const pluginMap = new Map(plugins?.map(p => [p.slug, p]) || [])

    // Enhance licenses with computed fields and plugin details
    const enhancedLicenses = licenses?.map(license => {
      const isExpired = license.expires_at && new Date(license.expires_at) < new Date()
      const daysRemaining = license.expires_at
        ? Math.ceil((new Date(license.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null

      // Determine if it's a trial license (has expiration) or paid (no expiration)
      const licenseCategory = license.expires_at ? 'trial' : 'paid'

      // Get plugin details
      const pluginSlug = pluginTypeToSlug[license.license_type] || license.license_type
      const pluginDetails = pluginMap.get(pluginSlug)

      return {
        id: license.id,
        license_key: license.key_code,
        license_type: licenseCategory,
        status: license.status,
        created_at: license.created_at,
        activated_at: license.assigned_at,
        expires_at: license.expires_at,
        features: license.features,
        plugin: pluginDetails ? {
          id: pluginDetails.id,
          name: pluginDetails.name,
          slug: pluginDetails.slug,
          current_version: pluginDetails.current_version,
          icon_url: pluginDetails.icon_url,
          category: pluginDetails.category
        } : null,
        is_expired: isExpired,
        days_remaining: daysRemaining,
        is_active: license.status === 'active' && !isExpired
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
