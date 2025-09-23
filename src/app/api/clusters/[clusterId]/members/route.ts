import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

interface TeamMemberAdd {
  user_id: string
  role: 'admin' | 'editor' | 'analyst' | 'viewer'
  permissions?: Record<string, boolean>
  expires_at?: string
}

interface TeamMemberUpdate {
  role?: 'admin' | 'editor' | 'analyst' | 'viewer'
  permissions?: Record<string, boolean>
  expires_at?: string | null
}

// Role-based permission templates
const ROLE_PERMISSIONS = {
  admin: {
    cluster_management: true,
    data_read: true,
    data_write: true,
    schema_modify: true,
    user_management: true,
    billing_access: true
  },
  editor: {
    cluster_management: false,
    data_read: true,
    data_write: true,
    schema_modify: true,
    user_management: false,
    billing_access: false
  },
  analyst: {
    cluster_management: false,
    data_read: true,
    data_write: false,
    schema_modify: false,
    user_management: false,
    billing_access: false
  },
  viewer: {
    cluster_management: false,
    data_read: true,
    data_write: false,
    schema_modify: false,
    user_management: false,
    billing_access: false
  }
}

// GET /api/clusters/[clusterId]/members - Get cluster team members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clusterId } = params

    // Check if user has access to this cluster
    const { data: hasAccess } = await supabase
      .rpc('check_cluster_permission', {
        user_uuid: user.id,
        cluster_uuid: clusterId,
        required_permission: 'data_read'
      })

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get cluster members with user details
    const { data: members, error } = await supabase
      .from('cluster_team_access')
      .select(`
        *,
        user:user_id (
          id,
          email,
          raw_user_meta_data,
          created_at
        ),
        granted_by_user:granted_by (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('cluster_id', clusterId)
      .order('granted_at', { ascending: false })

    if (error) {
      console.error('Error fetching cluster members:', error)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    // Also get cluster owner
    const { data: cluster } = await supabase
      .from('database_clusters')
      .select(`
        created_by,
        created_at,
        user:created_by (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('id', clusterId)
      .single()

    // Format response
    const teamMembers = []

    // Add cluster owner first
    if (cluster?.user) {
      teamMembers.push({
        user_id: cluster.user.id,
        email: cluster.user.email,
        full_name: cluster.user.raw_user_meta_data?.full_name || cluster.user.email.split('@')[0],
        role: 'owner',
        permissions: ROLE_PERMISSIONS.admin,
        granted_at: cluster.created_at,
        granted_by: null,
        expires_at: null,
        is_owner: true
      })
    }

    // Add team members
    if (members) {
      members.forEach((member: any) => {
        // Don't duplicate the owner
        if (member.user_id !== cluster?.created_by) {
          teamMembers.push({
            user_id: member.user.id,
            email: member.user.email,
            full_name: member.user.raw_user_meta_data?.full_name || member.user.email.split('@')[0],
            role: member.role,
            permissions: member.permissions,
            granted_at: member.granted_at,
            granted_by: member.granted_by_user?.email || 'System',
            expires_at: member.expires_at,
            is_owner: false
          })
        }
      })
    }

    return NextResponse.json({
      success: true,
      cluster_id: clusterId,
      members: teamMembers,
      total_members: teamMembers.length
    })

  } catch (error) {
    console.error('Error in GET /api/clusters/[clusterId]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/clusters/[clusterId]/members - Add team member(s)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clusterId } = params
    const body: { users: TeamMemberAdd[] } = await request.json()

    // Validate input
    if (!body.users || !Array.isArray(body.users) || body.users.length === 0) {
      return NextResponse.json({ error: 'Invalid request: users array required' }, { status: 400 })
    }

    // Check if user has permission to manage team
    const { data: hasPermission } = await supabase
      .rpc('check_cluster_permission', {
        user_uuid: user.id,
        cluster_uuid: clusterId,
        required_permission: 'user_management'
      })

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions to manage team' }, { status: 403 })
    }

    // Validate all users exist
    const userIds = body.users.map(u => u.user_id)
    const { data: existingUsers, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      return NextResponse.json({ error: 'Failed to validate users' }, { status: 500 })
    }

    const validUserIds = new Set(existingUsers.users.map(u => u.id))
    const invalidUsers = userIds.filter(id => !validUserIds.has(id))
    
    if (invalidUsers.length > 0) {
      return NextResponse.json({ 
        error: 'Invalid user IDs', 
        invalid_users: invalidUsers 
      }, { status: 400 })
    }

    // Check for existing memberships
    const { data: existingMembers } = await supabase
      .from('cluster_team_access')
      .select('user_id')
      .eq('cluster_id', clusterId)
      .in('user_id', userIds)

    const existingUserIds = new Set(existingMembers?.map(m => m.user_id) || [])

    // Prepare new memberships
    const newMemberships = body.users
      .filter(u => !existingUserIds.has(u.user_id))
      .map(u => ({
        cluster_id: clusterId,
        user_id: u.user_id,
        role: u.role,
        permissions: u.permissions || ROLE_PERMISSIONS[u.role],
        granted_by: user.id,
        expires_at: u.expires_at || null
      }))

    if (newMemberships.length === 0) {
      return NextResponse.json({ 
        error: 'All specified users are already members of this cluster',
        existing_members: Array.from(existingUserIds)
      }, { status: 400 })
    }

    // Insert new memberships
    const { data: addedMembers, error: insertError } = await supabase
      .from('cluster_team_access')
      .insert(newMemberships)
      .select(`
        *,
        user:user_id (id, email, raw_user_meta_data)
      `)

    if (insertError) {
      console.error('Error adding team members:', insertError)
      return NextResponse.json({ error: 'Failed to add team members' }, { status: 500 })
    }

    // Format response
    const formattedMembers = addedMembers?.map((member: any) => ({
      user_id: member.user.id,
      email: member.user.email,
      full_name: member.user.raw_user_meta_data?.full_name || member.user.email.split('@')[0],
      role: member.role,
      permissions: member.permissions,
      granted_at: member.granted_at,
      expires_at: member.expires_at
    })) || []

    return NextResponse.json({
      success: true,
      message: `Added ${formattedMembers.length} team member(s)`,
      added_members: formattedMembers,
      skipped_existing: Array.from(existingUserIds)
    })

  } catch (error) {
    console.error('Error in POST /api/clusters/[clusterId]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/clusters/[clusterId]/members/[userId] - Update team member
export async function PATCH(
  request: NextRequest,
  { params }: { params: { clusterId: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clusterId } = params
    const url = new URL(request.url)
    const targetUserId = url.searchParams.get('userId')
    const body: TeamMemberUpdate = await request.json()

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID required in query parameters' }, { status: 400 })
    }

    // Check if user has permission to manage team
    const { data: hasPermission } = await supabase
      .rpc('check_cluster_permission', {
        user_uuid: user.id,
        cluster_uuid: clusterId,
        required_permission: 'user_management'
      })

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions to manage team' }, { status: 403 })
    }

    // Cannot modify cluster owner
    const { data: cluster } = await supabase
      .from('database_clusters')
      .select('created_by')
      .eq('id', clusterId)
      .single()

    if (cluster?.created_by === targetUserId) {
      return NextResponse.json({ error: 'Cannot modify cluster owner permissions' }, { status: 400 })
    }

    // Build update object
    const updateData: any = {}
    
    if (body.role) {
      updateData.role = body.role
      updateData.permissions = body.permissions || ROLE_PERMISSIONS[body.role]
    } else if (body.permissions) {
      updateData.permissions = body.permissions
    }
    
    if (body.expires_at !== undefined) {
      updateData.expires_at = body.expires_at
    }

    // Update member
    const { data: updatedMember, error } = await supabase
      .from('cluster_team_access')
      .update(updateData)
      .eq('cluster_id', clusterId)
      .eq('user_id', targetUserId)
      .select(`
        *,
        user:user_id (id, email, raw_user_meta_data)
      `)
      .single()

    if (error) {
      console.error('Error updating team member:', error)
      return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      member: {
        user_id: updatedMember.user.id,
        email: updatedMember.user.email,
        full_name: updatedMember.user.raw_user_meta_data?.full_name || updatedMember.user.email.split('@')[0],
        role: updatedMember.role,
        permissions: updatedMember.permissions,
        granted_at: updatedMember.granted_at,
        expires_at: updatedMember.expires_at
      }
    })

  } catch (error) {
    console.error('Error in PATCH /api/clusters/[clusterId]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/clusters/[clusterId]/members/[userId] - Remove team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clusterId: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clusterId } = params
    const url = new URL(request.url)
    const targetUserId = url.searchParams.get('userId')

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID required in query parameters' }, { status: 400 })
    }

    // Check if user has permission to manage team
    const { data: hasPermission } = await supabase
      .rpc('check_cluster_permission', {
        user_uuid: user.id,
        cluster_uuid: clusterId,
        required_permission: 'user_management'
      })

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions to manage team' }, { status: 403 })
    }

    // Cannot remove cluster owner
    const { data: cluster } = await supabase
      .from('database_clusters')
      .select('created_by')
      .eq('id', clusterId)
      .single()

    if (cluster?.created_by === targetUserId) {
      return NextResponse.json({ error: 'Cannot remove cluster owner' }, { status: 400 })
    }

    // Remove member
    const { error } = await supabase
      .from('cluster_team_access')
      .delete()
      .eq('cluster_id', clusterId)
      .eq('user_id', targetUserId)

    if (error) {
      console.error('Error removing team member:', error)
      return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/clusters/[clusterId]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
