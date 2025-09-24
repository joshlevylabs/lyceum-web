import { dbOperations } from './supabase-direct';

export interface ClusterAssignment {
  id: string;
  cluster_id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  assigned_by: string;
  access_level: 'owner' | 'admin' | 'editor' | 'analyst' | 'viewer';
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
  access_notes?: string;
}

export interface ClusterPricingHistory {
  id: string;
  cluster_id: string;
  previous_pricing_model?: string;
  new_pricing_model: string;
  previous_price?: number;
  new_price?: number;
  changed_by: string;
  change_reason?: string;
  effective_date: string;
}

export interface ClusterWithAssignments {
  id: string;
  cluster_name: string;
  cluster_type: string;
  pricing_model: 'free' | 'trial' | 'paid' | 'subscription';
  cluster_price_monthly?: number;
  trial_start_date?: string;
  trial_end_date?: string;
  cluster_status: 'active' | 'trial' | 'expired' | 'suspended' | 'archived';
  max_assigned_users: number;
  owner_id: string;
  owner_email?: string;
  assigned_users: ClusterAssignment[];
  pricing_history?: ClusterPricingHistory[];
}

export interface UserAccessibleCluster {
  cluster_id: string;
  cluster_name: string;
  cluster_type: string;
  access_level: string;
  pricing_model: string;
  cluster_price_monthly?: number;
  cluster_status: string;
  trial_end_date?: string;
  expires_at?: string;
}

