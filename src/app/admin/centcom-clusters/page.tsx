'use client'

import { useState, useEffect } from 'react'
import {
  CircleStackIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ServerIcon,
  ChartBarIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { Database } from 'lucide-react'

interface LocalClusterUsage {
  id: string
  user_id: string
  license_id: string
  machine_fingerprint: string
  storage_used_gb: number
  queries_this_month: number
  clickhouse_version: string | null
  machine_os: string | null
  machine_memory_gb: number | null
  machine_cpu_cores: number | null
  last_heartbeat_at: string
  created_at: string
  updated_at: string
  
  // Joined data
  user_email?: string
  user_full_name?: string
  license_key_code?: string
  license_type?: string
  max_storage_gb?: number
  max_monthly_queries?: number
  offline_grace_days?: number
}

interface ClusterStats {
  total: number
  online: number
  offline: number
  inGracePeriod: number
  approachingLimits: number
}

export default function CentComClustersMonitoring() {
  const [clusters, setClusters] = useState<LocalClusterUsage[]>([])
  const [stats, setStats] = useState<ClusterStats>({
    total: 0,
    online: 0,
    offline: 0,
    inGracePeriod: 0,
    approachingLimits: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'online' | 'offline' | 'warning'>('all')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchClusters()
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchClusters(true), 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchClusters(silent = false) {
    if (!silent) setLoading(true)
    if (silent) setRefreshing(true)
    
    try {
      const response = await fetch('/api/admin/centcom-clusters')
      if (!response.ok) throw new Error('Failed to fetch clusters')
      
      const data = await response.json()
      setClusters(data.clusters || [])
      calculateStats(data.clusters || [])
    } catch (err) {
      console.error('Error fetching clusters:', err)
      setError(err instanceof Error ? err.message : 'Failed to load clusters')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function calculateStats(clusterData: LocalClusterUsage[]) {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    const online = clusterData.filter(c => new Date(c.last_heartbeat_at) > oneHourAgo)
    const offline = clusterData.filter(c => new Date(c.last_heartbeat_at) <= oneHourAgo)
    
    // In grace period: offline but within grace days
    const inGracePeriod = offline.filter(c => {
      const daysOffline = (now.getTime() - new Date(c.last_heartbeat_at).getTime()) / (1000 * 60 * 60 * 24)
      return daysOffline <= (c.offline_grace_days || 30)
    })
    
    // Approaching limits: > 80% usage
    const approachingLimits = clusterData.filter(c => {
      const storagePercent = c.max_storage_gb ? (c.storage_used_gb / c.max_storage_gb) * 100 : 0
      const queryPercent = c.max_monthly_queries ? (c.queries_this_month / c.max_monthly_queries) * 100 : 0
      return storagePercent >= 80 || queryPercent >= 80
    })
    
    setStats({
      total: clusterData.length,
      online: online.length,
      offline: offline.length,
      inGracePeriod: inGracePeriod.length,
      approachingLimits: approachingLimits.length
    })
  }

  function getFilteredClusters() {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    switch (filter) {
      case 'online':
        return clusters.filter(c => new Date(c.last_heartbeat_at) > oneHourAgo)
      case 'offline':
        return clusters.filter(c => new Date(c.last_heartbeat_at) <= oneHourAgo)
      case 'warning':
        return clusters.filter(c => {
          const storagePercent = c.max_storage_gb ? (c.storage_used_gb / c.max_storage_gb) * 100 : 0
          const queryPercent = c.max_monthly_queries ? (c.queries_this_month / c.max_monthly_queries) * 100 : 0
          return storagePercent >= 80 || queryPercent >= 80
        })
      default:
        return clusters
    }
  }

  function isClusterOnline(cluster: LocalClusterUsage): boolean {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    return new Date(cluster.last_heartbeat_at) > oneHourAgo
  }

  function getClusterStatus(cluster: LocalClusterUsage): { label: string; color: string; icon: any } {
    const now = new Date()
    const lastHeartbeat = new Date(cluster.last_heartbeat_at)
    const hoursSinceHeartbeat = (now.getTime() - lastHeartbeat.getTime()) / (1000 * 60 * 60)
    
    if (hoursSinceHeartbeat <= 1) {
      return { label: 'Online', color: 'text-green-600 bg-green-100', icon: CheckCircleIcon }
    } else if (hoursSinceHeartbeat <= 24) {
      return { label: 'Recently Offline', color: 'text-yellow-600 bg-yellow-100', icon: ExclamationTriangleIcon }
    } else {
      const daysOffline = hoursSinceHeartbeat / 24
      const graceDays = cluster.offline_grace_days || 30
      if (daysOffline > graceDays) {
        return { label: 'Grace Period Expired', color: 'text-red-600 bg-red-100', icon: XCircleIcon }
      } else {
        return { label: 'In Grace Period', color: 'text-orange-600 bg-orange-100', icon: ClockIcon }
      }
    }
  }

  function getUsageColor(percent: number): string {
    if (percent >= 90) return 'text-red-600 bg-red-100'
    if (percent >= 80) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  function formatBytes(gb: number): string {
    return `${gb.toFixed(2)} GB`
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  function getTimeAgo(date: string): string {
    const now = new Date()
    const then = new Date(date)
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
    
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading CentCom clusters...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <XCircleIcon className="h-6 w-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-800">Error Loading Clusters</h3>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchClusters()}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const filteredClusters = getFilteredClusters()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Database className="h-8 w-8 mr-3 text-blue-600" />
              CentCom Local Clusters
            </h1>
            <p className="text-gray-600 mt-2">Real-time monitoring of all CentCom local ClickHouse clusters</p>
          </div>
          
          <button
            onClick={() => fetchClusters()}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clusters</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <CircleStackIcon className="h-12 w-12 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Online</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.online}</p>
            </div>
            <CheckCircleIcon className="h-12 w-12 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Offline</p>
              <p className="text-3xl font-bold text-gray-600 mt-1">{stats.offline}</p>
            </div>
            <XCircleIcon className="h-12 w-12 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Grace Period</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{stats.inGracePeriod}</p>
            </div>
            <ClockIcon className="h-12 w-12 text-orange-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Near Limits</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.approachingLimits}</p>
            </div>
            <ExclamationTriangleIcon className="h-12 w-12 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('online')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'online' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Online ({stats.online})
          </button>
          <button
            onClick={() => setFilter('offline')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'offline' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Offline ({stats.offline})
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'warning' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Warnings ({stats.approachingLimits})
          </button>
        </div>
      </div>

      {/* Clusters List */}
      {filteredClusters.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CircleStackIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Clusters Found</h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'No CentCom local clusters are currently registered.' 
              : `No clusters match the "${filter}" filter.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClusters.map((cluster) => {
            const status = getClusterStatus(cluster)
            const storagePercent = cluster.max_storage_gb ? (cluster.storage_used_gb / cluster.max_storage_gb) * 100 : 0
            const queryPercent = cluster.max_monthly_queries ? (cluster.queries_this_month / cluster.max_monthly_queries) * 100 : 0
            const StatusIcon = status.icon

            return (
              <div key={cluster.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <ServerIcon className="h-6 w-6 text-gray-400" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {cluster.user_full_name || cluster.user_email}
                        </h3>
                        <p className="text-sm text-gray-600">{cluster.user_email}</p>
                      </div>
                    </div>
                    
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                      <StatusIcon className="h-4 w-4 mr-1" />
                      {status.label}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Machine</p>
                      <p className="text-sm font-medium text-gray-900">{cluster.machine_fingerprint.substring(0, 12)}...</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 mb-1">License</p>
                      <p className="text-sm font-medium text-gray-900">
                        <span className={`px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800`}>
                          {cluster.license_type}
                        </span>
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 mb-1">ClickHouse</p>
                      <p className="text-sm font-medium text-gray-900">{cluster.clickhouse_version || 'Unknown'}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Last Sync</p>
                      <p className="text-sm font-medium text-gray-900">{getTimeAgo(cluster.last_heartbeat_at)}</p>
                    </div>
                  </div>

                  {/* Usage Bars */}
                  <div className="space-y-3">
                    {/* Storage */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Storage</span>
                        <span className={`text-sm font-medium px-2 py-1 rounded ${getUsageColor(storagePercent)}`}>
                          {formatBytes(cluster.storage_used_gb)} / {formatBytes(cluster.max_storage_gb || 0)} ({storagePercent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            storagePercent >= 90 ? 'bg-red-500' :
                            storagePercent >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(storagePercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Queries */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Queries (Month)</span>
                        <span className={`text-sm font-medium px-2 py-1 rounded ${getUsageColor(queryPercent)}`}>
                          {formatNumber(cluster.queries_this_month)} / {formatNumber(cluster.max_monthly_queries || 0)} ({queryPercent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            queryPercent >= 90 ? 'bg-red-500' :
                            queryPercent >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(queryPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Machine Info */}
                  {(cluster.machine_os || cluster.machine_cpu_cores || cluster.machine_memory_gb) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-6 text-sm text-gray-600">
                        {cluster.machine_os && (
                          <span>💻 {cluster.machine_os}</span>
                        )}
                        {cluster.machine_cpu_cores && (
                          <span>🔧 {cluster.machine_cpu_cores} cores</span>
                        )}
                        {cluster.machine_memory_gb && (
                          <span>🧠 {cluster.machine_memory_gb} GB RAM</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}




