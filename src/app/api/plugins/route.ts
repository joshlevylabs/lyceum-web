import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-direct'

export async function GET(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const slug = searchParams.get('slug')

    // Build query for published plugins
    let query = supabaseAdmin
      .from('plugins')
      .select('*')
      .eq('is_published', true)

    // If slug is provided, filter by slug (for single plugin lookup)
    if (slug) {
      query = query.eq('slug', slug)
    } else {
      // Only order by downloads when not looking up a specific plugin
      query = query.order('total_downloads', { ascending: false })
    }

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,display_name.ilike.%${search}%,short_description.ilike.%${search}%`)
    }

    const { data: plugins, error } = await query

    if (error) {
      console.error('Error fetching plugins:', error)
      return NextResponse.json({ error: 'Failed to fetch plugins' }, { status: 500 })
    }

    // Get user's active licenses to mark which plugins they own
    const { data: userLicenses } = await supabaseAdmin
      .from('plugin_licenses')
      .select('plugin_id, status, expires_at')
      .eq('user_id', user.id)
      .in('status', ['active', 'trial'])

    // Create a map of owned plugin IDs
    const ownedPluginIds = new Set(
      userLicenses?.filter(license => {
        // Check if license is still valid
        if (license.status === 'active') return true
        if (license.status === 'trial' && license.expires_at) {
          return new Date(license.expires_at) > new Date()
        }
        return false
      }).map(l => l.plugin_id)
    )

    // Enhance plugins with ownership status
    const enhancedPlugins = plugins?.map(plugin => ({
      ...plugin,
      owned: ownedPluginIds.has(plugin.id)
    }))

    return NextResponse.json({
      success: true,
      plugins: enhancedPlugins || []
    })

  } catch (error: any) {
    console.error('Plugins API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch plugins', details: error.message },
      { status: 500 }
    )
  }
}
