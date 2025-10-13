import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import * as dbOperations from '@/lib/supabase-direct'

/**
 * Get group details by key (e.g., GROUP-1)
 * GET /api/groups/by-key/[key]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { key: groupKey } = await params

    // Get group by key
    const { data: group, error: groupError } = await dbOperations.supabaseAdmin
      .from('groups')
      .select('*')
      .eq('key', groupKey.toUpperCase())
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Check if user is a member of this group
    const { data: membership, error: membershipError } = await dbOperations.supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Group not found or access denied' },
        { status: 404 }
      )
    }

    // Get member count and role distribution
    const { data: members, error: membersError } = await dbOperations.supabaseAdmin
      .from('group_members')
      .select('role, user_id')
      .eq('group_id', group.id)
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
      .eq('group_id', group.id)

    return NextResponse.json({
      success: true,
      group: {
        id: group.id,
        key: group.key,
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
    console.error('Error in GET /api/groups/by-key/[key]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


