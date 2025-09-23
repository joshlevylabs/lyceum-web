import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  console.log('🔧 CORS preflight for clusterId route:', {
    origin,
    method: request.method,
    url: request.url
  })
  
  const headers = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }
  
  console.log('🔧 Sending CORS headers:', headers)
  
  return new NextResponse(null, {
    status: 200,
    headers,
  })
}

interface ClusterUpdateData {
  name?: string
  description?: string
  configuration?: {
    nodes?: number
    cpu_per_node?: number
    memory_per_node?: string
    storage_per_node?: string
    hot_tier_size?: string
    warm_tier_size?: string
    cold_tier_size?: string
  }
  retention_policy?: {
    hot_days?: number
    warm_days?: number
    cold_days?: number
    archive_enabled?: boolean
  }
}

// GET /api/clusters/[clusterId] - Get cluster details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    // Check authentication using the new auth utils
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { clusterId } = await params

    // Get cluster with access check using direct operations
    const { data: cluster, error } = await dbOperations.getClusterById(clusterId, user.id)

    if (error || !cluster) {
      console.error('Error fetching cluster:', error)
      return NextResponse.json({ error: 'Cluster not found or access denied' }, { status: 404 })
    }

    // Check user permissions
    const userAccess = cluster.cluster_team_access?.find((access: any) => access.user_id === user.id)
    const userRole = userAccess?.role || (cluster.created_by === user.id ? 'admin' : null)
    
    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get recent usage metrics (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentMetrics = cluster.cluster_usage_metrics?.filter((metric: any) => 
      new Date(metric.period_start) >= thirtyDaysAgo
    ) || []

    // Calculate summary metrics
    const totalQueries = recentMetrics.reduce((sum: number, metric: any) => sum + (metric.query_count || 0), 0)
    const avgQueryDuration = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum: number, metric: any) => sum + (metric.avg_query_duration_ms || 0), 0) / recentMetrics.length
      : 0
    const totalCost = recentMetrics.reduce((sum: number, metric: any) => sum + (metric.total_cost || 0), 0)

    // Return cluster details with user's role and permissions
    const response = {
      success: true,
      cluster: {
        id: cluster.id,
        name: cluster.name,
        description: cluster.description,
        cluster_type: cluster.cluster_type,
        region: cluster.region,
        status: cluster.status,
        clickhouse_cluster_id: cluster.clickhouse_cluster_id,
        
        // Configuration
        node_count: cluster.node_count,
        cpu_per_node: cluster.cpu_per_node,
        memory_per_node: cluster.memory_per_node,
        storage_per_node: cluster.storage_per_node,
        hot_tier_size: cluster.hot_tier_size,
        warm_tier_size: cluster.warm_tier_size,
        cold_tier_size: cluster.cold_tier_size,
        archive_enabled: cluster.archive_enabled,
        
        // Retention policy
        hot_retention_days: cluster.hot_retention_days,
        warm_retention_days: cluster.warm_retention_days,
        cold_retention_days: cluster.cold_retention_days,
        
        // Metadata
        created_at: cluster.created_at,
        updated_at: cluster.updated_at,
        created_by: cluster.created_by,
        health_status: cluster.health_status,
        last_health_check: cluster.last_health_check,
        
        // Cost information
        estimated_monthly_cost: cluster.estimated_monthly_cost,
        actual_monthly_cost: cluster.actual_monthly_cost,
        
        // User's access information
        user_role: userRole,
        user_permissions: userAccess?.permissions || {},
        
        // Projects in this cluster
        projects: cluster.cluster_projects || [],
        
        // Usage summary (last 30 days)
        usage_summary: {
          total_queries: totalQueries,
          avg_query_duration_ms: Math.round(avgQueryDuration),
          total_cost_last_30_days: Math.round(totalCost * 100) / 100,
          metrics_count: recentMetrics.length
        }
      }
    }

    // Include connection details for admins and editors
    if (userRole === 'admin' || userRole === 'editor') {
      const connectionEndpoints = {
        http: `https://${cluster.clickhouse_cluster_id}.lyceum.com:8443`,
        native: `clickhouse://${cluster.clickhouse_cluster_id}.lyceum.com:9000`,
        mysql: `mysql://${cluster.clickhouse_cluster_id}.lyceum.com:9004`
      }
      
      response.cluster = {
        ...response.cluster,
        connection_string: cluster.connection_string,
        endpoints: connectionEndpoints
      }
    }

    // Include credentials for admins only
    if (userRole === 'admin') {
      response.cluster = {
        ...response.cluster,
        admin_username: cluster.admin_username,
        readonly_username: cluster.readonly_username
        // Note: Never return password hashes in API responses
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in GET /api/clusters/[clusterId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/clusters/[clusterId] - Update cluster configuration
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    // Check authentication using the new auth utils
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { clusterId } = await params
    const body: ClusterUpdateData = await request.json()

    // For now, we'll check access by trying to get the cluster (this ensures user has access)
    const { data: existingCluster, error: accessError } = await dbOperations.getClusterById(clusterId, user.id)
    if (accessError || !existingCluster) {
      const origin = request.headers.get('origin')
      return NextResponse.json({ error: 'Cluster not found or access denied' }, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
          'Access-Control-Allow-Credentials': 'true',
        },
      })
    }

    // Check if user has admin access (creator or admin role)
    const userAccess = existingCluster.cluster_team_access?.find((access: any) => access.user_id === user.id)
    const userRole = userAccess?.role || (existingCluster.created_by === user.id ? 'admin' : null)
    
    if (userRole !== 'admin') {
      const origin = request.headers.get('origin')
      return NextResponse.json({ error: 'Admin access required' }, { 
        status: 403,
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
          'Access-Control-Allow-Credentials': 'true',
        },
      })
    }

    // Build update object
    const updateData: any = {}
    
    if (body.name) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    
    if (body.configuration) {
      if (body.configuration.nodes) updateData.node_count = body.configuration.nodes
      if (body.configuration.cpu_per_node) updateData.cpu_per_node = body.configuration.cpu_per_node
      if (body.configuration.memory_per_node) updateData.memory_per_node = body.configuration.memory_per_node
      if (body.configuration.storage_per_node) updateData.storage_per_node = body.configuration.storage_per_node
      if (body.configuration.hot_tier_size) updateData.hot_tier_size = body.configuration.hot_tier_size
      if (body.configuration.warm_tier_size) updateData.warm_tier_size = body.configuration.warm_tier_size
      if (body.configuration.cold_tier_size) updateData.cold_tier_size = body.configuration.cold_tier_size
    }
    
    if (body.retention_policy) {
      if (body.retention_policy.hot_days) updateData.hot_retention_days = body.retention_policy.hot_days
      if (body.retention_policy.warm_days) updateData.warm_retention_days = body.retention_policy.warm_days
      if (body.retention_policy.cold_days) updateData.cold_retention_days = body.retention_policy.cold_days
      if (body.retention_policy.archive_enabled !== undefined) updateData.archive_enabled = body.retention_policy.archive_enabled
    }

    // Update cluster using direct operations
    const { data: updatedCluster, error } = await dbOperations.updateCluster(clusterId, user.id, updateData)

    if (error) {
      console.error('Error updating cluster:', error)
      const origin = request.headers.get('origin')
      return NextResponse.json({ error: 'Failed to update cluster' }, { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
          'Access-Control-Allow-Credentials': 'true',
        },
      })
    }

    // TODO: Apply configuration changes to actual ClickHouse cluster
    // await updateClickHouseCluster(clusterId, updateData)

    const origin = request.headers.get('origin')
    
    return NextResponse.json({
      success: true,
      cluster: {
        id: updatedCluster.id,
        name: updatedCluster.name,
        description: updatedCluster.description,
        cluster_type: updatedCluster.cluster_type,
        status: updatedCluster.status,
        updated_at: updatedCluster.updated_at
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
        'Access-Control-Allow-Credentials': 'true',
      },
    })

  } catch (error) {
    console.error('Error in PATCH /api/clusters/[clusterId]:', error)
    const origin = request.headers.get('origin')
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
        'Access-Control-Allow-Credentials': 'true',
      },
    })
  }
}

