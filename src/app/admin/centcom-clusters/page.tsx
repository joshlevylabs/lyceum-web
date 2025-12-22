'use client'

import { useState, useEffect } from 'react'
import {
  Database as CircleStack,
  ArrowsClockwise as ArrowPath,
  Warning as ExclamationTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Desktop as Server,
} from '@phosphor-icons/react'

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
      return { label: 'Online', color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20', icon: CheckCircle }
    } else if (hoursSinceHeartbeat <= 24) {
      return { label: 'Recently Offline', color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20', icon: ExclamationTriangle }
    } else {
      const daysOffline = hoursSinceHeartbeat / 24
      const graceDays = cluster.offline_grace_days || 30
      if (daysOffline > graceDays) {
        return { label: 'Grace Period Expired', color: 'text-red-400 bg-red-500/10 border border-red-500/20', icon: XCircle }
      } else {
        return { label: 'In Grace Period', color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20', icon: Clock }
      }
    }
  }

  function getUsageColor(percent: number): string {
    if (percent >= 90) return 'text-red-400 bg-red-500/10 border border-red-500/20'
    if (percent >= 80) return 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
    return 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/20 border-t-cyan-500 mx-auto mb-4" />
          <p className="text-foreground/60">Loading CentCom clusters...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-card bg-red-500/10 border border-red-500/20 p-6">
          <div className="flex items-center">
            <XCircle className="h-6 w-6 text-red-400 mr-3" weight="duotone" />
            <div>
              <h3 className="text-lg font-medium text-foreground">Error Loading Clusters</h3>
              <p className="text-red-400 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchClusters()}
            className="mt-4 btn-ghost"
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
            <h1 className="text-3xl font-bold text-foreground flex items-center">
              <CircleStack className="h-8 w-8 mr-3 text-cyan-400" weight="duotone" />
              CentCom Local Clusters
            </h1>
            <p className="text-foreground/60 mt-2">Real-time monitoring of all CentCom local ClickHouse clusters</p>
          </div>

          <button
            onClick={() => fetchClusters()}
            disabled={refreshing}
            className="btn-primary disabled:opacity-50 flex items-center"
          >
            <ArrowPath className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground/60">Total Clusters</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <CircleStack className="h-12 w-12 text-cyan-400" weight="duotone" />
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground/60">Online</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">{stats.online}</p>
            </div>
            <CheckCircle className="h-12 w-12 text-emerald-400" weight="duotone" />
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground/60">Offline</p>
              <p className="text-3xl font-bold text-foreground/60 mt-1">{stats.offline}</p>
            </div>
            <XCircle className="h-12 w-12 text-foreground/40" weight="duotone" />
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground/60">Grace Period</p>
              <p className="text-3xl font-bold text-amber-400 mt-1">{stats.inGracePeriod}</p>
            </div>
            <Clock className="h-12 w-12 text-amber-400" weight="duotone" />
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground/60">Near Limits</p>
              <p className="text-3xl font-bold text-amber-400 mt-1">{stats.approachingLimits}</p>
            </div>
            <ExclamationTriangle className="h-12 w-12 text-amber-400" weight="duotone" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-foreground">Filter:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'all' ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('online')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'online' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'btn-ghost'
            }`}
          >
            Online ({stats.online})
          </button>
          <button
            onClick={() => setFilter('offline')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'offline' ? 'bg-foreground/10 text-foreground border border-foreground/20' : 'btn-ghost'
            }`}
          >
            Offline ({stats.offline})
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'btn-ghost'
            }`}
          >
            Warnings ({stats.approachingLimits})
          </button>
        </div>
      </div>

      {/* Clusters List */}
      {filteredClusters.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <CircleStack className="h-16 w-16 text-foreground/40 mx-auto mb-4" weight="duotone" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Clusters Found</h3>
          <p className="text-foreground/60">
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
              <div key={cluster.id} className="glass-card">
                <div className="p-6">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Server className="h-6 w-6 text-cyan-400" weight="duotone" />
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {cluster.user_full_name || cluster.user_email}
                        </h3>
                        <p className="text-sm text-foreground/60">{cluster.user_email}</p>
                      </div>
                    </div>

                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                      <StatusIcon className="h-4 w-4 mr-1" weight="duotone" />
                      {status.label}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-foreground/60 mb-1">Machine</p>
                      <p className="text-sm font-medium text-foreground">{cluster.machine_fingerprint.substring(0, 12)}...</p>
                    </div>

                    <div>
                      <p className="text-xs text-foreground/60 mb-1">License</p>
                      <p className="text-sm font-medium text-foreground">
                        <span className={`px-2 py-1 rounded text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20`}>
                          {cluster.license_type}
                        </span>
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-foreground/60 mb-1">ClickHouse</p>
                      <p className="text-sm font-medium text-foreground">{cluster.clickhouse_version || 'Unknown'}</p>
                    </div>

                    <div>
                      <p className="text-xs text-foreground/60 mb-1">Last Sync</p>
                      <p className="text-sm font-medium text-foreground">{getTimeAgo(cluster.last_heartbeat_at)}</p>
                    </div>
                  </div>

                  {/* Usage Bars */}
                  <div className="space-y-3">
                    {/* Storage */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">Storage</span>
                        <span className={`text-sm font-medium px-2 py-1 rounded ${getUsageColor(storagePercent)}`}>
                          {formatBytes(cluster.storage_used_gb)} / {formatBytes(cluster.max_storage_gb || 0)} ({storagePercent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-foreground/10 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            storagePercent >= 90 ? 'bg-red-500' :
                            storagePercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(storagePercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Queries */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">Queries (Month)</span>
                        <span className={`text-sm font-medium px-2 py-1 rounded ${getUsageColor(queryPercent)}`}>
                          {formatNumber(cluster.queries_this_month)} / {formatNumber(cluster.max_monthly_queries || 0)} ({queryPercent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-foreground/10 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            queryPercent >= 90 ? 'bg-red-500' :
                            queryPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(queryPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Machine Info */}
                  {(cluster.machine_os || cluster.machine_cpu_cores || cluster.machine_memory_gb) && (
                    <div className="mt-4 pt-4 border-t border-cyan-500/10">
                      <div className="flex items-center space-x-6 text-sm text-foreground/60">
                        {cluster.machine_os && (
                          <span>{cluster.machine_os}</span>
                        )}
                        {cluster.machine_cpu_cores && (
                          <span>{cluster.machine_cpu_cores} cores</span>
                        )}
                        {cluster.machine_memory_gb && (
                          <span>{cluster.machine_memory_gb} GB RAM</span>
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




