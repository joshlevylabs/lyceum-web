'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CircleStackIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  CpuChipIcon,
  ServerIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface DatabaseCluster {
  id: string
  name: string
  description?: string
  cluster_type: 'production' | 'development' | 'analytics'
  status: 'provisioning' | 'active' | 'maintenance' | 'error' | 'terminated'
  region: string
  node_count: number
  cpu_per_node: number
  memory_per_node: string
  storage_per_node: string
  hot_tier_size?: string
  warm_tier_size?: string
  cold_tier_size?: string
  archive_enabled: boolean
  created_at: string
  updated_at: string
  health_status: 'healthy' | 'warning' | 'critical' | 'unknown'
  estimated_monthly_cost?: number
  actual_monthly_cost?: number
  user_role: 'admin' | 'editor' | 'analyst' | 'viewer'
}

export default function ClusterManagement() {
  const [clusters, setClusters] = useState<DatabaseCluster[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'development' | 'analytics' | 'production'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'maintenance' | 'error' | 'provisioning'>('all')

  useEffect(() => {
    loadClusters()
  }, [filterType, filterStatus])

  const loadClusters = async () => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams()
      if (filterType !== 'all') {
        params.append('cluster_type', filterType)
      }
      if (filterStatus !== 'all') {
        params.append('status', filterStatus)
      }
      params.append('limit', '50')
      
      // Fetch clusters from API
      const response = await fetch(`/api/clusters?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load clusters')
      }
      
      let filtered = data.clusters || []
      
      // Apply client-side search filter
      if (searchTerm) {
        filtered = filtered.filter((cluster: DatabaseCluster) =>
          cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cluster.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cluster.region.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }
      
      setClusters(filtered)
      setLoading(false)
      
    } catch (error) {
      console.error('Failed to load clusters:', error)
      setLoading(false)
      // Show error state
      setClusters([])
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'maintenance': return <ClockIcon className="w-5 h-5 text-yellow-500" />
      case 'error': return <XCircleIcon className="w-5 h-5 text-red-500" />
      case 'provisioning': return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
      case 'terminated': return <XCircleIcon className="w-5 h-5 text-gray-500" />
      default: return <ExclamationTriangleIcon className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'provisioning': return 'bg-blue-100 text-blue-800'
      case 'terminated': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-red-600'
      case 'editor': return 'text-blue-600'
      case 'analyst': return 'text-purple-600'
      case 'viewer': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      case 'unknown': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'production': return 'bg-red-100 text-red-800'
      case 'staging': return 'bg-yellow-100 text-yellow-800'
      case 'development': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Manufacturing Analytics Clusters
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            High-performance ClickHouse clusters for manufacturing data analytics
          </p>
        </div>
        
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <button
            onClick={loadClusters}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5" />
            Refresh
          </button>
          <Link
            href="/admin/clusters/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create Cluster
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex space-x-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Types</option>
            <option value="production">Production</option>
            <option value="analytics">Analytics</option>
            <option value="development">Development</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="provisioning">Provisioning</option>
            <option value="maintenance">Maintenance</option>
            <option value="error">Error</option>
          </select>
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search clusters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Clusters Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading clusters...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {clusters.map((cluster) => (
            <div key={cluster.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CircleStackIcon className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">{cluster.name}</h3>
                      <p className="text-sm text-gray-500">{cluster.description}</p>
                    </div>
                  </div>
                  {getStatusIcon(cluster.status)}
                </div>

                {/* Status and Type */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(cluster.status)}`}>
                    {cluster.status}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(cluster.cluster_type)}`}>
                    {cluster.cluster_type}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {cluster.node_count} node{cluster.node_count !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Manufacturing Cluster Info */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">
                      {cluster.node_count}
                    </div>
                    <div className="text-xs text-gray-500">Nodes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">
                      {cluster.cpu_per_node}
                    </div>
                    <div className="text-xs text-gray-500">CPU/Node</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">
                      {cluster.memory_per_node}
                    </div>
                    <div className="text-xs text-gray-500">RAM/Node</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-orange-600">
                      {cluster.estimated_monthly_cost ? `$${cluster.estimated_monthly_cost}` : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">Est. Cost</div>
                  </div>
                </div>

                {/* Storage Tiers */}
                {cluster.status === 'active' && (
                  <div className="bg-gray-50 rounded p-3 mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Data Tiers</div>
                    <div className="flex justify-between text-xs">
                      <span>Hot: {cluster.hot_tier_size}</span>
                      <span>Warm: {cluster.warm_tier_size}</span>
                      <span>Cold: {cluster.cold_tier_size}</span>
                    </div>
                  </div>
                )}

                {/* Details */}
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>Region:</span>
                    <span className="font-medium">{cluster.region}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage/Node:</span>
                    <span className="font-medium">{cluster.storage_per_node}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Your Role:</span>
                    <span className={`font-medium ${getRoleColor(cluster.user_role)}`}>
                      {cluster.user_role}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="font-medium">{formatDate(cluster.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Health:</span>
                    <span className={`font-medium ${getHealthColor(cluster.health_status)}`}>
                      {cluster.health_status}
                    </span>
                  </div>
                </div>

                {/* Manufacturing Features */}
                <div className="flex space-x-4 text-xs text-gray-500 mb-4">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                    Auto-Tiering
                  </div>
                  <div className="flex items-center">
                    {cluster.archive_enabled ? 
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" /> :
                      <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                    }
                    Archive
                  </div>
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                    Analytics
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between">
                  <div className="flex space-x-1">
                    <button className="p-1 text-blue-600 hover:text-blue-900" title="View details">
                      <ChartBarIcon className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-blue-600 hover:text-blue-900" title="Configure">
                      <Cog6ToothIcon className="h-4 w-4" />
                    </button>
                    {cluster.status === 'active' && (
                      <button className="p-1 text-yellow-600 hover:text-yellow-900" title="Enter maintenance">
                        <PauseIcon className="h-4 w-4" />
                      </button>
                    )}
                    {cluster.status === 'maintenance' && (
                      <button className="p-1 text-green-600 hover:text-green-900" title="Resume">
                        <PlayIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <Link
                    href={`/admin/clusters/${cluster.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Manage →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!loading && clusters.length === 0 && (
        <div className="text-center py-12">
          <CircleStackIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No clusters found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No clusters match your search criteria.' : 'Get started by creating your first database cluster.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <Link
                href="/admin/clusters/create"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Create Database Cluster
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

