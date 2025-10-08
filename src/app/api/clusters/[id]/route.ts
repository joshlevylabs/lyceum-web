import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

interface ClusterUpdateData {
  name?: string
  description?: string
  cluster_type?: string
  classification?: 'gratis' | 'trial' | 'enterprise'
  status?: string
  responsible_user_id?: string
  max_assigned_users?: number
  estimated_monthly_cost?: number
  settings?: Record<string, any>
}

// GET /api/clusters/id/[id] - Get specific cluster details by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { id } = await params

    console.log('Fetching cluster details for ID:', { id, userId: user.id })

    // Get cluster with user assignment check
    const { data: cluster, error: clusterError } = await dbOperations.supabaseAdmin
      .from('unified_clusters')
      .select(`
        *,
        cluster_user_assignments!inner(
          access_level,
          assigned_at,
          is_active,
          user_id
        )
      `)
      .eq('id', id)
      .eq('cluster_user_assignments.user_id', user.id)
      .eq('cluster_user_assignments.is_active', true)
      .single()

    console.log('Cluster query result:', { cluster: !!cluster, error: clusterError?.message })

    if (clusterError || !cluster) {
      console.log('Cluster not found or access denied:', { clusterError: clusterError?.message })
      return NextResponse.json({ error: 'Failed to fetch cluster' }, { status: 500 })
    }

    // Get all assigned users for this cluster
    const { data: assignedUsers, error: usersError } = await dbOperations.supabaseAdmin
      .from('cluster_user_assignments')
      .select(`
        user_id,
        access_level,
        assigned_at,
        is_active,
        access_notes
      `)
      .eq('cluster_id', id)
      .eq('is_active', true)

    // Get cluster settings (if any)
    const { data: settings } = await dbOperations.supabaseAdmin
      .from('cluster_settings')
      .select('*')
      .eq('cluster_id', id)

    const response = {
      success: true,
      cluster: {
        ...cluster,
        user_role: cluster.cluster_user_assignments[0]?.access_level || 'user',
        assigned_users: assignedUsers || [],
        settings: settings || []
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in GET /api/clusters/id/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/clusters/id/[id] - Update cluster configuration
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { id } = await params
    const updateData: ClusterUpdateData = await request.json()

    console.log('PATCH cluster request:', { id, updateData, userId: user.id })

    // Check if user has admin access to this cluster
    const { data: userAccess, error: accessError } = await dbOperations.supabaseAdmin
      .from('cluster_user_assignments')
      .select('access_level')
      .eq('cluster_id', id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (accessError || !userAccess || !['owner', 'admin'].includes(userAccess.access_level)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Prepare update data
    const clusterUpdate: any = {}
    
    if (updateData.name) clusterUpdate.name = updateData.name
    if (updateData.description !== undefined) clusterUpdate.description = updateData.description
    if (updateData.cluster_type) clusterUpdate.cluster_type = updateData.cluster_type
    if (updateData.classification) clusterUpdate.classification = updateData.classification
    if (updateData.status) clusterUpdate.status = updateData.status
    if (updateData.responsible_user_id) clusterUpdate.responsible_user_id = updateData.responsible_user_id
    if (updateData.max_assigned_users) clusterUpdate.max_assigned_users = updateData.max_assigned_users
    if (updateData.estimated_monthly_cost !== undefined) clusterUpdate.estimated_monthly_cost = updateData.estimated_monthly_cost

    // Update the cluster
    const { data: updatedCluster, error: updateError } = await dbOperations.supabaseAdmin
      .from('unified_clusters')
      .update(clusterUpdate)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating cluster:', updateError)
      return NextResponse.json({ error: 'Failed to update cluster' }, { status: 500 })
    }

    console.log('Cluster updated successfully:', { id, updatedFields: Object.keys(clusterUpdate) })

    // Handle settings updates
    if (updateData.settings) {
      for (const [key, value] of Object.entries(updateData.settings)) {
        await dbOperations.supabaseAdmin
          .from('cluster_settings')
          .upsert({
            cluster_id: id,
            setting_key: key,
            setting_value: value,
            setting_type: typeof value,
            updated_by: user.id
          }, {
            onConflict: 'cluster_id,setting_key'
          })
      }
    }

    return NextResponse.json({
      success: true,
      cluster: updatedCluster
    })

  } catch (error) {
    console.error('Error in PATCH /api/clusters/id/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/clusters/id/[id] - Terminate cluster
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { id } = await params

    // Check if user is owner or admin
    const { data: userAccess, error: accessError } = await dbOperations.supabaseAdmin
      .from('cluster_user_assignments')
      .select('access_level')
      .eq('cluster_id', id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (accessError || !userAccess || !['owner', 'admin'].includes(userAccess.access_level)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update cluster status to terminated
    const { error: updateError } = await dbOperations.supabaseAdmin
      .from('unified_clusters')
      .update({
        status: 'terminated',
        terminated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error terminating cluster:', updateError)
      return NextResponse.json({ error: 'Failed to terminate cluster' }, { status: 500 })
    }

    // Deactivate all user assignments
    await dbOperations.supabaseAdmin
      .from('cluster_user_assignments')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: user.id,
        deactivation_reason: 'Cluster terminated'
      })
      .eq('cluster_id', id)

    return NextResponse.json({
      success: true,
      message: 'Cluster terminated successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/clusters/id/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
