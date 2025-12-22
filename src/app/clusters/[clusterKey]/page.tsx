'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  Database,
  Desktop,
  Cloud,
  CheckCircle,
  XCircle,
  Warning,
  ChartBar,
  Cpu,
  Stack,
  Clock,
  Gear,
  ArrowLeft
} from '@phosphor-icons/react'

interface ProjectMetadata {
  project_id: string
  project_name: string
  created_at: string
  last_updated_at: string
  measurement_count: number
  table_names: string[]
}

interface ClusterDetails {
  id: string
  cluster_key?: string
  name: string
  slug: string
  description?: string
  cluster_type: 'local' | 'cloud'
  architecture?: string
  status: string
  health_status: string
  is_connected?: boolean
  last_error?: string
  projects_metadata?: ProjectMetadata[]
  tier?: string
  region?: string
  storage_used_gb: number
  queries_this_month?: number
  clickhouse_version?: string
  machine_os?: string
  machine_memory_gb?: number
  machine_cpu_cores?: number
  machine_fingerprint?: string
  last_heartbeat_at?: string
  max_storage_gb?: number
  max_monthly_queries?: number
  offline_grace_days?: number
  estimated_monthly_cost?: number
  pricing_model?: string
  created_at: string
  updated_at: string
  user_role: string
}

