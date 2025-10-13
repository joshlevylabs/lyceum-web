import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import * as dbOperations from '@/lib/supabase-direct'

/**
 * Get group details
 * GET /api/groups/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { id: groupId } = await params

    // Check if user is a member of this group
    const { data: membership, error: membershipError } = await dbOperations.supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Group not found or access denied' },
        { status: 404 }
      )
    }

    // Get group details
    const { data: group, error: groupError } = await dbOperations.supabaseAdmin
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Get member count and role distribution
    const { data: members, error: membersError } = await dbOperations.supabaseAdmin
      .from('group_members')
      .select('role, user_id')
      .eq('group_id', groupId)
      .eq('is_active', true)

    const roleDistribution = {
      owner: 0,
      admin: 0,
      editor: 0,
      viewer: 0
    }

    members?.forEach(m => {
      if (m.role in roleDistribution) {
        roleDistribution[m.role as keyof typeof roleDistribution]++
      }
    })

    // Get resource count
    const { count: resourceCount } = await dbOperations.supabaseAdmin
      .from('group_resource_access')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)

    return NextResponse.json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        slug: group.slug,
        owner_id: group.owner_id,
        is_owner: group.owner_id === user.id,
        user_role: membership.role,
        member_count: group.current_member_count,
        max_members: group.max_members,
        role_distribution: roleDistribution,
        resource_count: resourceCount || 0,
        settings: group.settings,
        centcom_sync_enabled: group.centcom_sync_enabled,
        is_active: group.is_active,
        created_at: group.created_at,
        updated_at: group.updated_at
      }
    })

  } catch (error: any) {
    console.error('Error in GET /api/groups/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Update group
 * PATCH /api/groups/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { id: groupId } = await params
    const body = await request.json()
    const { name, description, max_members, settings } = body

    // Check if user has admin permissions
    const { data: membership } = await dbOperations.supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Permission denied. Admin role required.' },
        { status: 403 }
      )
    }

    // Build update object
    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (max_members !== undefined && membership.role === 'owner') {
      updates.max_members = Math.max(1, parseInt(max_members))
    }
    if (settings !== undefined && membership.role === 'owner') {
      updates.settings = settings
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update the group
    const { data: updatedGroup, error: updateError } = await dbOperations.supabaseAdmin
      .from('groups')
      .update(updates)
      .eq('id', groupId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating group:', updateError)
      return NextResponse.json(
        { error: 'Failed to update group', details: updateError.message },
        { status: 500 }
      )
    }

    // Log activity
    await dbOperations.supabaseAdmin
      .from('group_activity_log')
      .insert({
        group_id: groupId,
        user_id: user.id,
        action: 'group_updated',
        details: { changes: Object.keys(updates) }
      })

    return NextResponse.json({
      success: true,
      group: updatedGroup
    })

  } catch (error: any) {
    console.error('Error in PATCH /api/groups/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Delete group
 * DELETE /api/groups/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { id: groupId } = await params

    // Check if user is the owner
    const { data: group } = await dbOperations.supabaseAdmin
      .from('groups')
      .select('owner_id, name')
      .eq('id', groupId)
      .single()

    if (!group || group.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Permission denied. Only the group owner can delete the group.' },
        { status: 403 }
      )
    }

    // Soft delete - mark as inactive
    const { error: deleteError } = await dbOperations.supabaseAdmin
      .from('groups')
      .update({ is_active: false })
      .eq('id', groupId)

    if (deleteError) {
      console.error('Error deleting group:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete group', details: deleteError.message },
        { status: 500 }
      )
    }

    // Log activity
    await dbOperations.supabaseAdmin
      .from('group_activity_log')
      .insert({
        group_id: groupId,
        user_id: user.id,
        action: 'group_deleted',
        details: { group_name: group.name }
      })

    return NextResponse.json({
      success: true,
      message: 'Group deleted successfully'
    })

  } catch (error: any) {
    console.error('Error in DELETE /api/groups/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