export class ClusterAdminOperations {
  /**
   * Get all clusters with their user assignments (Admin only)
   */
  async getAllClustersWithAssignments(): Promise<ClusterWithAssignments[]> {
    try {
      // Use backwards-compatible utility function
      const { getClustersWithAssignmentsOptionalKey } = await import('@/lib/cluster-utils')
      return await getClustersWithAssignmentsOptionalKey()
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

  /**
   * Assign a user to a cluster
   */
  async assignUserToCluster({
    clusterId,
    userEmail,
    assignedBy,
    accessLevel = 'user',
    expiresAt,
    accessNotes
  }: {
    clusterId: string;
    userEmail: string;
    assignedBy: string;
    accessLevel?: 'admin' | 'editor' | 'analyst' | 'viewer';
    expiresAt?: string;
    accessNotes?: string;
  }): Promise<ClusterAssignment> {
    try {
      // First, find the user by email
      const { data: user, error: userError } = await dbOperations.supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError || !user) {
        throw new Error(`User with email ${userEmail} not found`);
      }

      // Check cluster capacity
      const { data: cluster } = await dbOperations.supabaseAdmin
        .from('database_clusters')
        .select('max_assigned_users')
        .eq('id', clusterId)
        .single();

      const { data: currentAssignments } = await dbOperations.supabaseAdmin
        .from('cluster_user_assignments')
        .select('id')
        .eq('cluster_id', clusterId)
        .eq('is_active', true);

      if (currentAssignments && cluster && currentAssignments.length >= cluster.max_assigned_users) {
        throw new Error(`Cluster has reached maximum user limit of ${cluster.max_assigned_users}`);
      }

      // Check if user is already assigned to this cluster
      const { data: existingAssignment } = await dbOperations.supabaseAdmin
        .from('cluster_user_assignments')
        .select('id, is_active')
        .eq('cluster_id', clusterId)
        .eq('user_id', user.id)
        .single();

      if (existingAssignment) {
        if (existingAssignment.is_active) {
          throw new Error('User is already assigned to this cluster');
        } else {
          // Reactivate existing assignment
          const { data: assignment, error: updateError } = await dbOperations.supabaseAdmin
            .from('cluster_user_assignments')
            .update({
              access_level: accessLevel,
              assigned_by: assignedBy,
              expires_at: expiresAt || null,
              access_notes: accessNotes || null,
              is_active: true,
              assigned_at: new Date().toISOString()
            })
            .eq('id', existingAssignment.id)
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
            .single();

          if (updateError) throw updateError;
          return assignment;
        }
      }

      // Create new assignment
      console.log(`Creating assignment - clusterId: ${clusterId}, userEmail: ${userEmail}, user.id: ${user.id}`);
      
      const { data: assignment, error: insertError } = await dbOperations.supabaseAdmin
        .from('cluster_user_assignments')
        .insert({
          cluster_id: clusterId,
          user_id: user.id,
          assigned_by: assignedBy,
          access_level: accessLevel,
          expires_at: expiresAt || null,
          access_notes: accessNotes || null,
          is_active: true,
          assigned_at: new Date().toISOString()
        })
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
        .single();

      if (insertError) {
        console.error(`Assignment creation failed:`, insertError);
        throw insertError;
      }
      
      console.log(`Assignment created successfully:`, {
        id: assignment?.id,
        cluster_id: assignment?.cluster_id,
        user_email: assignment?.user_email,
        access_level: assignment?.access_level
      });

      return {
        ...assignment,
        user_email: userEmail
      };
    } catch (error) {
      console.error('Error assigning user to cluster:', error);
      
      // Check if it's a table doesn't exist error
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'PGRST106' || error.code === '42P01') {
          throw new Error('Cluster user assignment feature is not yet available. Please run the enhanced cluster management migration first.');
        }
      }
      
      // Re-throw the original error message if it's more specific
      if (error && typeof error === 'object' && 'message' in error) {
        throw new Error(error.message);
      }
      
      throw new Error('Failed to assign user to cluster');
    }
  }

  /**
   * Remove user assignment from cluster
   */
  async removeUserFromCluster(clusterId: string, userId: string): Promise<void> {
    try {
      const { error } = await dbOperations.supabaseAdmin
        .from('cluster_user_assignments')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('cluster_id', clusterId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing user from cluster:', error);
      throw error;
    }
  }

  /**
   * Update cluster pricing
   */
  async updateClusterPricing({
    clusterId,
    pricingModel,
    price,
    changedBy,
    reason
  }: {
    clusterId: string;
    pricingModel: 'free' | 'trial' | 'paid' | 'subscription';
    price?: number;
    changedBy: string;
    reason?: string;
  }): Promise<void> {
    try {
      const { error } = await dbOperations.supabaseAdmin
        .rpc('update_cluster_pricing', {
          p_cluster_id: clusterId,
          p_pricing_model: pricingModel,
          p_price: price || null,
          p_changed_by: changedBy,
          p_reason: reason || null
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating cluster pricing:', error);
      throw error;
    }
  }

  /**
   * Extend cluster trial period
   */
  async extendClusterTrial({
    clusterId,
    extendedBy,
    extensionDays,
    reason
  }: {
    clusterId: string;
    extendedBy: string;
    extensionDays: number;
    reason?: string;
  }): Promise<string> {
    try {
      const { data, error } = await dbOperations.supabaseAdmin
        .rpc('extend_cluster_trial', {
          p_cluster_id: clusterId,
          p_extended_by: extendedBy,
          p_extension_days: extensionDays,
          p_reason: reason || null
        });

      if (error) throw error;
      return data; // Returns new trial end date
    } catch (error) {
      console.error('Error extending cluster trial:', error);
      throw error;
    }
  }

  /**
   * Get cluster pricing history
   */
  async getClusterPricingHistory(clusterId: string): Promise<ClusterPricingHistory[]> {
    try {
      const { data, error } = await dbOperations.supabaseAdmin
        .from('cluster_pricing_history')
        .select(`
          id,
          cluster_id,
          previous_pricing_model,
          new_pricing_model,
          previous_price,
          new_price,
          changed_by,
          change_reason,
          effective_date
        `)
        .eq('cluster_id', clusterId)
        .order('effective_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pricing history:', error);
      throw error;
    }
  }

  /**
   * Check if user has access to cluster
   */
  async checkClusterAccess(clusterId: string, userId: string): Promise<{
    hasAccess: boolean;
    accessLevel: string;
    expiresAt?: string;
    clusterStatus: string;
    pricingModel: string;
  }> {
    try {
      const { data, error } = await dbOperations.supabaseAdmin
        .rpc('check_cluster_access', {
          p_cluster_id: clusterId,
          p_user_id: userId
        });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      return {
        hasAccess: result.has_access,
        accessLevel: result.access_level,
        expiresAt: result.expires_at,
        clusterStatus: result.cluster_status,
        pricingModel: result.pricing_model
      };
    } catch (error) {
      console.error('Error checking cluster access:', error);
      throw error;
    }
  }

  /**
   * Get user's accessible clusters
   */
  async getUserAccessibleClusters(userId: string): Promise<UserAccessibleCluster[]> {
    try {
      const { data, error } = await dbOperations.supabaseAdmin
        .rpc('get_user_accessible_clusters', {
          p_user_id: userId
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user accessible clusters:', error);
      throw error;
    }
  }

  /**
   * Update cluster capacity
   */
  async updateClusterCapacity(clusterId: string, maxUsers: number): Promise<void> {
    try {
      const { error } = await dbOperations.supabaseAdmin
        .from('database_clusters')
        .update({ 
          max_assigned_users: maxUsers,
          updated_at: new Date().toISOString()
        })
        .eq('id', clusterId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating cluster capacity:', error);
      throw error;
    }
  }

  /**
   * Get cluster statistics for admin dashboard
   */
  async getClusterStatistics(): Promise<{
    totalClusters: number;
    activeClusters: number;
    trialClusters: number;
    expiredClusters: number;
    freeClusters: number;
    paidClusters: number;
    totalAssignedUsers: number;
  }> {
    try {
      const { data: clusters, error } = await dbOperations.supabaseAdmin
        .from('database_clusters')
        .select('cluster_status, pricing_model');

      if (error) throw error;

      const { data: assignments, error: assignmentError } = await dbOperations.supabaseAdmin
        .from('cluster_user_assignments')
        .select('id')
        .eq('is_active', true);

      if (assignmentError) throw assignmentError;

      const stats = {
        totalClusters: clusters.length,
        activeClusters: clusters.filter(c => c.cluster_status === 'active').length,
        trialClusters: clusters.filter(c => c.cluster_status === 'trial').length,
        expiredClusters: clusters.filter(c => c.cluster_status === 'expired').length,
        freeClusters: clusters.filter(c => c.pricing_model === 'free').length,
        paidClusters: clusters.filter(c => c.pricing_model === 'paid').length,
        totalAssignedUsers: assignments.length
      };

      return stats;
    } catch (error) {
      console.error('Error fetching cluster statistics:', error);
      throw error;
    }
  }
}

export const clusterAdminOperations = new ClusterAdminOperations();