export default function ClusterDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [cluster, setCluster] = useState<ClusterDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview')

  useEffect(() => {
    if (user && params.clusterKey) {
      loadClusterDetails()
    }
  }, [params.clusterKey, user])

  // Auto-refresh cluster details every 30 seconds to keep connection status current
  useEffect(() => {
    if (!user || !params.clusterKey) return

    const interval = setInterval(() => {
      loadClusterDetails()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [user, params.clusterKey])

  const loadClusterDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Authentication required')
      }

      console.log('Fetching cluster by key:', params.clusterKey)
      const response = await fetch(`/api/clusters/by-key/${params.clusterKey}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()
      console.log('Cluster API response:', { ok: response.ok, data })

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load cluster details')
      }

      if (data.success && data.cluster) {
        console.log('Cluster loaded successfully:', data.cluster.cluster_key)
        setCluster(data.cluster)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err: any) {
      console.error('Error loading cluster details:', err)
      setError(err.message || 'Failed to load cluster details')
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = cluster?.user_role === 'owner' || cluster?.user_role === 'admin'

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
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[status as keyof typeof statusColors] || statusColors.inactive}`}>
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
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${healthColors[health as keyof typeof healthColors] || healthColors.unknown}`}>
        {health}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatStorage = (gb: number) => {
    if (gb < 1) {
      return `${(gb * 1024).toFixed(0)} MB`
    }
    return `${gb.toFixed(2)} GB`
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-500"></div>
          <span className="ml-2 text-foreground/60">Loading cluster details...</span>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !cluster) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <XCircle className="mx-auto h-12 w-12 text-red-400" weight="duotone" />
          <h3 className="mt-2 text-sm font-semibold text-foreground">Error loading cluster</h3>
          <p className="mt-1 text-sm text-foreground/60">{error}</p>
          <div className="mt-6 space-x-3">
            <button
              onClick={() => router.push('/clusters')}
              className="btn-ghost inline-flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clusters
            </button>
            <button
              onClick={loadClusterDetails}
              className="btn-primary inline-flex items-center"
            >
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => router.push('/clusters')}
              className="inline-flex items-center text-sm text-foreground/60 hover:text-cyan-400 mb-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Clusters
            </button>
            <div className="flex items-center space-x-3">
              <div className="relative">
                {cluster.cluster_type === 'local' ? (
                  <Desktop className="h-8 w-8 text-cyan-400" weight="duotone" />
                ) : (
                  <Cloud className="h-8 w-8 text-cyan-400" weight="duotone" />
                )}
                {/* Connection indicator dot for local clusters */}
                {cluster.cluster_type === 'local' && (
                  <span
                    className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${
                      cluster.is_connected
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-foreground/40'
                    }`}
                    title={cluster.is_connected ? 'Connected' : 'Offline'}
                  />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold leading-7 text-foreground sm:text-3xl sm:truncate">
                    {cluster.name}
                  </h1>
                  {/* Connection status badge for local clusters */}
                  {cluster.cluster_type === 'local' && (
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                        cluster.is_connected
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-foreground/10 text-foreground/60 border border-foreground/20'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${cluster.is_connected ? 'bg-emerald-500' : 'bg-foreground/40'}`} />
                      {cluster.is_connected ? 'Connected' : 'Offline'}
                    </span>
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  {cluster.cluster_key && (
                    <p className="text-sm text-foreground/60">
                      Key: <span className="font-medium">{cluster.cluster_key}</span>
                    </p>
                  )}
                  <p className="text-xs text-foreground/60 font-mono">
                    ID: {cluster.id}
                  </p>
                  {cluster.cluster_type === 'local' && cluster.last_heartbeat_at && (
                    <p className="text-xs text-foreground/60">
                      Last seen: {new Date(cluster.last_heartbeat_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <button
                onClick={() => setActiveTab('settings')}
                className="btn-primary inline-flex items-center"
              >
                <Gear className="h-5 w-5 mr-2" />
                Configure
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <nav className="flex space-x-8 border-b border-cyan-500/10">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-foreground/50 hover:border-cyan-500/30 hover:text-cyan-400'
            } flex whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium items-center transition-colors`}
          >
            Overview
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`${
                activeTab === 'settings'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-foreground/50 hover:border-cyan-500/30 hover:text-cyan-400'
              } flex whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium items-center transition-colors`}
            >
              Settings
            </button>
          )}
        </nav>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="glass-card overflow-hidden p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <CheckCircle className="h-6 w-6 text-cyan-400" weight="duotone" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-foreground/60 truncate">
                        Status
                      </dt>
                      <dd className="mt-1">
                        {getStatusBadge(cluster.status)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="glass-card overflow-hidden p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <Warning className="h-6 w-6 text-cyan-400" weight="duotone" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-foreground/60 truncate">
                        Health
                      </dt>
                      <dd className="mt-1">
                        {getHealthBadge(cluster.health_status)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="glass-card overflow-hidden p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <Stack className="h-6 w-6 text-cyan-400" weight="duotone" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-foreground/60 truncate">
                        Storage Used
                      </dt>
                      <dd className="text-lg font-semibold text-foreground">
                        {formatStorage(cluster.storage_used_gb)}
                        {cluster.max_storage_gb && cluster.max_storage_gb > 0 && (
                          <span className="text-sm font-normal text-foreground/60">
                            {' '}/ {formatStorage(cluster.max_storage_gb)}
                          </span>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Cluster Information */}
            <div className="glass-card overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-cyan-500/10">
                <h3 className="text-lg leading-6 font-medium text-foreground">
                  Cluster Information
                </h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-foreground/60">Cluster ID</dt>
                    <dd className="mt-1 text-sm text-foreground font-mono break-all">{cluster.id}</dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-foreground/60">Cluster Type</dt>
                    <dd className="mt-1 text-sm text-foreground capitalize">{cluster.cluster_type}</dd>
                  </div>

                  {cluster.architecture && (
                    <div>
                      <dt className="text-sm font-medium text-foreground/60">Architecture</dt>
                      <dd className="mt-1 text-sm text-foreground capitalize">{cluster.architecture}</dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-sm font-medium text-foreground/60">Region</dt>
                    <dd className="mt-1 text-sm text-foreground">{cluster.region || 'N/A'}</dd>
                  </div>

                  {cluster.tier && (
                    <div>
                      <dt className="text-sm font-medium text-foreground/60">Tier</dt>
                      <dd className="mt-1 text-sm text-foreground capitalize">{cluster.tier}</dd>
                    </div>
                  )}

                  {cluster.clickhouse_version && (
                    <div>
                      <dt className="text-sm font-medium text-foreground/60">ClickHouse Version</dt>
                      <dd className="mt-1 text-sm text-foreground">{cluster.clickhouse_version}</dd>
                    </div>
                  )}

                  {cluster.machine_os && (
                    <div>
                      <dt className="text-sm font-medium text-foreground/60">Operating System</dt>
                      <dd className="mt-1 text-sm text-foreground">{cluster.machine_os}</dd>
                    </div>
                  )}

                  {cluster.machine_memory_gb && (
                    <div>
                      <dt className="text-sm font-medium text-foreground/60">Memory</dt>
                      <dd className="mt-1 text-sm text-foreground">{cluster.machine_memory_gb} GB</dd>
                    </div>
                  )}

                  {cluster.machine_cpu_cores && (
                    <div>
                      <dt className="text-sm font-medium text-foreground/60">CPU Cores</dt>
                      <dd className="mt-1 text-sm text-foreground">{cluster.machine_cpu_cores}</dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-sm font-medium text-foreground/60">Your Role</dt>
                    <dd className="mt-1 text-sm text-foreground capitalize">{cluster.user_role}</dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-foreground/60">Created</dt>
                    <dd className="mt-1 text-sm text-foreground">{formatDate(cluster.created_at)}</dd>
                  </div>

                  {cluster.last_heartbeat_at && (
                    <div>
                      <dt className="text-sm font-medium text-foreground/60">Last Heartbeat</dt>
                      <dd className="mt-1 text-sm text-foreground">{formatDate(cluster.last_heartbeat_at)}</dd>
                    </div>
                  )}

                  {cluster.queries_this_month !== undefined && (
                    <div>
                      <dt className="text-sm font-medium text-foreground/60">Queries This Month</dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {cluster.queries_this_month.toLocaleString()}
                        {cluster.max_monthly_queries && cluster.max_monthly_queries > 0 && (
                          <span className="text-foreground/60">
                            {' '}/ {cluster.max_monthly_queries.toLocaleString()}
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Projects Table (for local clusters) */}
            {cluster.cluster_type === 'local' && cluster.projects_metadata && cluster.projects_metadata.length > 0 && (
              <div className="glass-card shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-cyan-500/10">
                  <h3 className="text-lg leading-6 font-medium text-foreground">
                    Projects ({cluster.projects_metadata.length})
                  </h3>
                  <p className="mt-1 text-sm text-foreground/60">
                    ClickHouse projects synced from your local cluster
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-cyan-500/10">
                    <thead className="bg-background">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                          Project Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                          Measurements
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                          Tables
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                          Created
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                          Last Updated
                        </th>
                      </tr>
                    </thead>
                    <tbody className="glass-card divide-y divide-cyan-500/10">
                      {cluster.projects_metadata.map((project) => (
                        <tr key={project.project_id} className="hover:bg-cyan-500/5">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <CircleStack className="h-5 w-5 text-cyan-400 mr-2" />
                              <span className="text-sm font-medium text-foreground">
                                {project.project_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {project.measurement_count.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {project.table_names.length}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/60">
                            {new Date(project.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/60">
                            {new Date(project.last_updated_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Description */}
            {cluster.description && (
              <div className="glass-card shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-cyan-500/10">
                  <h3 className="text-lg leading-6 font-medium text-foreground">
                    Description
                  </h3>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <p className="text-sm text-foreground">{cluster.description}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab (Admin Only) */}
        {activeTab === 'settings' && isAdmin && (
          <div className="space-y-6">
            <div className="glass-card shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-cyan-500/10">
                <h3 className="text-lg leading-6 font-medium text-foreground">
                  Cluster Settings
                </h3>
                <p className="mt-1 text-sm text-foreground/60">
                  Configure your cluster settings and manage access.
                </p>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="space-y-6">
                  {/* Basic Settings */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">Basic Settings</h4>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="cluster-name" className="block text-sm font-medium text-foreground">
                          Cluster Name
                        </label>
                        <input
                          type="text"
                          id="cluster-name"
                          defaultValue={cluster.name}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 glass-input dark:border-gray-600 dark:text-white sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="cluster-description" className="block text-sm font-medium text-foreground">
                          Description
                        </label>
                        <textarea
                          id="cluster-description"
                          rows={3}
                          defaultValue={cluster.description}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 glass-input dark:border-gray-600 dark:text-white sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Coming Soon Notice */}
                  <div className="rounded-md bg-cyan-500/10 border border-cyan-500/20 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Cog6Tooth className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-cyan-400">
                          Configuration Coming Soon
                        </h3>
                        <div className="mt-2 text-sm text-cyan-400">
                          <p>
                            Advanced cluster configuration options including user management, resource limits,
                            and connection settings will be available here soon.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Button (disabled for now) */}
                  <div className="flex justify-end">
                    <button
                      disabled
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-foreground/40 cursor-not-allowed"
                    >
                      Save Changes (Coming Soon)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
