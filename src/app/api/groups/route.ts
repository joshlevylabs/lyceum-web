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

    // Get groups where user is a member - using manual join instead of relationship syntax
    const { data: memberships, error: membershipsError } = await dbOperations.supabaseAdmin
      .from('group_members')
      .select('group_id, role, joined_at, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (membershipsError) {
      console.error('Error fetching group memberships:', membershipsError)
      return NextResponse.json(
        { error: 'Failed to fetch group memberships', details: membershipsError.message },
        { status: 500 }
      )
    }

    // If no memberships, return empty array
    if (!memberships || memberships.length === 0) {
      return NextResponse.json({
        success: true,
        groups: [],
        total: 0,
        user_id: user.id
      })
    }

    // Fetch the actual group details separately
    const groupIds = memberships.map(m => m.group_id)
    let groupQuery = dbOperations.supabaseAdmin
      .from('groups')
      .select('id, key, name, description, slug, owner_id, current_member_count, max_members, is_active, created_at, updated_at')
      .in('id', groupIds)

    if (!includeInactive) {
      groupQuery = groupQuery.eq('is_active', true)
    }

    const { data: groupsData, error: groupsError } = await groupQuery

    if (groupsError) {
      console.error('Error fetching groups:', groupsError)
      return NextResponse.json(
        { error: 'Failed to fetch groups', details: groupsError.message },
        { status: 500 }
      )
    }

    // Merge membership data with group data
    const groups = (groupsData || []).map(group => {
      const membership = memberships.find(m => m.group_id === group.id)
      return {
        id: group.id,
        key: group.key,
        name: group.name,
        description: group.description,
        slug: group.slug,
        owner_id: group.owner_id,
        is_owner: group.owner_id === user.id,
        user_role: membership?.role || 'viewer',
        member_count: group.current_member_count,
        max_members: group.max_members,
        joined_at: membership?.joined_at,
        created_at: group.created_at,
        updated_at: group.updated_at
      }
    })

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
