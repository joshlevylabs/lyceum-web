import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import * as dbOperations from '@/lib/supabase-direct'

/**
 * Update member role
 * PATCH /api/groups/[id]/members/[userId]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { id: groupId, userId: targetUserId } = await params
    const body = await request.json()
    const { role } = body

    // Check if requester has admin permissions
    const { data: requesterMembership } = await dbOperations.supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
      return NextResponse.json(
        { error: 'Permission denied. Admin role required.' },
        { status: 403 }
      )
    }

    // Validate new role
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, editor, or viewer.' },
        { status: 400 }
      )
    }

    // Check target member
    const { data: targetMember } = await dbOperations.supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .single()

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Prevent changing owner role (unless requester is owner)
    if (targetMember.role === 'owner' && requesterMembership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Cannot change owner role' },
        { status: 403 }
      )
    }

    // Prevent admins from promoting to owner
    if (role === 'owner' && requesterMembership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the owner can assign owner role' },
        { status: 403 }
      )
    }

    // Update role
    const { data: updated, error: updateError } = await dbOperations.supabaseAdmin
      .from('group_members')
      .update({ role })
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating member role:', updateError)
      return NextResponse.json(
        { error: 'Failed to update member role', details: updateError.message },
        { status: 500 }
      )
    }

    // Log activity
    await dbOperations.supabaseAdmin
      .from('group_activity_log')
      .insert({
        group_id: groupId,
        user_id: user.id,
        action: 'member_role_changed',
        details: { target_user_id: targetUserId, old_role: targetMember.role, new_role: role }
      })

    return NextResponse.json({
      success: true,
      member: updated
    })

  } catch (error: any) {
    console.error('Error in PATCH /api/groups/[id]/members/[userId]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Remove member from group
 * DELETE /api/groups/[id]/members/[userId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { id: groupId, userId: targetUserId } = await params

    // Check if requester has admin permissions (or removing themselves)
    const { data: requesterMembership } = await dbOperations.supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    const isRemovingSelf = targetUserId === user.id
    const hasAdminPermission = requesterMembership && ['owner', 'admin'].includes(requesterMembership.role)

    if (!isRemovingSelf && !hasAdminPermission) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Check target member
    const { data: targetMember } = await dbOperations.supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .single()

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Prevent removing owner (unless they're removing themselves)
    if (targetMember.role === 'owner' && !isRemovingSelf) {
      return NextResponse.json(
        { error: 'Cannot remove group owner' },
        { status: 403 }
      )
    }

    // Soft delete - mark as inactive
    const { error: removeError } = await dbOperations.supabaseAdmin
      .from('group_members')
      .update({ is_active: false })
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)

    if (removeError) {
      console.error('Error removing member:', removeError)
      return NextResponse.json(
        { error: 'Failed to remove member', details: removeError.message },
        { status: 500 }
      )
    }

    // Log activity
    await dbOperations.supabaseAdmin
      .from('group_activity_log')
      .insert({
        group_id: groupId,
        user_id: user.id,
        action: isRemovingSelf ? 'member_left' : 'member_removed',
        details: { removed_user_id: targetUserId, role: targetMember.role }
      })

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    })

  } catch (error: any) {
    console.error('Error in DELETE /api/groups/[id]/members/[userId]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


