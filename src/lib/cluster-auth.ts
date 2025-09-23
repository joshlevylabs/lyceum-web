'use client'

import { createClient } from '@/lib/supabase'

export interface ClusterRole {
  cluster_management: boolean
  data_read: boolean
  data_write: boolean
  schema_modify: boolean
  user_management: boolean
  billing_access: boolean
}

export interface ClusterAccessToken {
  id: string
  cluster_id: string
  user_id: string
  token_name: string
  access_type: 'readonly' | 'readwrite' | 'admin'
  expires_at: string | null
  last_used: string | null
  created_at: string
  permissions: ClusterRole
}

export interface UserClusterAccess {
  user_id: string
  cluster_id: string
  role: 'admin' | 'editor' | 'analyst' | 'viewer'
  permissions: ClusterRole
  granted_by: string
  granted_at: string
}

export class ClusterAuthService {
  private supabase = createClient()

  /**
   * Check if user has access to a specific cluster
   */
  async hasClusterAccess(clusterId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('cluster_team_access')
        .select('user_id')
        .eq('cluster_id', clusterId)
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error checking cluster access:', error)
        return false
      }

      // Also check if user is the cluster owner
      if (!data) {
        const { data: cluster, error: clusterError } = await this.supabase
          .from('database_clusters')
          .select('created_by')
          .eq('id', clusterId)
          .eq('created_by', userId)
          .single()

        if (clusterError && clusterError.code !== 'PGRST116') {
          console.error('Error checking cluster ownership:', clusterError)
          return false
        }

        return !!cluster
      }

