// Utility functions for handling clusters with backwards compatibility

import { dbOperations } from './supabase-direct'

/**
 * Check if cluster_key column exists in database_clusters table
 */
export async function hasClusterKeyColumn(): Promise<boolean> {
  try {
    // Try to select cluster_key from a small query
    const { error } = await dbOperations.supabaseAdmin
      .from('database_clusters')
      .select('cluster_key')
      .limit(1)
    
    // If no error, column exists
    return !error || error.code !== '42703'
  } catch (error: any) {
    // If error code is 42703, column doesn't exist
    return error?.code !== '42703'
  }
}

/**
 * Generate a cluster key for display purposes if database doesn't have cluster_key column
 */
export function generateDisplayClusterKey(clusterId: string, index: number): string {
  // For backwards compatibility, generate a display key based on index
  return `CLSTR-${index + 1}`
}

/**
 * Get clusters with optional cluster_key field (backwards compatible)
 */
export async function getClustersWithOptionalKey(userId: string, filters?: {
  cluster_type?: string
  status?: string
  limit?: number
  offset?: number
}) {
  const hasClusterKey = await hasClusterKeyColumn()
  
  const baseFields = `
    id,
    name,
    description,
    cluster_type,
    region,
    status,
    clickhouse_cluster_id,
    connection_string,
    node_count,
    cpu_per_node,
    memory_per_node,
    storage_per_node,
    hot_tier_size,
    warm_tier_size,
    cold_tier_size,
    archive_enabled,
    hot_retention_days,
    warm_retention_days,
    cold_retention_days,
    created_by,
    created_at,
    updated_at,
    health_status,
    estimated_monthly_cost,
    actual_monthly_cost
  `
  
  const fields = hasClusterKey ? `${baseFields}, cluster_key` : baseFields
  
  let query = dbOperations.supabaseAdmin
    .from('database_clusters')
    .select(fields)
    .eq('created_by', userId)

  if (filters?.cluster_type) {
    query = query.eq('cluster_type', filters.cluster_type)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
  }

  const result = await query.order('created_at', { ascending: false })
  
  if (result.data && !hasClusterKey) {
    // Add generated cluster keys for display
    result.data = result.data.map((cluster: any, index: number) => ({
      ...cluster,
      cluster_key: generateDisplayClusterKey(cluster.id, index)
    }))
  }
  
  return result
}

/**
 * Get clusters with assignments with optional cluster_key field (backwards compatible)
 */
export async function getClustersWithAssignmentsOptionalKey() {
  const hasClusterKey = await hasClusterKeyColumn()
  
  const baseFields = `
    id,
    name,
    cluster_type,
    status,
    created_at
  `
  
  const fields = hasClusterKey ? `${baseFields}, cluster_key` : baseFields
  
  try {
    console.log('ClusterAdminOperations: Starting getAllClustersWithAssignments');
    
    // First, try to get basic cluster data from the standard database_clusters table
    const { data: clusters, error } = await dbOperations.supabaseAdmin
      .from('database_clusters')
      .select(fields)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching basic clusters:', error);
      throw error;
    }
    
    console.log('ClusterAdminOperations: Retrieved basic clusters:', clusters?.length || 0);

    // Get assignments for each cluster (with fallback if enhanced tables don't exist)
    const clustersWithAssignments = await Promise.all(
      clusters.map(async (cluster: any, index: number) => {
        let assignments = [];
        
        try {
          console.log(`ClusterAdminOperations: Fetching assignments for cluster ${cluster.id} (name: ${cluster.name})`);
          
          // Try to get assignments from enhanced cluster management tables
          const { data: assignmentData, error: assignmentError } = await dbOperations.supabaseAdmin
            .from('cluster_user_assignments')
            .select(`
              id,
              cluster_id,
              user_id,
              assigned_by,
              access_level,
              assigned_at,
              expires_at,
              is_active,
              access_notes,
              user_email,
              user_name
            `)
            .eq('cluster_id', cluster.id)
            .eq('is_active', true);

          if (assignmentError) {
            console.log(`ClusterAdminOperations: Error fetching assignments for cluster ${cluster.id}:`, assignmentError);
            throw assignmentError;
          }
          
          console.log(`ClusterAdminOperations: Raw assignment data for cluster ${cluster.id}:`, assignmentData);
            
          // Transform assignments to match expected frontend structure
          assignments = (assignmentData || []).map((assignment: any) => ({
            ...assignment,
            users: {
              email: assignment.user_email,
              raw_user_meta_data: {
                full_name: assignment.user_name
              }
            }
          }));
          console.log(`ClusterAdminOperations: Found ${assignments.length} assignments for cluster ${cluster.id}`);
        } catch (error) {
          // Enhanced cluster management tables don't exist yet
          console.log(`ClusterAdminOperations: Enhanced cluster management tables not available for cluster ${cluster.id}, using basic cluster data:`, error);
          assignments = [];
        }

        return {
          ...cluster,
          cluster_key: cluster.cluster_key || generateDisplayClusterKey(cluster.id, index),
          cluster_name: cluster.name,
          owner_email: null, // Will be populated when enhanced features are available
          assigned_users: assignments || []
        };
      })
    );

    console.log('ClusterAdminOperations: Successfully processed all clusters, returning data');
    return clustersWithAssignments;
  } catch (error) {
    console.error('ClusterAdminOperations: Error fetching clusters with assignments:', error);
    console.error('ClusterAdminOperations: Error details:', {
      message: error?.message,
      code: error?.code,
      details: error?.details
    });
    throw error;
  }
}
