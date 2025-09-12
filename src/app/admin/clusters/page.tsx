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
  cluster_type: string
  status: string
  region: string
  instance_size: string
  max_connections: number
  storage_gb: number
  backup_enabled: boolean
  monitoring_enabled: boolean
  assigned_users: string[]
  created_at: string
  last_health_check?: string
  metrics: {
    cpu_usage?: number
    memory_usage?: number
    storage_usage?: number
    active_connections?: number
    queries_per_second?: number
  }
}

export default function ClusterManagement() {
  const [clusters, setClusters] = useState<DatabaseCluster[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'development' | 'staging' | 'production'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'maintenance' | 'error'>('all')

  useEffect(() => {
    loadClusters()
  }, [filterType, filterStatus])

  const loadClusters = async () => {
    try {
      setLoading(true)
      
      // TODO: Replace with actual API call
      // Simulate cluster data
      setTimeout(() => {
        const mockClusters: DatabaseCluster[] = [
          {
            id: '1',
            name: 'Production Primary',
            description: 'Main production database cluster',
            cluster_type: 'production',
            status: 'active',
            region: 'us-east-1',
            instance_size: 'large',
            max_connections: 500,
            storage_gb: 1000,
            backup_enabled: true,
            monitoring_enabled: true,
            assigned_users: ['user1', 'user2', 'user3'],
            created_at: '2024-01-01T00:00:00Z',
            last_health_check: '2024-09-09T18:25:00Z',
            metrics: {
              cpu_usage: 65,
              memory_usage: 72,
              storage_usage: 45,
              active_connections: 234,
              queries_per_second: 1250
            }
          },
          {
            id: '2',
            name: 'Staging Environment',
            description: 'Pre-production testing cluster',
            cluster_type: 'staging',
            status: 'active',
            region: 'us-west-2',
            instance_size: 'medium',
            max_connections: 200,
            storage_gb: 500,
            backup_enabled: true,
            monitoring_enabled: true,
            assigned_users: ['user4', 'user5'],
            created_at: '2024-01-15T00:00:00Z',
            last_health_check: '2024-09-09T18:20:00Z',
            metrics: {
              cpu_usage: 25,
              memory_usage: 40,
              storage_usage: 30,
              active_connections: 45,
              queries_per_second: 180
            }
          },
          {
            id: '3',
            name: 'Development Cluster',
            description: 'Development and testing environment',
            cluster_type: 'development',
            status: 'active',
            region: 'us-east-1',
            instance_size: 'small',
            max_connections: 100,
            storage_gb: 200,
            backup_enabled: false,
            monitoring_enabled: true,
            assigned_users: ['user6'],
            created_at: '2024-02-01T00:00:00Z',
            last_health_check: '2024-09-09T18:15:00Z',
            metrics: {
              cpu_usage: 15,
              memory_usage: 28,
              storage_usage: 20,
              active_connections: 12,
              queries_per_second: 45
            }
          },
          {
            id: '4',
            name: 'Analytics Cluster',
            description: 'Dedicated analytics and reporting cluster',
            cluster_type: 'production',
            status: 'maintenance',
            region: 'eu-west-1',
            instance_size: 'xlarge',
            max_connections: 300,
            storage_gb: 2000,
            backup_enabled: true,
            monitoring_enabled: true,
            assigned_users: ['user7', 'user8'],
            created_at: '2024-03-01T00:00:00Z',
            last_health_check: '2024-09-09T17:30:00Z',
            metrics: {
              cpu_usage: 0,
              memory_usage: 0,
              storage_usage: 60,
              active_connections: 0,
              queries_per_second: 0
            }
          }
        ]
        
        let filtered = mockClusters
        
        if (filterType !== 'all') {
          filtered = filtered.filter(cluster => cluster.cluster_type === filterType)
        }
        
        if (filterStatus !== 'all') {
          filtered = filtered.filter(cluster => cluster.status === filterStatus)
        }
        
        if (searchTerm) {
          filtered = filtered.filter(cluster =>
            cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cluster.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cluster.region.toLowerCase().includes(searchTerm.toLowerCase())
          )
        }
        
        setClusters(filtered)
        setLoading(false)
      }, 500)
      
    } catch (error) {
      console.error('Failed to load clusters:', error)
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'maintenance': return <ClockIcon className="w-5 h-5 text-yellow-500" />
      case 'error': return <XCircleIcon className="w-5 h-5 text-red-500" />
      case 'initializing': return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
      default: return <ExclamationTriangleIcon className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'initializing': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
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

  const getInstanceSizeColor = (size: string) => {
    switch (size) {
      case 'small': return 'bg-gray-100 text-gray-800'
      case 'medium': return 'bg-blue-100 text-blue-800'
      case 'large': return 'bg-purple-100 text-purple-800'
      case 'xlarge': return 'bg-red-100 text-red-800'
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

  const getMetricColor = (value: number, type: 'usage' | 'performance') => {
    if (type === 'usage') {
      if (value >= 80) return 'text-red-600'
      if (value >= 60) return 'text-yellow-600'
      return 'text-green-600'
    } else {
      if (value >= 1000) return 'text-green-600'
      if (value >= 500) return 'text-yellow-600'
      return 'text-red-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Database Cluster Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and manage database clusters across environments
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
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
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
                <div className="flex space-x-2 mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(cluster.status)}`}>
                    {cluster.status}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(cluster.cluster_type)}`}>
                    {cluster.cluster_type}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getInstanceSizeColor(cluster.instance_size)}`}>
                    {cluster.instance_size}
                  </span>
                </div>

                {/* Metrics */}
                {cluster.metrics && cluster.status === 'active' && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${getMetricColor(cluster.metrics.cpu_usage || 0, 'usage')}`}>
                        {cluster.metrics.cpu_usage || 0}%
                      </div>
                      <div className="text-xs text-gray-500">CPU</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${getMetricColor(cluster.metrics.memory_usage || 0, 'usage')}`}>
                        {cluster.metrics.memory_usage || 0}%
                      </div>
                      <div className="text-xs text-gray-500">Memory</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${getMetricColor(cluster.metrics.storage_usage || 0, 'usage')}`}>
                        {cluster.metrics.storage_usage || 0}%
                      </div>
                      <div className="text-xs text-gray-500">Storage</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${getMetricColor(cluster.metrics.queries_per_second || 0, 'performance')}`}>
                        {cluster.metrics.queries_per_second || 0}
                      </div>
                      <div className="text-xs text-gray-500">QPS</div>
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
                    <span>Storage:</span>
                    <span className="font-medium">{cluster.storage_gb}GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Connections:</span>
                    <span className="font-medium">{cluster.max_connections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Assigned Users:</span>
                    <span className="font-medium">{cluster.assigned_users.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="font-medium">{formatDate(cluster.created_at)}</span>
                  </div>
                  {cluster.last_health_check && (
                    <div className="flex justify-between">
                      <span>Last Check:</span>
                      <span className="font-medium">{formatDateTime(cluster.last_health_check)}</span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="flex space-x-4 text-xs text-gray-500 mb-4">
                  <div className="flex items-center">
                    {cluster.backup_enabled ? 
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" /> :
                      <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                    }
                    Backups
                  </div>
                  <div className="flex items-center">
                    {cluster.monitoring_enabled ? 
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" /> :
                      <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                    }
                    Monitoring
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

