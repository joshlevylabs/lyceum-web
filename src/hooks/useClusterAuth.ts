'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { clusterAuthService, UserClusterAccess, ClusterAccessToken } from '@/lib/cluster-auth'

export interface UseClusterAuthOptions {
  clusterId?: string
  autoCheck?: boolean
}

export interface ClusterAuthState {
  hasAccess: boolean
  userRole: UserClusterAccess | null
  loading: boolean
  error: string | null
}

export function useClusterAuth({ clusterId, autoCheck = true }: UseClusterAuthOptions = {}) {
  const { user } = useAuth()
  const [authState, setAuthState] = useState<ClusterAuthState>({
    hasAccess: false,
    userRole: null,
    loading: true,
    error: null
  })

  // Check cluster access
  const checkAccess = async (clusterIdToCheck?: string) => {
    if (!user || (!clusterId && !clusterIdToCheck)) {
      setAuthState({
        hasAccess: false,
        userRole: null,
        loading: false,
        error: 'User not authenticated or cluster ID not provided'
      })
      return
    }

    const targetClusterId = clusterIdToCheck || clusterId!

    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const [hasAccess, userRole] = await Promise.all([
        clusterAuthService.hasClusterAccess(targetClusterId, user.id),
        clusterAuthService.getUserClusterRole(targetClusterId, user.id)
      ])

      setAuthState({
        hasAccess,
        userRole,
        loading: false,
        error: null
      })

      return { hasAccess, userRole }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check cluster access'
      setAuthState({
        hasAccess: false,
        userRole: null,
        loading: false,
        error: errorMessage
      })
      console.error('Cluster auth check failed:', error)
    }
  }

  // Auto-check on mount and when dependencies change
  useEffect(() => {
    if (autoCheck && user && clusterId) {
      checkAccess()
    }
  }, [user?.id, clusterId, autoCheck])

  // Permission checkers
  const hasPermission = (permission: keyof UserClusterAccess['permissions']): boolean => {
    return authState.userRole?.permissions?.[permission] || false
  }

  const canManageCluster = (): boolean => hasPermission('cluster_management')
  const canReadData = (): boolean => hasPermission('data_read')
  const canWriteData = (): boolean => hasPermission('data_write')
  const canModifySchema = (): boolean => hasPermission('schema_modify')
  const canManageUsers = (): boolean => hasPermission('user_management')
  const canAccessBilling = (): boolean => hasPermission('billing_access')

  const isAdmin = (): boolean => authState.userRole?.role === 'admin'
  const isEditor = (): boolean => authState.userRole?.role === 'editor'
  const isAnalyst = (): boolean => authState.userRole?.role === 'analyst'
  const isViewer = (): boolean => authState.userRole?.role === 'viewer'

  return {
    ...authState,
    checkAccess,
    hasPermission,
    canManageCluster,
    canReadData,
    canWriteData,
    canModifySchema,
    canManageUsers,
    canAccessBilling,
    isAdmin,
    isEditor,
    isAnalyst,
    isViewer
  }
}

export interface UseClusterTokensOptions {
  clusterId?: string
  autoLoad?: boolean
}

export function useClusterTokens({ clusterId, autoLoad = true }: UseClusterTokensOptions = {}) {
  const { user } = useAuth()
  const [tokens, setTokens] = useState<ClusterAccessToken[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTokens = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)
      const userTokens = await clusterAuthService.getUserClusterTokens(user.id, clusterId)
      setTokens(userTokens)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tokens'
      setError(errorMessage)
      console.error('Failed to load cluster tokens:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateToken = async (
    clusterIdForToken: string,
    tokenName: string,
    accessType: 'readonly' | 'readwrite' | 'admin',
    expiresInHours?: number
  ) => {
    if (!user) throw new Error('User not authenticated')

    try {
      setError(null)
      const result = await clusterAuthService.generateClusterAccessToken(
        clusterIdForToken,
        user.id,
        tokenName,
        accessType,
        expiresInHours
      )

      if (result) {
        setTokens(prev => [result.tokenRecord, ...prev])
        return result
      } else {
        throw new Error('Failed to generate token')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate token'
      setError(errorMessage)
      throw err
    }
  }

  const revokeToken = async (tokenId: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      setError(null)
      const success = await clusterAuthService.revokeClusterAccessToken(tokenId, user.id)
      
      if (success) {
        setTokens(prev => prev.filter(token => token.id !== tokenId))
      } else {
        throw new Error('Failed to revoke token')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke token'
      setError(errorMessage)
      throw err
    }
  }

  useEffect(() => {
    if (autoLoad && user) {
      loadTokens()
    }
  }, [user?.id, clusterId, autoLoad])

  return {
    tokens,
    loading,
    error,
    loadTokens,
    generateToken,
    revokeToken
  }
}

export interface UseClusterTeamOptions {
  clusterId: string
  autoLoad?: boolean
}

export function useClusterTeam({ clusterId, autoLoad = true }: UseClusterTeamOptions) {
  const { user } = useAuth()
  const [teamMembers, setTeamMembers] = useState<UserClusterAccess[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTeamMembers = async () => {
    // This would typically fetch from an API endpoint
    // For now, we'll simulate the data structure
    setLoading(true)
    try {
      // In a real implementation:
      // const response = await fetch(`/api/clusters/${clusterId}/members`)
      // const data = await response.json()
      // setTeamMembers(data.members)
      
      setTeamMembers([]) // Placeholder
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load team members'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const addTeamMember = async (
    targetUserId: string,
    role: 'admin' | 'editor' | 'analyst' | 'viewer'
  ) => {
    if (!user) throw new Error('User not authenticated')

    try {
      setError(null)
      const success = await clusterAuthService.addUserToCluster(
        clusterId,
        targetUserId,
        role,
        user.id
      )

      if (success) {
        await loadTeamMembers() // Refresh the list
      } else {
        throw new Error('Failed to add team member')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add team member'
      setError(errorMessage)
      throw err
    }
  }

  const removeTeamMember = async (targetUserId: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      setError(null)
      const success = await clusterAuthService.removeUserFromCluster(
        clusterId,
        targetUserId,
        user.id
      )

      if (success) {
        await loadTeamMembers() // Refresh the list
      } else {
        throw new Error('Failed to remove team member')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove team member'
      setError(errorMessage)
      throw err
    }
  }

  const updateMemberRole = async (
    targetUserId: string,
    newRole: 'admin' | 'editor' | 'analyst' | 'viewer'
  ) => {
    if (!user) throw new Error('User not authenticated')

    try {
      setError(null)
      const success = await clusterAuthService.updateUserClusterRole(
        clusterId,
        targetUserId,
        newRole,
        user.id
      )

      if (success) {
        await loadTeamMembers() // Refresh the list
      } else {
        throw new Error('Failed to update member role')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update member role'
      setError(errorMessage)
      throw err
    }
  }

  useEffect(() => {
    if (autoLoad && clusterId) {
      loadTeamMembers()
    }
  }, [clusterId, autoLoad])

  return {
    teamMembers,
    loading,
    error,
    loadTeamMembers,
    addTeamMember,
    removeTeamMember,
    updateMemberRole
  }
}