      return !!data
    } catch (error) {
      console.error('Cluster access check failed:', error)
      return false
    }
  }

  /**
   * Get user's role and permissions for a cluster
   */
  async getUserClusterRole(clusterId: string, userId: string): Promise<UserClusterAccess | null> {
    try {
      // First check team access
      const { data: teamAccess, error } = await this.supabase
        .from('cluster_team_access')
        .select('*')
        .eq('cluster_id', clusterId)
        .eq('user_id', userId)
        .single()

      if (teamAccess) {
        return teamAccess
      }

      // Check if user is the cluster owner (admin by default)
      const { data: cluster, error: clusterError } = await this.supabase
        .from('database_clusters')
        .select('created_by, created_at')
        .eq('id', clusterId)
        .eq('created_by', userId)
        .single()

      if (cluster) {
        return {
          user_id: userId,
          cluster_id: clusterId,
          role: 'admin',
          permissions: {
            cluster_management: true,
            data_read: true,
            data_write: true,
            schema_modify: true,
            user_management: true,
            billing_access: true
          },
          granted_by: userId, // Self-granted as owner
          granted_at: cluster.created_at
        }
      }

      return null
    } catch (error) {
      console.error('Error getting user cluster role:', error)
      return null
    }
  }

  /**
   * Generate a temporary access token for cluster access
   */
  async generateClusterAccessToken(
    clusterId: string, 
    userId: string, 
    tokenName: string,
    accessType: 'readonly' | 'readwrite' | 'admin',
    expiresInHours?: number
  ): Promise<{ token: string; tokenRecord: ClusterAccessToken } | null> {
    try {
      // Check if user has permission to generate tokens
      const userRole = await this.getUserClusterRole(clusterId, userId)
      if (!userRole || (userRole.role !== 'admin' && !userRole.permissions.user_management)) {
        throw new Error('Insufficient permissions to generate access tokens')
      }

      // Calculate expiration
      const expiresAt = expiresInHours 
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
        : null

      // Generate token
      const token = this.generateSecureToken()

      // Define permissions based on access type
      const permissions: ClusterRole = {
        cluster_management: accessType === 'admin',
        data_read: true,
        data_write: accessType !== 'readonly',
        schema_modify: accessType === 'admin',
        user_management: accessType === 'admin',
        billing_access: accessType === 'admin'
      }

      // Store token in database
      const tokenRecord: Omit<ClusterAccessToken, 'id' | 'created_at'> = {
        cluster_id: clusterId,
        user_id: userId,
        token_name: tokenName,
        access_type: accessType,
        expires_at: expiresAt,
        last_used: null,
        permissions
      }

      const { data, error } = await this.supabase
        .from('cluster_access_tokens')
        .insert(tokenRecord)
        .select()
        .single()

      if (error) {
        throw error
      }

      return {
        token,
        tokenRecord: data
      }
    } catch (error) {
      console.error('Error generating cluster access token:', error)
      return null
    }
  }

  /**
   * Validate and decode a cluster access token
   */
  async validateClusterAccessToken(token: string): Promise<ClusterAccessToken | null> {
    try {
      // In a production system, this would decrypt/verify the token
      // For now, we'll look up by a hashed version
      const tokenHash = await this.hashToken(token)

      const { data, error } = await this.supabase
        .from('cluster_access_tokens')
        .select('*')
        .eq('token_hash', tokenHash)
        .single()

      if (error || !data) {
        return null
      }

      // Check if token is expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return null
      }

      // Update last used timestamp
      await this.supabase
        .from('cluster_access_tokens')
        .update({ last_used: new Date().toISOString() })
        .eq('id', data.id)

      return data
    } catch (error) {
      console.error('Error validating cluster access token:', error)
      return null
    }
  }

  /**
   * Revoke a cluster access token
   */
  async revokeClusterAccessToken(tokenId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('cluster_access_tokens')
        .delete()
        .eq('id', tokenId)
        .eq('user_id', userId)

      return !error
    } catch (error) {
      console.error('Error revoking cluster access token:', error)
      return false
    }
  }

  /**
   * Get all access tokens for a user
   */
  async getUserClusterTokens(userId: string, clusterId?: string): Promise<ClusterAccessToken[]> {
    try {
      let query = this.supabase
        .from('cluster_access_tokens')
        .select(`
          *,
          database_clusters(name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (clusterId) {
        query = query.eq('cluster_id', clusterId)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error getting user cluster tokens:', error)
      return []
    }
  }

  /**
   * Add a user to a cluster team
   */
  async addUserToCluster(
    clusterId: string,
    targetUserId: string,
    role: 'admin' | 'editor' | 'analyst' | 'viewer',
    grantedByUserId: string
  ): Promise<boolean> {
    try {
      // Check if granting user has permission
      const granterRole = await this.getUserClusterRole(clusterId, grantedByUserId)
      if (!granterRole || (granterRole.role !== 'admin' && !granterRole.permissions.user_management)) {
        throw new Error('Insufficient permissions to add users to cluster')
      }

      // Define permissions based on role
      const permissions: ClusterRole = this.getRolePermissions(role)

      const { error } = await this.supabase
        .from('cluster_team_access')
        .insert({
          cluster_id: clusterId,
          user_id: targetUserId,
          role,
          permissions,
          granted_by: grantedByUserId,
          granted_at: new Date().toISOString()
        })

      return !error
    } catch (error) {
      console.error('Error adding user to cluster:', error)
      return false
    }
  }

  /**
   * Remove a user from a cluster team
   */
  async removeUserFromCluster(
    clusterId: string,
    targetUserId: string,
    removedByUserId: string
  ): Promise<boolean> {
    try {
      // Check if removing user has permission
      const removerRole = await this.getUserClusterRole(clusterId, removedByUserId)
      if (!removerRole || (removerRole.role !== 'admin' && !removerRole.permissions.user_management)) {
        throw new Error('Insufficient permissions to remove users from cluster')
      }

      // Cannot remove cluster owner
      const { data: cluster } = await this.supabase
        .from('database_clusters')
        .select('created_by')
        .eq('id', clusterId)
        .single()

      if (cluster?.created_by === targetUserId) {
        throw new Error('Cannot remove cluster owner')
      }

      const { error } = await this.supabase
        .from('cluster_team_access')
        .delete()
        .eq('cluster_id', clusterId)
        .eq('user_id', targetUserId)

      return !error
    } catch (error) {
      console.error('Error removing user from cluster:', error)
      return false
    }
  }

  /**
   * Update user role in cluster
   */
  async updateUserClusterRole(
    clusterId: string,
    targetUserId: string,
    newRole: 'admin' | 'editor' | 'analyst' | 'viewer',
    updatedByUserId: string
  ): Promise<boolean> {
    try {
      // Check permissions
      const updaterRole = await this.getUserClusterRole(clusterId, updatedByUserId)
      if (!updaterRole || (updaterRole.role !== 'admin' && !updaterRole.permissions.user_management)) {
        throw new Error('Insufficient permissions to update user roles')
      }

      const permissions = this.getRolePermissions(newRole)

      const { error } = await this.supabase
        .from('cluster_team_access')
        .update({
          role: newRole,
          permissions,
          granted_by: updatedByUserId,
          granted_at: new Date().toISOString()
        })
        .eq('cluster_id', clusterId)
        .eq('user_id', targetUserId)

      return !error
    } catch (error) {
      console.error('Error updating user cluster role:', error)
      return false
    }
  }

  /**
   * Get role permissions mapping
   */
  private getRolePermissions(role: 'admin' | 'editor' | 'analyst' | 'viewer'): ClusterRole {
    const rolePermissions: Record<string, ClusterRole> = {
      admin: {
        cluster_management: true,
        data_read: true,
        data_write: true,
        schema_modify: true,
        user_management: true,
        billing_access: true
      },
      editor: {
        cluster_management: false,
        data_read: true,
        data_write: true,
        schema_modify: true,
        user_management: false,
        billing_access: false
      },
      analyst: {
        cluster_management: false,
        data_read: true,
        data_write: false,
        schema_modify: false,
        user_management: false,
        billing_access: false
      },
      viewer: {
        cluster_management: false,
        data_read: true,
        data_write: false,
        schema_modify: false,
        user_management: false,
        billing_access: false
      }
    }

    return rolePermissions[role] || rolePermissions.viewer
  }

  /**
   * Generate a secure random token
   */
  private generateSecureToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Hash a token for storage
   */
  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('')
  }
}

// Singleton instance
export const clusterAuthService = new ClusterAuthService()
