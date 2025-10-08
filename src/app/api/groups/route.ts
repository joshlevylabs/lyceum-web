import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import * as dbOperations from '@/lib/supabase-direct'

/**
 * Create a new group
 * POST /api/groups
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const body = await request.json()
    const { name, description, max_members = 50 } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      )
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50) + '-' + Date.now().toString(36)

    // Check if user has reached group limit (max 10 owned groups)
    const { count: ownedGroupsCount } = await dbOperations.supabaseAdmin
      .from('groups')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('is_active', true)

    if ((ownedGroupsCount || 0) >= 10) {
      return NextResponse.json(
        { error: 'Maximum number of groups reached (10)' },
        { status: 400 }
      )
    }

    // Create the group
    const { data: group, error: groupError } = await dbOperations.supabaseAdmin
      .from('groups')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        slug,
        owner_id: user.id,
        max_members,
        current_member_count: 1
      })
      .select()
      .single()

    if (groupError) {
      console.error('Error creating group:', groupError)
      return NextResponse.json(
        { error: 'Failed to create group', details: groupError.message },
        { status: 500 }
      )
    }

    // Add creator as owner member
    const { error: memberError } = await dbOperations.supabaseAdmin
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: 'owner',
        invited_by: user.id,
        joined_at: new Date().toISOString()
      })

    if (memberError) {
      console.error('Error adding owner as member:', memberError)
      // Don't fail the group creation, but log it
    }

    // Log activity
    await dbOperations.supabaseAdmin
      .from('group_activity_log')
      .insert({
        group_id: group.id,
        user_id: user.id,
        action: 'group_created',
        details: { group_name: group.name }
      })

    return NextResponse.json({
      success: true,
      group: {
        id: group.id,
        key: group.key,
        name: group.name,
        description: group.description,
        slug: group.slug,
        owner_id: group.owner_id,
        max_members: group.max_members,
        current_member_count: group.current_member_count,
        created_at: group.created_at
      }
    })

  } catch (error: any) {
    console.error('Error in POST /api/groups:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Get user's groups
 * GET /api/groups
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const url = new URL(request.url)
    const includeInactive = url.searchParams.get('include_inactive') === 'true'

    // Get groups where user is a member
    let query = dbOperations.supabaseAdmin
      .from('group_members')
      .select(`
        group_id,
        role,
        joined_at,
        groups (
          id,
          key,
          name,
          description,
          slug,
          owner_id,
          current_member_count,
          max_members,
          is_active,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    const { data: memberships, error: membershipsError } = await query

    if (membershipsError) {
      console.error('Error fetching groups:', membershipsError)
      return NextResponse.json(
        { error: 'Failed to fetch groups', details: membershipsError.message },
        { status: 500 }
      )
    }

    // Transform the data
    const groups = (memberships || [])
      .filter(m => m.groups && (includeInactive || m.groups.is_active))
      .map(m => ({
        id: m.groups.id,
        key: m.groups.key,
        name: m.groups.name,
        description: m.groups.description,
        slug: m.groups.slug,
        owner_id: m.groups.owner_id,
        is_owner: m.groups.owner_id === user.id,
        user_role: m.role,
        member_count: m.groups.current_member_count,
        max_members: m.groups.max_members,
        joined_at: m.joined_at,
        created_at: m.groups.created_at,
        updated_at: m.groups.updated_at
      }))

    return NextResponse.json({
      success: true,
      groups,
      total: groups.length,
      user_id: user.id
    })

  } catch (error: any) {
    console.error('Error in GET /api/groups:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
