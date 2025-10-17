import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email') || 'josh@thelyceum.io'

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find user by email
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('email', email)
      .single()

    if (profileError || !profiles) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        email
      }, { status: 404 })
    }

    // Find local cluster usage for this user
    const { data: clusters, error: clusterError } = await supabase
      .from('local_cluster_usage')
      .select('*')
      .eq('user_id', profiles.id)

    if (clusterError) {
      return NextResponse.json({
        success: false,
        error: 'Error fetching cluster data',
        details: clusterError.message
      }, { status: 500 })
    }

    // Get license data separately
    const licenseIds = [...new Set((clusters || []).map((c: any) => c.license_id))]
    const { data: licenses } = await supabase
      .from('license_keys')
      .select('id, license_type, local_cluster_limits')
      .in('id', licenseIds)

    // Create lookup map for licenses
    const licenseMap = new Map(licenses?.map(l => [l.id, l]) || [])

    if (!clusters || clusters.length === 0) {
      return NextResponse.json({
        success: true,
        hasCluster: false,
        user: {
          email: profiles.email,
          full_name: profiles.full_name
        },
        message: 'No local cluster found for this user'
      })
    }

    // Check if any cluster is online (heartbeat within last hour)
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    const clustersWithStatus = clusters.map((cluster: any) => {
      const lastHeartbeat = new Date(cluster.last_heartbeat_at)
      const isOnline = lastHeartbeat > oneHourAgo
      const hoursSinceHeartbeat = (now.getTime() - lastHeartbeat.getTime()) / (1000 * 60 * 60)

      // Get license data from map
      const license = licenseMap.get(cluster.license_id)
      const limits = license?.local_cluster_limits || {}

      const storagePercent = limits.max_storage_gb
        ? (cluster.storage_used_gb / limits.max_storage_gb) * 100
        : 0

      const queryPercent = limits.max_monthly_queries
        ? (cluster.queries_this_month / limits.max_monthly_queries) * 100
        : 0

      return {
        id: cluster.id,
        machine_fingerprint: cluster.machine_fingerprint,
        clickhouse_version: cluster.clickhouse_version,
        machine_os: cluster.machine_os,
        machine_specs: cluster.machine_cpu_cores && cluster.machine_memory_gb ? {
          cpu_cores: cluster.machine_cpu_cores,
          memory_gb: cluster.machine_memory_gb
        } : null,
        status: {
          is_online: isOnline,
          last_heartbeat_at: cluster.last_heartbeat_at,
          hours_since_heartbeat: Math.round(hoursSinceHeartbeat * 10) / 10,
          status_label: isOnline ? 'Online' :
            hoursSinceHeartbeat <= 24 ? 'Recently Offline' :
            'Offline'
        },
        usage: {
          storage_used_gb: cluster.storage_used_gb,
          storage_limit_gb: limits.max_storage_gb || 0,
          storage_percent: Math.round(storagePercent * 10) / 10,
          queries_this_month: cluster.queries_this_month,
          query_limit: limits.max_monthly_queries || 0,
          query_percent: Math.round(queryPercent * 10) / 10
        },
        license_type: license?.license_type || 'unknown',
        created_at: cluster.created_at
      }
    })

    const hasOnlineCluster = clustersWithStatus.some(c => c.status.is_online)

    return NextResponse.json({
      success: true,
      hasCluster: true,
      hasOnlineCluster,
      user: {
        email: profiles.email,
        full_name: profiles.full_name
      },
      clusters: clustersWithStatus,
      summary: {
        total_clusters: clustersWithStatus.length,
        online_clusters: clustersWithStatus.filter(c => c.status.is_online).length,
        offline_clusters: clustersWithStatus.filter(c => !c.status.is_online).length
      }
    })

  } catch (error) {
    console.error('Error testing cluster connection:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