// DELETE /api/clusters/[clusterId] - Delete cluster
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    // Check authentication using the new auth utils
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { clusterId } = await params
    const url = new URL(request.url)
    const confirm = url.searchParams.get('confirm') === 'true'

    if (!confirm) {
      return NextResponse.json({ 
        error: 'Deletion requires confirmation. Add ?confirm=true to the request.' 
      }, { status: 400 })
    }

    // Get cluster and check user access (only creator can delete)
    const { data: cluster, error: accessError } = await dbOperations.getClusterById(clusterId, user.id)
    if (accessError || !cluster) {
      return NextResponse.json({ error: 'Cluster not found or access denied' }, { status: 404 })
    }

    // Only the creator can delete the cluster
    if (cluster.created_by !== user.id) {
      return NextResponse.json({ error: 'Only the cluster creator can delete the cluster' }, { status: 403 })
    }

    // Check if cluster has active projects
    const activeProjects = cluster.cluster_projects?.filter((project: any) => project.status === 'active') || []

    if (activeProjects && activeProjects.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete cluster with active projects. Archive or delete projects first.',
        active_projects: activeProjects
      }, { status: 400 })
    }

    // Set cluster to terminated status (soft delete) using direct operations
    const { error: updateError } = await dbOperations.deleteClusterById(clusterId, user.id)

    if (updateError) {
      console.error('Error terminating cluster:', updateError)
      return NextResponse.json({ error: 'Failed to terminate cluster' }, { status: 500 })
    }

    // TODO: Terminate actual ClickHouse cluster
    // await terminateClickHouseCluster(clusterId)

    return NextResponse.json({
      success: true,
      message: 'Cluster has been terminated and will be fully deleted within 24 hours'
    })

  } catch (error) {
    console.error('Error in DELETE /api/clusters/[clusterId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
