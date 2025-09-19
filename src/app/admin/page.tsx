'use client'

import { useState, useEffect } from 'react'
import {
  UsersIcon,
  KeyIcon,
  CircleStackIcon,
  ChartBarIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  AcademicCapIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalLicenses: number
  activeLicenses: number
  totalClusters: number
  healthyClusters: number
  pendingOnboarding: number
  recentActivity: any[]
}

interface OnboardingSession {
  id: string
  title: string
  scheduled_at: string
  user_id: string
  license_key_id: string
  status: string
  is_mandatory: boolean
  duration_minutes: number
  user_profiles?: {
    full_name: string
    email: string
  }
  license_keys?: {
    key_code: string
    license_type: string
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalLicenses: 0,
    activeLicenses: 0,
    totalClusters: 0,
    healthyClusters: 0,
    pendingOnboarding: 0,
    recentActivity: []
  })
  const [loading, setLoading] = useState(true)
  const [upcomingSessions, setUpcomingSessions] = useState<OnboardingSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  useEffect(() => {
    loadDashboardData()
    loadUpcomingSessions()
  }, [])

  const loadUpcomingSessions = async () => {
    try {
      setLoadingSessions(true)
      const response = await fetch('/api/admin/onboarding/upcoming-sessions', {
        cache: 'no-store'
      })
      
      if (response.ok) {
        const data = await response.json()
        // Deduplicate sessions by ID to prevent duplicate key errors
        const sessions = data.sessions || []
        const uniqueSessions = sessions.filter((session: any, index: number, arr: any[]) => 
          arr.findIndex(s => s.id === session.id) === index
        )
        setUpcomingSessions(uniqueSessions)
      }
    } catch (error) {
      console.error('Failed to load upcoming sessions:', error)
      setUpcomingSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch real dashboard statistics from API
      const response = await fetch('/api/admin/dashboard/stats', {
        cache: 'no-store'
      })
      
      if (response.ok) {
        const data = await response.json()
        // Deduplicate recent activity by ID to prevent duplicate key errors
        const stats = data.stats
        if (stats && stats.recentActivity) {
          stats.recentActivity = stats.recentActivity.filter((activity: any, index: number, arr: any[]) => 
            arr.findIndex(a => a.id === activity.id) === index
          )
        }
        setStats(stats)
      } else {
        console.error('Failed to load dashboard stats:', response.statusText)
        // Set default stats on error
        setStats({
          totalUsers: 0,
          activeUsers: 0,
          totalLicenses: 0,
          activeLicenses: 0,
          totalClusters: 0,
          healthyClusters: 0,
          pendingOnboarding: 0,
          recentActivity: []
        })
      }
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      // Set default stats on error
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        totalLicenses: 0,
        activeLicenses: 0,
        totalClusters: 0,
        healthyClusters: 0,
        pendingOnboarding: 0,
        recentActivity: []
      })
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      name: 'Total Users',
      value: stats.totalUsers,
      subtext: `${stats.activeUsers} active`,
      icon: UsersIcon,
      color: 'bg-blue-500',
      href: '/admin/users'
    },
    {
      name: 'License Keys',
      value: stats.totalLicenses,
      subtext: `${stats.activeLicenses} active`,
      icon: KeyIcon,
      color: 'bg-green-500',
      href: '/admin/licenses'
    },
    {
      name: 'Database Clusters',
      value: stats.totalClusters,
      subtext: `${stats.healthyClusters} healthy`,
      icon: CircleStackIcon,
      color: 'bg-purple-500',
      href: '/admin/clusters'
    },
    {
      name: 'Pending Onboarding',
      value: stats.pendingOnboarding,
      subtext: 'users waiting',
      icon: ClockIcon,
      color: 'bg-orange-500',
      href: '/admin/onboarding'
    }
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return UsersIcon
      case 'license': return KeyIcon
      case 'cluster': return ServerIcon
      case 'onboarding': return CheckCircleIcon
      default: return ChartBarIcon
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user': return 'text-blue-600'
      case 'license': return 'text-green-600'
      case 'cluster': return 'text-purple-600'
      case 'onboarding': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
              <div className="p-5">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Platform overview and management center
          </p>
        </div>
        
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={loadDashboardData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.name} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 ${card.color} rounded-md flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {card.name}
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {card.value.toLocaleString()}
                      </dd>
                      <dd className="text-sm text-gray-500">
                        {card.subtext}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {stats.recentActivity.map((activity) => {
              const Icon = getActivityIcon(activity.type)
              return (
                <div key={`activity-${activity.id}`} className="px-6 py-4 flex items-center space-x-3">
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full ${getActivityColor(activity.type).replace('text-', 'bg-')}`} />
                  <Icon className={`flex-shrink-0 w-5 h-5 ${getActivityColor(activity.type)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {activity.user || activity.cluster}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-sm text-gray-500">
                    {activity.time}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="px-6 py-4 border-t border-gray-200">
            <a href="/admin/analytics" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              View all activity →
            </a>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6 space-y-4">
            <a
              href="/admin/licenses/create"
              className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create License Key
            </a>
            <a
              href="/admin/clusters/create"
              className="block w-full bg-green-600 text-white text-center py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              Create Database Cluster
            </a>
            <a
              href="/admin/users"
              className="block w-full bg-gray-600 text-white text-center py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
            >
              Manage Users
            </a>
            <a
              href="/admin/onboarding"
              className="block w-full bg-orange-600 text-white text-center py-2 px-4 rounded-md hover:bg-orange-700 transition-colors"
            >
              Review Onboarding
            </a>
          </div>
        </div>
      </div>

      {/* Upcoming Onboarding Sessions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <AcademicCapIcon className="w-5 h-5 mr-2 text-blue-600" />
              Upcoming Onboarding Sessions
            </h3>
            <span className="text-sm text-gray-500">
              {upcomingSessions.length} sessions scheduled
            </span>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {loadingSessions ? (
            <div className="px-6 py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading sessions...</p>
            </div>
          ) : upcomingSessions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <AcademicCapIcon className="w-12 h-12 text-gray-400 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">No upcoming sessions scheduled</p>
            </div>
          ) : (
            <>
              {upcomingSessions.slice(0, 5).map((session) => (
                <div key={`session-${session.id}`} className="px-6 py-4 flex items-center space-x-3">
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                    session.is_mandatory ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <CalendarIcon className="flex-shrink-0 w-5 h-5 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session.title}
                    </p>
                    <p className="text-sm text-gray-500 truncate flex items-center">
                      <UserIcon className="w-4 h-4 mr-1" />
                      {session.user_profiles?.full_name || session.user_profiles?.email || 'Unknown User'}
                      {session.license_keys && (
                        <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                          {session.license_keys.key_code}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm text-gray-900">
                      {new Date(session.scheduled_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(session.scheduled_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      session.is_mandatory 
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {session.is_mandatory ? 'Required' : 'Optional'}
                    </span>
                  </div>
                </div>
              ))}
              {upcomingSessions.length > 5 && (
                <div className="px-6 py-4 border-t border-gray-200 text-center">
                  <p className="text-sm text-gray-500">
                    And {upcomingSessions.length - 5} more sessions...
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200">
          <a href="/admin/onboarding" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            Manage all sessions →
          </a>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">System Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-sm text-gray-900">Database: Healthy</span>
            </div>
            <div className="flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-sm text-gray-900">API: Operational</span>
            </div>
            <div className="flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-sm text-gray-900">Storage: Available</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

