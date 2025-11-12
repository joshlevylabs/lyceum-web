'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  CircleStackIcon,
  ComputerDesktopIcon,
  CloudIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CpuChipIcon,
  ServerStackIcon,
  ClockIcon,
  Cog6ToothIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

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
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      offline: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      configuring: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    }

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[status as keyof typeof statusColors] || statusColors.inactive}`}>
        {status}
      </span>
    )
  }

  const getHealthBadge = (health: string) => {
    const healthColors = {
      healthy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      degraded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      unhealthy: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      offline: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading cluster details...</span>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !cluster) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">Error loading cluster</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <div className="mt-6 space-x-3">
            <button
              onClick={() => router.push('/clusters')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Clusters
            </button>
            <button
              onClick={loadClusterDetails}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
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
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to Clusters
            </button>
            <div className="flex items-center space-x-3">
              <div className="relative">
                {cluster.cluster_type === 'local' ? (
                  <ComputerDesktopIcon className="h-8 w-8 text-blue-500" />
                ) : (
                  <CloudIcon className="h-8 w-8 text-purple-500" />
                )}
                {/* Connection indicator dot for local clusters */}
                {cluster.cluster_type === 'local' && (
                  <span
                    className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${
                      cluster.is_connected
                        ? 'bg-green-500 animate-pulse'
                        : 'bg-gray-400'
                    }`}
                    title={cluster.is_connected ? 'Connected' : 'Offline'}
                  />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
                    {cluster.name}
                  </h1>
                  {/* Connection status badge for local clusters */}
                  {cluster.cluster_type === 'local' && (
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                        cluster.is_connected
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${cluster.is_connected ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {cluster.is_connected ? 'Connected' : 'Offline'}
                    </span>
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  {cluster.cluster_key && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Key: <span className="font-medium">{cluster.cluster_key}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    ID: {cluster.id}
                  </p>
                  {cluster.cluster_type === 'local' && cluster.last_heartbeat_at && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
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
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Cog6ToothIcon className="h-5 w-5 mr-2" />
                Configure
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Overview
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Settings
              </button>
            )}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircleIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Status
                        </dt>
                        <dd className="mt-1">
                          {getStatusBadge(cluster.status)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Health
                        </dt>
                        <dd className="mt-1">
                          {getHealthBadge(cluster.health_status)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ServerStackIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Storage Used
                        </dt>
                        <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formatStorage(cluster.storage_used_gb)}
                          {cluster.max_storage_gb && cluster.max_storage_gb > 0 && (
                            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                              {' '}/ {formatStorage(cluster.max_storage_gb)}
                            </span>
                          )}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cluster Information */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Cluster Information
                </h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Cluster ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono break-all">{cluster.id}</dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Cluster Type</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{cluster.cluster_type}</dd>
                  </div>

                  {cluster.architecture && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Architecture</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{cluster.architecture}</dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Region</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{cluster.region || 'N/A'}</dd>
                  </div>

                  {cluster.tier && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Tier</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{cluster.tier}</dd>
                    </div>
                  )}

                  {cluster.clickhouse_version && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">ClickHouse Version</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{cluster.clickhouse_version}</dd>
                    </div>
                  )}

                  {cluster.machine_os && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Operating System</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{cluster.machine_os}</dd>
                    </div>
                  )}

                  {cluster.machine_memory_gb && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Memory</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{cluster.machine_memory_gb} GB</dd>
                    </div>
                  )}

                  {cluster.machine_cpu_cores && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">CPU Cores</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{cluster.machine_cpu_cores}</dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Your Role</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{cluster.user_role}</dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(cluster.created_at)}</dd>
                  </div>

                  {cluster.last_heartbeat_at && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Heartbeat</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(cluster.last_heartbeat_at)}</dd>
                    </div>
                  )}

                  {cluster.queries_this_month !== undefined && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Queries This Month</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {cluster.queries_this_month.toLocaleString()}
                        {cluster.max_monthly_queries && cluster.max_monthly_queries > 0 && (
                          <span className="text-gray-500 dark:text-gray-400">
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
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Projects ({cluster.projects_metadata.length})
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    ClickHouse projects synced from your local cluster
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Project Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Measurements
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Tables
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Created
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Last Updated
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {cluster.projects_metadata.map((project) => (
                        <tr key={project.project_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <CircleStackIcon className="h-5 w-5 text-blue-500 mr-2" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {project.project_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {project.measurement_count.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {project.table_names.length}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(project.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Description
                  </h3>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{cluster.description}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab (Admin Only) */}
        {activeTab === 'settings' && isAdmin && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Cluster Settings
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Configure your cluster settings and manage access.
                </p>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="space-y-6">
                  {/* Basic Settings */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Basic Settings</h4>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="cluster-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Cluster Name
                        </label>
                        <input
                          type="text"
                          id="cluster-name"
                          defaultValue={cluster.name}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="cluster-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Description
                        </label>
                        <textarea
                          id="cluster-description"
                          rows={3}
                          defaultValue={cluster.description}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Coming Soon Notice */}
                  <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Cog6ToothIcon className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Configuration Coming Soon
                        </h3>
                        <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
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
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed"
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
