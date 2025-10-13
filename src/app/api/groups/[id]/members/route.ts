import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import * as dbOperations from '@/lib/supabase-direct'

/**
 * Get group members
 * GET /api/groups/[id]/members
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { id: groupId } = await params

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

    // Get all members with their user profiles
    const { data: members, error: membersError } = await dbOperations.supabaseAdmin
      .from('group_members')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        invited_at,
        is_active
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: false })

    if (membersError) {
      console.error('Error fetching members:', membersError)
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      )
    }

    // Get user profiles for all members
    const userIds = members?.map(m => m.user_id) || []
    const { data: profiles } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, username')
      .in('id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Enrich members with profile data
    const enrichedMembers = members?.map(m => {
      const profile = profileMap.get(m.user_id)
      return {
        id: m.id,
        user_id: m.user_id,
        email: profile?.email || 'Unknown',
        full_name: profile?.full_name || 'Unknown User',
        username: profile?.username || '',
        role: m.role,
        joined_at: m.joined_at,
        invited_at: m.invited_at,
        is_active: m.is_active
      }
    }) || []

    return NextResponse.json({
      success: true,
      members: enrichedMembers,
      total: enrichedMembers.length,
      user_role: membership.role
    })

  } catch (error: any) {
    console.error('Error in GET /api/groups/[id]/members:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Add member to group (direct add, not invitation)
 * POST /api/groups/[id]/members
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
    const { user_id, email, role = 'viewer' } = body

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

    // Validate role
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, editor, or viewer.' },
        { status: 400 }
      )
    }

    // Get user to add (either by user_id or email)
    let targetUserId = user_id
    if (!targetUserId && email) {
      const { data: profile } = await dbOperations.supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', email)
        .single()
      
      targetUserId = profile?.id
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if already a member
    const { data: existingMember } = await dbOperations.supabaseAdmin
      .from('group_members')
      .select('id, is_active')
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)
      .single()

    if (existingMember) {
      if (existingMember.is_active) {
        return NextResponse.json(
          { error: 'User is already a member of this group' },
          { status: 400 }
        )
      } else {
        // Reactivate membership
        const { data: reactivated, error: reactivateError } = await dbOperations.supabaseAdmin
          .from('group_members')
          .update({ is_active: true, role, joined_at: new Date().toISOString() })
          .eq('id', existingMember.id)
          .select()
          .single()

        if (reactivateError) {
          return NextResponse.json(
            { error: 'Failed to reactivate membership' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          member: reactivated
        })
      }
    }

    // Check group member limit
    const { data: group } = await dbOperations.supabaseAdmin
      .from('groups')
      .select('current_member_count, max_members')
      .eq('id', groupId)
      .single()

    if (group && group.current_member_count >= group.max_members) {
      return NextResponse.json(
        { error: 'Group has reached maximum member limit' },
        { status: 400 }
      )
    }

    // Add new member
    const { data: newMember, error: insertError } = await dbOperations.supabaseAdmin
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: targetUserId,
        role,
        invited_by: user.id,
        joined_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding member:', insertError)
      return NextResponse.json(
        { error: 'Failed to add member', details: insertError.message },
        { status: 500 }
      )
    }

    // Log activity
    await dbOperations.supabaseAdmin
      .from('group_activity_log')
      .insert({
        group_id: groupId,
        user_id: user.id,
        action: 'member_added',
        details: { added_user_id: targetUserId, role }
      })

    return NextResponse.json({
      success: true,
      member: newMember
    })

  } catch (error: any) {
    console.error('Error in POST /api/groups/[id]/members:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


