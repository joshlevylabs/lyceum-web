import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import * as dbOperations from '@/lib/supabase-direct'

/**
 * Get group resources
 * GET /api/groups/[id]/resources
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { id: groupId } = await params
    const url = new URL(request.url)
    const resourceType = url.searchParams.get('type')

    // Check if user is a member
    const { data: membership } = await dbOperations.supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get resources
    let query = dbOperations.supabaseAdmin
      .from('group_resource_access')
      .select('*')
      .eq('group_id', groupId)
      .order('granted_at', { ascending: false })

    if (resourceType) {
      query = query.eq('resource_type', resourceType)
    }

    const { data: resources, error: resourcesError } = await query

    if (resourcesError) {
      console.error('Error fetching resources:', resourcesError)
      return NextResponse.json(
        { error: 'Failed to fetch resources' },
        { status: 500 }
      )
    }

    // Group by type for easier consumption
    const resourcesByType: Record<string, any[]> = {}
    resources?.forEach(r => {
      if (!resourcesByType[r.resource_type]) {
        resourcesByType[r.resource_type] = []
      }
      resourcesByType[r.resource_type].push(r)
    })

    return NextResponse.json({
      success: true,
      resources: resources || [],
      resources_by_type: resourcesByType,
      total: resources?.length || 0,
      user_role: membership.role
    })

  } catch (error: any) {
    console.error('Error in GET /api/groups/[id]/resources:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Share resource with group
 * POST /api/groups/[id]/resources
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { id: groupId } = await params
    const body = await request.json()
    const { resource_type, resource_id, access_level = 'viewer' } = body

    if (!resource_type || !resource_id) {
      return NextResponse.json(
        { error: 'resource_type and resource_id are required' },
        { status: 400 }
      )
    }

    // Check if user has editor permissions
    const { data: membership } = await dbOperations.supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!membership || !['owner', 'admin', 'editor'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Permission denied. Editor role required.' },
        { status: 403 }
      )
    }

    // Validate resource type
    const validTypes = ['cluster', 'session', 'project', 'sequence', 'asset', 'license', 'workspace']
    if (!validTypes.includes(resource_type)) {
      return NextResponse.json(
        { error: `Invalid resource type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if already shared
    const { data: existing } = await dbOperations.supabaseAdmin
      .from('group_resource_access')
      .select('id')
      .eq('group_id', groupId)
      .eq('resource_type', resource_type)
      .eq('resource_id', resource_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Resource is already shared with this group' },
        { status: 400 }
      )
    }

    // Share resource
    const { data: shared, error: shareError } = await dbOperations.supabaseAdmin
      .from('group_resource_access')
      .insert({
        group_id: groupId,
        resource_type,
        resource_id,
        access_level,
        granted_by: user.id
      })
      .select()
      .single()

    if (shareError) {
      console.error('Error sharing resource:', shareError)
      return NextResponse.json(
        { error: 'Failed to share resource', details: shareError.message },
        { status: 500 }
      )
    }

    // Log activity
    await dbOperations.supabaseAdmin
      .from('group_activity_log')
      .insert({
        group_id: groupId,
        user_id: user.id,
        action: 'resource_shared',
        details: { resource_type, resource_id, access_level }
      })

    return NextResponse.json({
      success: true,
      resource: shared
    })

  } catch (error: any) {
    console.error('Error in POST /api/groups/[id]/resources:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


