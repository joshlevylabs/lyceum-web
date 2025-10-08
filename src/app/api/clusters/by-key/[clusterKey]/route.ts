import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { dbOperations } from '@/lib/supabase-direct';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clusterKey: string }> }
) {
  try {
    // Check authentication using the new auth utils
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { clusterKey } = await params

    console.log('Fetching cluster by key:', { clusterKey, userId: user.id })

    // Find cluster by cluster_key in unified_clusters table
    const { data: clusterByKey, error: clusterError } = await dbOperations.supabaseAdmin
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
      .eq('cluster_key', clusterKey)
      .eq('cluster_user_assignments.user_id', user.id)
      .eq('cluster_user_assignments.is_active', true)
      .single()

    console.log('Cluster by key query result:', { cluster: !!clusterByKey, error: clusterError?.message })

    let cluster = clusterByKey

    if (clusterError || !clusterByKey) {
      // Try fallback lookup by ID in case clusterKey is actually an ID
      const { data: clusterById, error: idError } = await dbOperations.supabaseAdmin
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
        .eq('id', clusterKey)
        .eq('cluster_user_assignments.user_id', user.id)
        .eq('cluster_user_assignments.is_active', true)
        .single()

      console.log('Cluster by ID fallback result:', { cluster: !!clusterById, error: idError?.message })

      if (idError || !clusterById) {
        console.log('Cluster not found or access denied:', { clusterError: clusterError?.message, idError: idError?.message })
        return NextResponse.json({ error: 'Failed to fetch cluster' }, { status: 500 })
      }

      // Use the cluster found by ID
      cluster = clusterById
    }

    // Get all assigned users for this cluster
    const { data: assignedUsers } = await dbOperations.supabaseAdmin
      .from('cluster_user_assignments')
      .select(`
        user_id,
        access_level,
        assigned_at,
        is_active,
        access_notes
      `)
      .eq('cluster_id', cluster.id)
      .eq('is_active', true)

    // Get cluster settings (if any)
    const { data: settings } = await dbOperations.supabaseAdmin
      .from('cluster_settings')
      .select('*')
      .eq('cluster_id', cluster.id)

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
    console.error('Error in cluster by key endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}