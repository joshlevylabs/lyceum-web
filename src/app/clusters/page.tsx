'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  CircleStackIcon,
  PlusIcon,
  CloudIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  SignalIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

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
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      offline: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      configuring: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || statusColors.inactive}`}>
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
            <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
              My Clusters
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage your local and cloud cluster connections
            </p>
          </div>

          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Add Cluster
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CircleStackIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total Clusters
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                      {clusters.length}
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
                  <ComputerDesktopIcon className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Local Clusters
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                      {clusters.filter(c => c.cluster_type === 'local').length}
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
                  <CloudIcon className="h-6 w-6 text-purple-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Cloud Clusters
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                      {clusters.filter(c => c.cluster_type === 'cloud').length}
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
                  <CheckCircleIcon className="h-6 w-6 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Active Clusters
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                      {clusters.filter(c => c.status === 'active').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clusters Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading clusters...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">Error loading clusters</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <div className="mt-6">
              <button
                onClick={loadClusters}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : clusters.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <CircleStackIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No clusters</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by connecting your first cluster.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Add Cluster
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cluster
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cluster ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Region
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Health
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Storage
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {clusters.map((cluster) => (
                    <tr
                      key={cluster.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {cluster.cluster_type === 'local' ? (
                              <ComputerDesktopIcon className="h-6 w-6 text-blue-500" />
                            ) : (
                              <CloudIcon className="h-6 w-6 text-purple-500" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {cluster.name}
                            </div>
                            {cluster.cluster_key && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {cluster.cluster_key}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all max-w-[200px]">
                          {cluster.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 capitalize">
                          {cluster.cluster_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {cluster.region}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(cluster.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getHealthBadge(cluster.health_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatStorage(cluster.storage_used_gb)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(cluster.updated_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewCluster(cluster.slug)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center"
                          title="View cluster details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Cluster Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Add New Cluster
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Connect a new local or cloud cluster to your Lyceum account.
              </p>
              <div className="space-y-3">
                <button
                  className="w-full flex items-center justify-center px-4 py-3 border-2 border-blue-500 rounded-md text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-700"
                  onClick={() => {/* TODO: Add local cluster */}}
                >
                  <ComputerDesktopIcon className="h-5 w-5 mr-2" />
                  Add Local Cluster
                </button>
                <button
                  className="w-full flex items-center justify-center px-4 py-3 border-2 border-purple-500 rounded-md text-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-gray-700"
                  onClick={() => {/* TODO: Add cloud cluster */}}
                >
                  <CloudIcon className="h-5 w-5 mr-2" />
                  Add Cloud Cluster
                </button>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
