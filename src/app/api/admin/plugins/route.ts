import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-direct'

// GET /api/admin/plugins - Get all plugins (including unpublished)
export async function GET(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const is_published = searchParams.get('is_published')

    // Build query for all plugins (including unpublished)
    let query = supabaseAdmin
      .from('plugins')
      .select('*')
      .order('created_at', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (is_published === 'true') {
      query = query.eq('is_published', true)
    } else if (is_published === 'false') {
      query = query.eq('is_published', false)
    }

    const { data: plugins, error } = await query

    if (error) {
      console.error('Error fetching plugins:', error)
      return NextResponse.json({ error: 'Failed to fetch plugins' }, { status: 500 })
    }

    // Get license counts for each plugin
    const pluginIds = plugins?.map(p => p.id) || []
    const { data: licenseCounts } = await supabaseAdmin
      .from('plugin_licenses')
      .select('plugin_id')
      .in('plugin_id', pluginIds)
      .eq('status', 'active')

    // Count licenses per plugin
    const licenseCountMap: Record<string, number> = {}
    licenseCounts?.forEach(l => {
      licenseCountMap[l.plugin_id] = (licenseCountMap[l.plugin_id] || 0) + 1
    })

    // Enhance plugins with license counts
    const enhancedPlugins = plugins?.map(plugin => ({
      ...plugin,
      active_license_count: licenseCountMap[plugin.id] || 0
    }))

    return NextResponse.json({
      success: true,
      plugins: enhancedPlugins || []
    })

  } catch (error: any) {
    console.error('Admin plugins API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch plugins', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/admin/plugins - Create a new plugin
export async function POST(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      slug,
      display_name,
      short_description,
      full_description,
      category,
      principle,
      tags,
      current_version,
      base_price,
      currency,
      pricing_model,
      monthly_price,
      annual_price,
      has_free_trial,
      trial_duration_days,
      trial_requires_payment,
      features,
      is_published,
      is_featured,
      publisher_name,
      publisher_email
    } = body

    // Validate required fields
    if (!name || !slug || !display_name || !current_version) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug, display_name, current_version' },
        { status: 400 }
      )
    }

    // Create plugin
    const { data: plugin, error } = await supabaseAdmin
      .from('plugins')
      .insert({
        name,
        slug,
        display_name,
        short_description: short_description || '',
        full_description: full_description || '',
        category: category || 'other',
        principle: principle || null,
        tags: tags || [],
        current_version,
        base_price: base_price || 0,
        currency: currency || 'USD',
        pricing_model: pricing_model || 'subscription_monthly',
        monthly_price: monthly_price || null,
        annual_price: annual_price || null,
        has_free_trial: has_free_trial ?? true,
        trial_duration_days: trial_duration_days || 30,
        trial_requires_payment: trial_requires_payment ?? true,
        features: features || [],
        is_published: is_published ?? false,
        is_featured: is_featured ?? false,
        is_active: true,
        publisher_name: publisher_name || 'Lyceum Audio Labs',
        publisher_email: publisher_email || 'support@lyceum.com'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating plugin:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A plugin with this name or slug already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: 'Failed to create plugin' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      plugin
    })

  } catch (error: any) {
    console.error('Admin plugins create error:', error)
    return NextResponse.json(
      { error: 'Failed to create plugin', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/admin/plugins - Update an existing plugin
export async function PUT(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Plugin ID is required' }, { status: 400 })
    }

    // Remove read-only fields
    delete updateData.created_at
    delete updateData.search_vector
    delete updateData.total_downloads
    delete updateData.active_installations
    delete updateData.average_rating
    delete updateData.total_reviews

    // Update plugin
    const { data: plugin, error } = await supabaseAdmin
      .from('plugins')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating plugin:', error)
      return NextResponse.json({
        error: 'Failed to update plugin',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      plugin
    })

  } catch (error: any) {
    console.error('Admin plugins update error:', error)
    return NextResponse.json(
      { error: 'Failed to update plugin', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/plugins - Delete a plugin
export async function DELETE(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Plugin ID is required' }, { status: 400 })
    }

    // Check if plugin has active licenses
    const { data: licenses } = await supabaseAdmin
      .from('plugin_licenses')
      .select('id')
      .eq('plugin_id', id)
      .eq('status', 'active')
      .limit(1)

    if (licenses && licenses.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete plugin with active licenses. Deactivate licenses first.' },
        { status: 400 }
      )
    }

    // Delete plugin
    const { error } = await supabaseAdmin
      .from('plugins')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting plugin:', error)
      return NextResponse.json({ error: 'Failed to delete plugin' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Plugin deleted successfully'
    })

  } catch (error: any) {
    console.error('Admin plugins delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete plugin', details: error.message },
      { status: 500 }
    )
  }
}
