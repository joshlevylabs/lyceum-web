'use client'

import { useState, useEffect } from 'react'
import {
  ArrowPathIcon,
  LinkIcon,
  ClockIcon,
  UserIcon,
  CircleStackIcon,
  ChartBarIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'
import { Activity, TrendingUp, Users } from 'lucide-react'

interface Connection {
  id: string
  user_id: string
  cluster_id: string | null
  connection_type: 'local' | 'cloud'
  connection_name: string
  event_type: 'connect' | 'disconnect' | 'error'
  set_as_default: boolean
  metadata: any
  created_at: string
  
  // Joined data
  user_email?: string
  user_full_name?: string
  cluster_name?: string
}

interface ConnectionStats {
  total: number
  last24Hours: number
  uniqueUsers: number
  avgDurationMinutes: number
  mostActiveUser: string
}

export default function CentComConnectionsAnalytics() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [stats, setStats] = useState<ConnectionStats>({
    total: 0,
    last24Hours: 0,
    uniqueUsers: 0,
    avgDurationMinutes: 0,
    mostActiveUser: ''
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('7d')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchConnections()
    const interval = setInterval(() => fetchConnections(true), 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [timeFilter])

  async function fetchConnections(silent = false) {
    if (!silent) setLoading(true)
    if (silent) setRefreshing(true)
    
    try {
      const response = await fetch(`/api/admin/centcom-connections?timeFilter=${timeFilter}`)
      if (!response.ok) throw new Error('Failed to fetch connections')
      
      const data = await response.json()
      setConnections(data.connections || [])
      setStats(data.stats || {
        total: 0,
        last24Hours: 0,
        uniqueUsers: 0,
        avgDurationMinutes: 0,
        mostActiveUser: ''
      })
    } catch (err) {
      console.error('Error fetching connections:', err)
      setError(err instanceof Error ? err.message : 'Failed to load connections')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function getEventIcon(eventType: string) {
    switch (eventType) {
      case 'connect':
        return '🟢'
      case 'disconnect':
        return '🔴'
      case 'error':
        return '❌'
      default:
        return '⚪'
    }
  }

  function getEventColor(eventType: string) {
    switch (eventType) {
      case 'connect':
        return 'text-green-600 bg-green-100'
      case 'disconnect':
        return 'text-gray-600 bg-gray-100'
      case 'error':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
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

  function formatDateTime(date: string): string {
    return new Date(date).toLocaleString()
  }

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading connection analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800">Error Loading Connections</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={() => fetchConnections()}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Activity className="h-8 w-8 mr-3 text-blue-600" />
              Connection Analytics
            </h1>
            <p className="text-gray-600 mt-2">Track and analyze CentCom cluster connections</p>
          </div>
          
          <button
            onClick={() => fetchConnections()}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Connections</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <LinkIcon className="h-12 w-12 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Last 24 Hours</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.last24Hours}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unique Users</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{stats.uniqueUsers}</p>
            </div>
            <Users className="h-12 w-12 text-purple-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Duration</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{stats.avgDurationMinutes}m</p>
            </div>
            <ClockIcon className="h-12 w-12 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Time Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Time Period:</span>
          <button
            onClick={() => setTimeFilter('24h')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              timeFilter === '24h' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 24 Hours
          </button>
          <button
            onClick={() => setTimeFilter('7d')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              timeFilter === '7d' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeFilter('30d')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              timeFilter === '30d' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              timeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Most Active User */}
      {stats.mostActiveUser && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center">
            <div className="bg-white rounded-full p-3 mr-4">
              <UserIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Most Active User</p>
              <p className="text-xl font-bold text-gray-900">{stats.mostActiveUser}</p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Timeline */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            Connection Timeline
          </h2>
        </div>

        {connections.length === 0 ? (
          <div className="p-12 text-center">
            <LinkIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Connections Found</h3>
            <p className="text-gray-600">No connection events in the selected time period.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {connections.map((connection) => (
              <div key={connection.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Event Icon */}
                    <div className={`mt-1 px-3 py-1 rounded-full text-xs font-medium ${getEventColor(connection.event_type)}`}>
                      {getEventIcon(connection.event_type)} {connection.event_type}
                    </div>

                    {/* Connection Details */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {connection.user_full_name || connection.user_email}
                        </span>
                        {connection.user_full_name && (
                          <span className="text-sm text-gray-500">({connection.user_email})</span>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <CircleStackIcon className="h-4 w-4 mr-1" />
                          <span>{connection.connection_name}</span>
                        </div>

                        {connection.cluster_name && (
                          <div className="flex items-center">
                            <span className="text-gray-400 mr-1">→</span>
                            <span>{connection.cluster_name}</span>
                          </div>
                        )}

                        <div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            connection.connection_type === 'local' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {connection.connection_type}
                          </span>
                        </div>

                        {connection.set_as_default && (
                          <div>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              ⭐ Default
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="text-right ml-4">
                    <div className="text-sm font-medium text-gray-900">{getTimeAgo(connection.created_at)}</div>
                    <div className="text-xs text-gray-500">{formatDateTime(connection.created_at)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Note */}
      {connections.length >= 50 && (
        <div className="mt-4 text-center text-sm text-gray-600">
          Showing most recent 50 connections. Use time filters to see different periods.
        </div>
      )}
    </div>
  )
}




