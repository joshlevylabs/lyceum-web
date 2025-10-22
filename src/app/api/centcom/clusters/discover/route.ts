import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

export async function GET(request: NextRequest) {
  try {
    const { success, user, error: authError, response: authResponse } = await requireAuth(request)
    if (!success) {
      console.log('Cluster discovery API - Auth failed')
      return authResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all cloud clusters assigned to this user
    const { data: clusters, error: clustersError } = await dbOperations.supabaseAdmin
      .rpc('get_user_clusters', { p_user_id: user.id })

    if (clustersError) {
      console.error('Error fetching cloud clusters:', clustersError)
      return NextResponse.json({
        error: 'Failed to fetch clusters',
        details: clustersError.message
      }, { status: 500 })
    }

    // Format cloud clusters for Centcom consumption
    const cloudConnections = (clusters || []).map((cluster: any) => ({
      id: cluster.cluster_id,
      key: cluster.cluster_key,
      name: cluster.cluster_name,
      type: cluster.cluster_type,
      deployment_type: 'cloud', // New field to distinguish
      architecture: cluster.architecture,
      classification: cluster.classification,
      region: cluster.region,
      connection_type: cluster.connection_type,
      access_level: cluster.access_level,
      is_default: cluster.is_default,

      // Connection details
      connection_info: cluster.architecture === 'optimized' ? {
        endpoint: cluster.processing_endpoint,
        customer_id: cluster.customer_id,
        protocol: 'https'
      } : {
        connection_string: cluster.connection_string,
        protocol: 'clickhouse'
      },

      // Metadata
      last_connected_at: cluster.last_connected_at,
      discovered_at: new Date().toISOString()
    }))

    // Get all local clusters for this user
    const { data: localClusters, error: localClustersError } = await dbOperations.supabaseAdmin
      .from('local_cluster_usage')
      .select('*')
      .eq('user_id', user.id)
      .neq('cluster_status', 'decommissioned')
      .order('last_heartbeat_at', { ascending: false })

    if (localClustersError) {
      console.error('Error fetching local clusters:', localClustersError)
      // Don't fail the entire request if local clusters fail
    }

    // Format local clusters for Centcom consumption
    const localConnections = (localClusters || []).map((cluster: any) => {
      // Determine online status based on last heartbeat (< 30 minutes = online)
      const lastHeartbeat = new Date(cluster.last_heartbeat_at || 0)
      const minutesSinceHeartbeat = (Date.now() - lastHeartbeat.getTime()) / (1000 * 60)
      const isOnline = minutesSinceHeartbeat < 30 && cluster.is_running

      return {
        id: cluster.cluster_id,
        key: cluster.cluster_key || `LOCAL-${cluster.cluster_id.substring(0, 8).toUpperCase()}`,
        name: cluster.cluster_name,
        type: 'local',
        deployment_type: 'local', // New field to distinguish
        architecture: 'local',
        classification: 'private',
        region: 'local',
        connection_type: 'local',
        access_level: 'full',
        is_default: false,

        // Connection details for local cluster
        connection_info: {
          endpoint: 'localhost:8123',
          protocol: 'http',
          local: true
        },

        // Local cluster specific metadata
        machine_fingerprint: cluster.machine_fingerprint,
        installation_id: cluster.installation_id,
        clickhouse_version: cluster.clickhouse_version,
        centcom_version: cluster.centcom_version,

        // System info
        system_info: {
          os: cluster.machine_os,
          os_version: cluster.os_version,
          architecture: cluster.architecture,
          hostname: cluster.hostname,
          cpu_cores: cluster.machine_cpu_cores,
          memory_gb: cluster.machine_memory_gb
        },

        // Status and usage
        status: isOnline ? 'online' : 'offline',
        cluster_status: cluster.cluster_status,
        is_running: cluster.is_running,
        uptime_seconds: cluster.uptime_seconds,

        // Usage metrics
        usage: {
          storage_used_gb: cluster.storage_used_gb,
          storage_bytes: cluster.storage_bytes,
          queries_this_month: cluster.queries_this_month,
          project_count: cluster.project_count,
          measurement_count: cluster.measurement_count,
          table_count: cluster.table_count
        },

        // Timestamps
        last_heartbeat_at: cluster.last_heartbeat_at,
        last_connected_at: cluster.last_heartbeat_at,
        registered_at: cluster.created_at,
        discovered_at: new Date().toISOString()
      }
    })

    // Combine cloud and local clusters
    const allConnections = [...cloudConnections, ...localConnections]

    console.log('✅ Cluster discovery complete:', {
      cloud_clusters: cloudConnections.length,
      local_clusters: localConnections.length,
      total: allConnections.length
    })

    return NextResponse.json({
      success: true,
      clusters: allConnections,
      total: allConnections.length,
      breakdown: {
        cloud: cloudConnections.length,
        local: localConnections.length
      }
    })

  } catch (error) {
    console.error('Cluster discovery error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

