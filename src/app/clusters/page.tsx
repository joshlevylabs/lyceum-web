'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import ClusterCreationWizard from '@/components/ClusterCreationWizard'
import {
  Database,
  Plus,
  Cloud,
  Desktop,
  CheckCircle,
  XCircle,
  Warning,
  Gear,
  WifiHigh,
  Eye
} from '@phosphor-icons/react'

interface Cluster {
  id: string
  cluster_key?: string
  name: string
  slug: string
  description?: string
  cluster_type: 'local' | 'cloud'
  architecture?: string
  status: 'active' | 'inactive' | 'configuring' | 'error' | 'maintenance' | 'offline'
  health_status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | 'offline'
  is_connected?: boolean
  last_heartbeat_at?: string
  provider?: string
  region?: string
  connection_config: Record<string, any>
  current_project_count: number
  max_projects: number
  storage_used_gb: number
  storage_quota_gb?: number
  last_health_check_at?: string
  created_at: string
  updated_at: string
}

export default function ClustersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (user) {
      loadClusters()
    }
  }, [user])

  // Auto-refresh clusters every 30 seconds to keep connection status current
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      loadClusters()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [user])

  const loadClusters = async () => {
    try {
      setLoading(true)
      setError(null)

      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch('/api/clusters', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load clusters')
      }

      if (data.success || data.clusters) {
        const transformedClusters = (data.clusters || []).map((c: any) => ({
          id: c.id,
          cluster_key: c.cluster_key || c.slug,
          name: c.name,
          slug: c.cluster_key || c.slug,
          description: c.description,
          cluster_type: c.architecture === 'centcom' ? 'local' : c.cluster_type || 'cloud',
          architecture: c.architecture,
          status: c.status || 'active',
          health_status: c.health_status || 'unknown',
          provider: c.provider,
          region: c.region || 'Unknown',
          connection_config: {},
          current_project_count: c.current_project_count || 0,
          max_projects: c.max_projects || 100,
          storage_used_gb: c.storage_used_gb || 0,
          storage_quota_gb: c.storage_quota_gb,
          last_health_check_at: c.last_health_check_at || c.updated_at,
          created_at: c.created_at,
          updated_at: c.updated_at
        }))

        setClusters(transformedClusters)
      } else {
        throw new Error(data.error || 'Failed to load clusters')
      }
    } catch (err: any) {
      console.error('Error loading clusters:', err)
      setError(err.message || 'Failed to load clusters')
      setClusters([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      inactive: 'bg-foreground/10 text-foreground/60 border border-foreground/20',
      offline: 'bg-foreground/10 text-foreground/60 border border-foreground/20',
      configuring: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      error: 'bg-red-500/10 text-red-400 border border-red-500/20',
      maintenance: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || statusColors.inactive}`}>
        {status}
      </span>
    )
  }

  const getHealthBadge = (health: string) => {
    const healthColors = {
      healthy: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      degraded: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      unhealthy: 'bg-red-500/10 text-red-400 border border-red-500/20',
      unknown: 'bg-foreground/10 text-foreground/60 border border-foreground/20',
      offline: 'bg-foreground/10 text-foreground/60 border border-foreground/20'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${healthColors[health as keyof typeof healthColors] || healthColors.unknown}`}>
        {health}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatStorage = (gb: number) => {
    if (gb < 1) {
      return `${(gb * 1024).toFixed(0)} MB`
    }
    return `${gb.toFixed(2)} GB`
  }

  const handleViewCluster = (clusterKey: string) => {
    router.push(`/clusters/${clusterKey}`)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-foreground sm:text-3xl sm:truncate">
              My Clusters
            </h1>
            <p className="mt-1 text-sm text-foreground/60">
              Manage your local and cloud cluster connections
            </p>
          </div>

          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Add Cluster
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card overflow-hidden p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Database className="h-6 w-6 text-cyan-400" weight="duotone" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-foreground/60 truncate">
                    Total Clusters
                  </dt>
                  <dd className="text-lg font-semibold text-foreground">
                    {clusters.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Desktop className="h-6 w-6 text-cyan-400" weight="duotone" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-foreground/60 truncate">
                    Local Clusters
                  </dt>
                  <dd className="text-lg font-semibold text-foreground">
                    {clusters.filter(c => c.cluster_type === 'local').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Cloud className="h-6 w-6 text-cyan-400" weight="duotone" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-foreground/60 truncate">
                    Cloud Clusters
                  </dt>
                  <dd className="text-lg font-semibold text-foreground">
                    {clusters.filter(c => c.cluster_type === 'cloud').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="h-6 w-6 text-emerald-400" weight="duotone" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-foreground/60 truncate">
                    Active Clusters
                  </dt>
                  <dd className="text-lg font-semibold text-foreground">
                    {clusters.filter(c => c.status === 'active').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Clusters Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-500"></div>
            <span className="ml-2 text-foreground/60">Loading clusters...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <XCircle className="mx-auto h-12 w-12 text-red-400" weight="duotone" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">Error loading clusters</h3>
            <p className="mt-1 text-sm text-foreground/60">{error}</p>
            <div className="mt-6">
              <button
                onClick={loadClusters}
                className="btn-primary inline-flex items-center"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : clusters.length === 0 ? (
          <div className="text-center py-12 glass-card">
            <Database className="mx-auto h-12 w-12 text-foreground/40" weight="duotone" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">No clusters</h3>
            <p className="mt-1 text-sm text-foreground/60">
              Get started by connecting your first cluster.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary inline-flex items-center"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Add Cluster
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-cyan-500/10">
                <thead>
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Cluster
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Cluster ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Region
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Health
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Storage
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-500/10">
                  {clusters.map((cluster) => (
                    <tr
                      key={cluster.id}
                      className="hover:bg-cyan-500/5 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 relative">
                            {cluster.cluster_type === 'local' ? (
                              <Desktop className="h-6 w-6 text-cyan-400" weight="duotone" />
                            ) : (
                              <Cloud className="h-6 w-6 text-cyan-400" weight="duotone" />
                            )}
                            {/* Connection indicator dot for local clusters */}
                            {cluster.cluster_type === 'local' && (
                              <span
                                className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-background ${
                                  cluster.is_connected
                                    ? 'bg-emerald-500 animate-pulse'
                                    : 'bg-foreground/40'
                                }`}
                                title={cluster.is_connected ? 'Connected' : 'Offline'}
                              />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {cluster.name}
                              </span>
                              {/* Connection status badge for local clusters */}
                              {cluster.cluster_type === 'local' && (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    cluster.is_connected
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-foreground/10 text-foreground/60 border border-foreground/20'
                                  }`}
                                >
                                  {cluster.is_connected ? 'Connected' : 'Offline'}
                                </span>
                              )}
                            </div>
                            {cluster.cluster_key && (
                              <div className="text-xs text-foreground/60">
                                {cluster.cluster_key}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-foreground/60 font-mono break-all max-w-[200px]">
                          {cluster.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 capitalize">
                          {cluster.cluster_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {cluster.region}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(cluster.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getHealthBadge(cluster.health_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {formatStorage(cluster.storage_used_gb)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/60">
                        {formatDate(cluster.updated_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewCluster(cluster.slug)}
                          className="p-2 rounded-lg text-foreground/50 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all inline-flex items-center"
                          title="View cluster details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Cluster Wizard */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-background flex items-center justify-center z-50 overflow-y-auto">
            <div className="w-full min-h-screen py-8 bg-background">
              <ClusterCreationWizard
                onComplete={(cluster) => {
                  setShowCreateModal(false)
                  loadClusters() // Refresh the clusters list
                  router.push(`/clusters/${cluster.slug || cluster.cluster_key}`)
                }}
                onCancel={() => setShowCreateModal(false)}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
