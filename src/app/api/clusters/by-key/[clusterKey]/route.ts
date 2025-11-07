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
        // Try looking in CentCom local clusters - get most recent heartbeat
        const { data: localClusters, error: localError } = await dbOperations.supabaseAdmin
          .from('local_cluster_usage')
          .select('*')
          .eq('cluster_key', clusterKey)
          .eq('user_id', user.id)
          .order('last_heartbeat_at', { ascending: false })
          .limit(1)

        const localCluster = localClusters?.[0]

        console.log('Local cluster lookup result:', { cluster: !!localCluster, error: localError?.message })

        if (localError || !localCluster) {
          console.log('Cluster not found or access denied:', {
            clusterError: clusterError?.message,
            idError: idError?.message,
            localError: localError?.message
          })
          return NextResponse.json({ error: 'Cluster not found' }, { status: 404 })
        }

        // Get license info for local cluster - use license_key_id not license_id
        const { data: license } = await dbOperations.supabaseAdmin
          .from('license_keys')
          .select('id, license_type, local_cluster_limits')
          .eq('id', localCluster.license_key_id)
          .maybeSingle()

        const limits = license?.local_cluster_limits || {}

        // Calculate online status
        const now = new Date()
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        const lastHeartbeat = new Date(localCluster.last_heartbeat_at)
        const isOnline = lastHeartbeat > oneHourAgo

        // Transform local cluster to unified format
        const transformedCluster = {
          id: localCluster.cluster_id || localCluster.id,
          cluster_key: localCluster.cluster_key,
          name: localCluster.cluster_name || `Local ClickHouse Cluster`,
          description: `Local ClickHouse cluster (${localCluster.machine_os || 'Unknown OS'})`,
          architecture: 'centcom',
          cluster_type: 'local',
          tier: license?.license_type || 'unknown',
          status: isOnline ? 'active' : 'offline',
          health_status: isOnline ? 'healthy' : 'offline',
          region: 'Local',
          storage_used_gb: localCluster.storage_used_gb,
          queries_this_month: localCluster.queries_this_month,
          clickhouse_version: localCluster.clickhouse_version,
          machine_os: localCluster.machine_os,
          machine_memory_gb: localCluster.machine_memory_gb,
          machine_cpu_cores: localCluster.machine_cpu_cores,
          machine_fingerprint: localCluster.machine_fingerprint,
          last_heartbeat_at: localCluster.last_heartbeat_at,
          max_storage_gb: limits.max_storage_gb,
          max_monthly_queries: limits.max_monthly_queries,
          offline_grace_days: limits.offline_grace_days,
          estimated_monthly_cost: 0,
          pricing_model: 'local',
          created_at: localCluster.created_at,
          updated_at: localCluster.updated_at,
          cluster_user_assignments: [{
            access_level: 'owner',
            assigned_at: localCluster.created_at,
            is_active: true,
            user_id: user.id
          }]
        }

        return NextResponse.json({
          success: true,
          cluster: {
            ...transformedCluster,
            user_role: 'owner',
            assigned_users: [{
              user_id: user.id,
              access_level: 'owner',
              assigned_at: localCluster.created_at,
              is_active: true
            }],
            settings: []
          }
        })
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