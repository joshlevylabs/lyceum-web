import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

// POST /api/clusters/id/[id]/users - Assign user to cluster
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { id } = await params
    const { user_email, access_level = 'user', access_notes } = await request.json()

    console.log('User assignment request:', { clusterId: id, user_email, access_level })

    if (!user_email) {
      return NextResponse.json({ error: 'user_email is required' }, { status: 400 })
    }

    // Check if current user has admin access
    const { data: adminAccess, error: accessError } = await dbOperations.supabaseAdmin
      .from('cluster_user_assignments')
      .select('access_level')
      .eq('cluster_id', id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    console.log('Admin access check:', { adminAccess, accessError, currentUserId: user.id })

    if (accessError || !adminAccess || !['owner', 'admin'].includes(adminAccess.access_level)) {
      console.log('Access denied:', { accessError: accessError?.message, adminAccess })
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Find user by email in auth.users
    const { data: targetUser, error: userError } = await dbOperations.supabaseAdmin
      .auth.admin.listUsers()
      .then(({ data, error }) => {
        if (error) return { data: null, error }
        const user = data.users.find(u => u.email === user_email)
        return { data: user || null, error: user ? null : new Error('User not found') }
      })

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check cluster capacity
    const { data: cluster, error: clusterError } = await dbOperations.supabaseAdmin
      .from('unified_clusters')
      .select('max_assigned_users, current_assigned_users')
      .eq('id', id)
      .single()

    if (clusterError || !cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 })
    }

    if (cluster.current_assigned_users >= cluster.max_assigned_users) {
      return NextResponse.json({ 
        error: `Cluster has reached maximum user limit of ${cluster.max_assigned_users}` 
      }, { status: 400 })
    }

    // Check if user is already assigned
    const { data: existingAssignment } = await dbOperations.supabaseAdmin
      .from('cluster_user_assignments')
      .select('id, is_active')
      .eq('cluster_id', id)
      .eq('user_id', targetUser.id)
      .single()

    if (existingAssignment) {
      if (existingAssignment.is_active) {
        return NextResponse.json({ error: 'User is already assigned to this cluster' }, { status: 400 })
      } else {
        // Reactivate existing assignment
        const { error: reactivateError } = await dbOperations.supabaseAdmin
          .from('cluster_user_assignments')
          .update({
            is_active: true,
            access_level,
            access_notes,
            assigned_by: user.id,
            assigned_at: new Date().toISOString(),
            deactivated_at: null,
            deactivated_by: null,
            deactivation_reason: null
          })
          .eq('id', existingAssignment.id)

        if (reactivateError) {
          return NextResponse.json({ error: 'Failed to reactivate user assignment' }, { status: 500 })
        }
      }
    } else {
      // Create new assignment
      const { error: assignError } = await dbOperations.supabaseAdmin
        .from('cluster_user_assignments')
        .insert({
          cluster_id: id,
          user_id: targetUser.id,
          access_level,
          access_notes,
          assigned_by: user.id,
          is_active: true
        })

      if (assignError) {
        console.error('Error assigning user to cluster:', assignError)
        return NextResponse.json({ error: 'Failed to assign user to cluster' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: `User ${user_email} assigned to cluster successfully`
    })

  } catch (error) {
    console.error('Error in POST /api/clusters/id/[id]/users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/clusters/id/[id]/users - List cluster users
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { id } = await params

    // Check user access
    const { data: userAccess, error: accessError } = await dbOperations.supabaseAdmin
      .from('cluster_user_assignments')
      .select('access_level')
      .eq('cluster_id', id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (accessError || !userAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all assigned users
    const { data: assignments, error: assignmentsError } = await dbOperations.supabaseAdmin
      .from('cluster_user_assignments')
      .select(`
        user_id,
        access_level,
        assigned_at,
        access_notes,
        is_active
      `)
      .eq('cluster_id', id)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })

    if (assignmentsError) {
      console.error('Error fetching cluster users:', assignmentsError)
      return NextResponse.json({ error: 'Failed to fetch cluster users' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      users: assignments || [],
      total: (assignments || []).length
    })

  } catch (error) {
    console.error('Error in GET /api/clusters/id/[id]/users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



