import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

// Create a direct Supabase client with service role key
// This bypasses all the cookies() issues and works directly with the database
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
})

// Alternative database operations that don't rely on SSR
export const dbOperations = {
  // Expose the admin client for direct queries when needed
  supabaseAdmin,
  async getClusters(userId: string, filters?: {
    cluster_type?: string
    status?: string
    limit?: number
    offset?: number
  }) {
    let query = supabaseAdmin
      .from('database_clusters')
      .select(`
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
      `)
      .eq('created_by', userId)

    if (filters?.cluster_type) {
      query = query.eq('cluster_type', filters.cluster_type)
    }
    
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(filters?.limit || 50)

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    return query
  },

  async createCluster(clusterData: any) {
    return supabaseAdmin
      .from('database_clusters')
      .insert(clusterData)
      .select()
  },

  async getCluster(clusterId: string, userId: string) {
    return supabaseAdmin
      .from('database_clusters')
      .select('*')
      .eq('id', clusterId)
      .eq('created_by', userId)
      .single()
  },

  async updateCluster(clusterId: string, userId: string, updates: any) {
    // First check if user has access to this cluster
    const accessCheck = await this.getClusterById(clusterId, userId)
    if (accessCheck.error || !accessCheck.data) {
      return { data: null, error: { message: 'Access denied' } }
    }

    // Update the cluster (only by ID since we've already verified access)
    return supabaseAdmin
      .from('database_clusters')
      .update(updates)
      .eq('id', clusterId)
      .select()
      .single()
  },

  async updateClusterSystem(clusterId: string, updates: any) {
    // System-level update without user access checks (for provisioning, health checks, etc.)
    return supabaseAdmin
      .from('database_clusters')
      .update(updates)
      .eq('id', clusterId)
      .select()
      .single()
  },

  async deleteCluster(clusterId: string, userId: string) {
    return supabaseAdmin
      .from('database_clusters')
      .delete()
      .eq('id', clusterId)
      .eq('created_by', userId)
  },

  async addTeamMember(clusterId: string, memberData: any) {
    return supabaseAdmin
      .from('cluster_team_access')
      .insert({
        cluster_id: clusterId,
        ...memberData
      })
      .select()
  },

  async getClusterById(clusterId: string, userId: string) {
    // First, get the cluster if user is the creator OR has team access
    // We'll check both conditions after fetching
    const result = await supabaseAdmin
      .from('database_clusters')
      .select(`
        *,
        cluster_team_access!left(user_id, role, permissions, granted_at, granted_by),
        cluster_projects(id, name, project_type, status, created_at),
        cluster_usage_metrics(
          period_start,
          query_count,
          avg_query_duration_ms,
          total_cost
        )
      `)
      .eq('id', clusterId)
      .single()

    if (result.error) {
      return result
    }

    // Check if user has access (either creator or team member)
    const cluster = result.data
    const isCreator = cluster.created_by === userId
    const hasTeamAccess = cluster.cluster_team_access?.some((access: any) => access.user_id === userId)

    if (!isCreator && !hasTeamAccess) {
      return { data: null, error: { message: 'Access denied' } }
    }

    return result
  },

  async updateCluster(clusterId: string, userId: string, updateData: any) {
    // First check if user has access to this cluster
    const accessCheck = await this.getClusterById(clusterId, userId)
    if (accessCheck.error || !accessCheck.data) {
      return { data: null, error: { message: 'Access denied' } }
    }

    // Update the cluster (only by ID since we've already verified access)
    return supabaseAdmin
      .from('database_clusters')
      .update(updateData)
      .eq('id', clusterId)
      .select()
      .single()
  },

  async deleteClusterById(clusterId: string, userId: string) {
    // Soft delete: set status to terminated rather than hard delete
    return supabaseAdmin
      .from('database_clusters')
      .update({ 
        status: 'terminated',
        terminated_at: new Date().toISOString()
      })
      .eq('id', clusterId)
      .eq('created_by', userId) // Only creator can delete
  }
}
