import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'
import { clusterProvisioningService } from '@/lib/cluster-provisioning'

// GET /api/clusters/[clusterId]/status - Get cluster status and health
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    // Check authentication using the new auth utils
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { clusterId } = await params

    // Check if user has access to this cluster and get cluster info
    const { data: cluster, error: accessError } = await dbOperations.getClusterById(clusterId, user.id)
    if (accessError || !cluster) {
      return NextResponse.json({ error: 'Cluster not found or access denied' }, { status: 404 })
    }

    // Get provisioning status if cluster is still being set up
    let provisioningStatus = null
    if (cluster.status === 'provisioning' || cluster.status === 'initializing') {
      provisioningStatus = clusterProvisioningService.getProvisioningStatus(clusterId)
    }

    // Get health status if cluster is active
    let healthStatus = null
    if (cluster.status === 'active' && cluster.connection_string) {
      try {
        healthStatus = await clusterProvisioningService.performHealthCheck(
          clusterId, 
          cluster.connection_string
        )
      } catch (error) {
        console.error('Health check failed:', error)
        healthStatus = {
          status: 'critical',
          error: 'Health check failed'
        }
      }
    }

    // Get recent usage metrics from the cluster data (already loaded from dbOperations)
    const recentMetrics = cluster.cluster_usage_metrics || []

    // Calculate summary statistics
    const summaryStats = recentMetrics ? {
      total_queries: recentMetrics.reduce((sum, m) => sum + (m.query_count || 0), 0),
      avg_query_duration_ms: recentMetrics.length > 0 
        ? recentMetrics.reduce((sum, m) => sum + (m.avg_query_duration_ms || 0), 0) / recentMetrics.length
        : 0,
      total_cost_last_7_days: recentMetrics.reduce((sum, m) => sum + (m.total_cost || 0), 0),
      data_ingested_gb: recentMetrics.reduce((sum, m) => sum + (m.data_ingested_gb || 0), 0),
      data_queried_gb: recentMetrics.reduce((sum, m) => sum + (m.data_queried_gb || 0), 0)
    } : null

    const response = {
      success: true,
      cluster: {
        id: cluster.id,
        name: cluster.name,
        status: cluster.status,
        health_status: cluster.health_status,
        last_health_check: cluster.last_health_check,
        created_at: cluster.created_at,
        updated_at: cluster.updated_at
      },
      provisioning_status: provisioningStatus,
      health_check: healthStatus,
      usage_summary: summaryStats,
      recent_metrics_count: recentMetrics?.length || 0
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in GET /api/clusters/[clusterId]/status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/clusters/[clusterId]/status/health-check - Trigger manual health check
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    // Check authentication using the new auth utils
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { clusterId } = await params

    // Get cluster and check access (only admin/creator can trigger health checks)
    const { data: cluster, error: accessError } = await dbOperations.getClusterById(clusterId, user.id)
    if (accessError || !cluster) {
      return NextResponse.json({ error: 'Cluster not found or access denied' }, { status: 404 })
    }

    // Check if user has admin access
    const userAccess = cluster.cluster_team_access?.find((access: any) => access.user_id === user.id)
    const userRole = userAccess?.role || (cluster.created_by === user.id ? 'admin' : null)
    
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required to trigger health checks' }, { status: 403 })
    }

    if (cluster.status !== 'active') {
      return NextResponse.json({ 
        error: 'Health check can only be performed on active clusters',
        current_status: cluster.status
      }, { status: 400 })
    }

    // Perform health check
    const healthStatus = await clusterProvisioningService.performHealthCheck(
      clusterId,
      cluster.connection_string
    )

    return NextResponse.json({
      success: true,
      message: 'Health check completed',
      health_status: healthStatus
    })

  } catch (error) {
    console.error('Error in POST /api/clusters/[clusterId]/status/health-check:', error)
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 })
  }
}
