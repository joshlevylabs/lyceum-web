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
      .select(`
        id,
        user_id,
        machine_fingerprint,
        storage_used_gb,
        queries_this_month,
        clickhouse_version,
        machine_os,
        machine_memory_gb,
        machine_cpu_cores,
        last_heartbeat_at,
        created_at,
        license_id,
        license_keys (
          license_type,
          max_storage_gb,
          max_monthly_queries,
          offline_grace_days
        )
      `)
      .eq('user_id', profiles.id)

    if (clusterError) {
      return NextResponse.json({
        success: false,
        error: 'Error fetching cluster data',
        details: clusterError.message
      }, { status: 500 })
    }

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

    const clustersWithStatus = clusters.map(cluster => {
      const lastHeartbeat = new Date(cluster.last_heartbeat_at)
      const isOnline = lastHeartbeat > oneHourAgo
      const hoursSinceHeartbeat = (now.getTime() - lastHeartbeat.getTime()) / (1000 * 60 * 60)

      // Calculate usage percentages
      const licenseData = Array.isArray(cluster.license_keys)
        ? cluster.license_keys[0]
        : cluster.license_keys

      const storagePercent = licenseData?.max_storage_gb
        ? (cluster.storage_used_gb / licenseData.max_storage_gb) * 100
        : 0

      const queryPercent = licenseData?.max_monthly_queries
        ? (cluster.queries_this_month / licenseData.max_monthly_queries) * 100
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
          storage_limit_gb: licenseData?.max_storage_gb,
          storage_percent: Math.round(storagePercent * 10) / 10,
          queries_this_month: cluster.queries_this_month,
          query_limit: licenseData?.max_monthly_queries,
          query_percent: Math.round(queryPercent * 10) / 10
        },
        license_type: licenseData?.license_type,
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
