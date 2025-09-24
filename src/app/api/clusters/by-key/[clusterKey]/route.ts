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

    // Find cluster by cluster_key instead of ID
    const { data: clusters, error: clusterError } = await dbOperations.supabaseAdmin
      .from('database_clusters')
      .select(`
        *,
        cluster_team_access!inner(
          user_id,
          role,
          permissions
        )
      `)
      .eq('cluster_key', clusterKey)
      .eq('cluster_team_access.user_id', user.id);

    if (clusterError) {
      console.error('Database error fetching cluster by key:', clusterError);
      return NextResponse.json({ error: 'Failed to fetch cluster' }, { status: 500 });
    }

    if (!clusters || clusters.length === 0) {
      // Try fallback lookup by ID in case clusterKey is actually an ID
      const { data: clusterById, error: idError } = await dbOperations.supabaseAdmin
        .from('database_clusters')
        .select(`
          *,
          cluster_team_access!inner(
            user_id,
            role,
            permissions
          )
        `)
        .eq('id', clusterKey)
        .eq('cluster_team_access.user_id', user.id);

      if (idError || !clusterById || clusterById.length === 0) {
        return NextResponse.json({ error: 'Cluster not found or access denied' }, { status: 404 });
      }

      const cluster = clusterById[0];
      const userAccess = cluster.cluster_team_access[0];

      // Return cluster details with user's role and permissions
      return NextResponse.json({
        success: true,
        cluster: {
          id: cluster.id,
          name: cluster.name,
          description: cluster.description,
          cluster_key: cluster.cluster_key,
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
          
          // User access info
          user_role: userAccess?.role || 'viewer',
          user_permissions: userAccess?.permissions || []
        },
        userRole: userAccess?.role || 'viewer',
        userPermissions: userAccess?.permissions || []
      });
    }

    const cluster = clusters[0];
    const userAccess = cluster.cluster_team_access[0];

    // Return cluster details with user's role and permissions
    return NextResponse.json({
      success: true,
      cluster: {
        id: cluster.id,
        name: cluster.name,
        description: cluster.description,
        cluster_key: cluster.cluster_key,
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
        
        // User access info
        user_role: userAccess?.role || 'viewer',
        user_permissions: userAccess?.permissions || []
      },
      userRole: userAccess?.role || 'viewer',
      userPermissions: userAccess?.permissions || []
    });

  } catch (error) {
    console.error('Error in cluster by key endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
