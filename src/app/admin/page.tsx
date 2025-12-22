'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Key,
  Database,
  ChartBar,
  HardDrives,
  Warning,
  CheckCircle,
  Clock,
  GraduationCap,
  Calendar,
  User,
  ArrowsClockwise
} from '@phosphor-icons/react'

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
      icon: Users,
      href: '/admin/users'
    },
    {
      name: 'License Keys',
      value: stats.totalLicenses,
      subtext: `${stats.activeLicenses} active`,
      icon: Key,
      href: '/admin/licenses'
    },
    {
      name: 'Database Clusters',
      value: stats.totalClusters,
      subtext: `${stats.healthyClusters} healthy`,
      icon: Database,
      href: '/admin/clusters'
    },
    {
      name: 'Pending Onboarding',
      value: stats.pendingOnboarding,
      subtext: 'users waiting',
      icon: Clock,
      href: '/admin/onboarding'
    }
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return Users
      case 'license': return Key
      case 'cluster': return HardDrives
      case 'onboarding': return CheckCircle
      default: return ChartBar
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user': return 'text-cyan-400'
      case 'license': return 'text-emerald-400'
      case 'cluster': return 'text-cyan-400'
      case 'onboarding': return 'text-cyan-400'
      default: return 'text-foreground/60'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card overflow-hidden animate-pulse">
              <div className="p-5">
                <div className="h-4 bg-cyan-500/10 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-cyan-500/10 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-cyan-500/10 rounded w-1/3"></div>
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
          <h1 className="text-2xl font-bold leading-7 text-foreground sm:text-3xl sm:truncate">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Platform overview and management center
          </p>
        </div>

        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={loadDashboardData}
            className="btn-ghost inline-flex items-center"
          >
            <ArrowsClockwise className="h-5 w-5 mr-2" weight="regular" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.name} className="glass-card overflow-hidden p-5 cursor-pointer">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <Icon className="h-6 w-6 text-cyan-400" weight="duotone" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-foreground/60">
                      {card.name}
                    </dt>
                    <dd className="mt-1 text-3xl font-bold tracking-tight text-gradient-cyan">
                      {card.value.toLocaleString()}
                    </dd>
                    <dd className="text-sm text-foreground/60">
                      {card.subtext}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="glass-card">
          <div className="px-6 py-4 border-b border-cyan-500/10">
            <h3 className="text-lg font-medium text-foreground">Recent Activity</h3>
          </div>
          <div className="divide-y divide-cyan-500/10">
            {stats.recentActivity.map((activity) => {
              const Icon = getActivityIcon(activity.type)
              return (
                <div key={`activity-${activity.id}`} className="px-6 py-4 flex items-center space-x-3">
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full ${getActivityColor(activity.type).replace('text-', 'bg-')}`} />
                  <Icon className={`flex-shrink-0 w-5 h-5 ${getActivityColor(activity.type)}`} weight="duotone" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activity.action}
                    </p>
                    <p className="text-sm text-foreground/60 truncate">
                      {activity.user || activity.cluster}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-sm text-foreground/60">
                    {activity.time}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="px-6 py-4 border-t border-cyan-500/10">
            <a href="/admin/analytics" className="text-sm font-medium text-cyan-400 hover:text-cyan-300">
              View all activity →
            </a>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card">
          <div className="px-6 py-4 border-b border-cyan-500/10">
            <h3 className="text-lg font-medium text-foreground">Quick Actions</h3>
          </div>
          <div className="p-6 space-y-4">
            <a
              href="/admin/licenses/create"
              className="btn-primary block w-full text-center"
            >
              Create License Key
            </a>
            <a
              href="/admin/clusters/create"
              className="btn-ghost block w-full text-center"
            >
              Create Database Cluster
            </a>
            <a
              href="/admin/users"
              className="btn-ghost block w-full text-center"
            >
              Manage Users
            </a>
            <a
              href="/admin/onboarding"
              className="btn-ghost block w-full text-center"
            >
              Review Onboarding
            </a>
          </div>
        </div>
      </div>

      {/* Upcoming Onboarding Sessions */}
      <div className="glass-card">
        <div className="px-6 py-4 border-b border-cyan-500/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-foreground flex items-center">
              <GraduationCap className="w-5 h-5 mr-2 text-cyan-400" weight="duotone" />
              Upcoming Onboarding Sessions
            </h3>
            <span className="text-sm text-foreground/60">
              {upcomingSessions.length} sessions scheduled
            </span>
          </div>
        </div>
        <div className="divide-y divide-cyan-500/10">
          {loadingSessions ? (
            <div className="px-6 py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-500 mx-auto"></div>
              <p className="mt-2 text-sm text-foreground/60">Loading sessions...</p>
            </div>
          ) : upcomingSessions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <GraduationCap className="w-12 h-12 text-foreground/40 mx-auto" weight="duotone" />
              <p className="mt-2 text-sm text-foreground/60">No upcoming sessions scheduled</p>
            </div>
          ) : (
            <>
              {upcomingSessions.slice(0, 5).map((session) => (
                <div key={`session-${session.id}`} className="px-6 py-4 flex items-center space-x-3">
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                    session.is_mandatory ? 'bg-red-500' : 'bg-cyan-500'
                  }`} />
                  <Calendar className="flex-shrink-0 w-5 h-5 text-foreground/40" weight="regular" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {session.title}
                    </p>
                    <p className="text-sm text-foreground/60 truncate flex items-center">
                      <User className="w-4 h-4 mr-1" weight="regular" />
                      {session.user_profiles?.full_name || session.user_profiles?.email || 'Unknown User'}
                      {session.license_keys && (
                        <span className="ml-2 px-2 py-1 text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
                          {session.license_keys.key_code}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm text-foreground">
                      {new Date(session.scheduled_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-foreground/60">
                      {new Date(session.scheduled_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      session.is_mandatory
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    }`}>
                      {session.is_mandatory ? 'Required' : 'Optional'}
                    </span>
                  </div>
                </div>
              ))}
              {upcomingSessions.length > 5 && (
                <div className="px-6 py-4 border-t border-cyan-500/10 text-center">
                  <p className="text-sm text-foreground/60">
                    And {upcomingSessions.length - 5} more sessions...
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-cyan-500/10">
          <a href="/admin/onboarding" className="text-sm font-medium text-cyan-400 hover:text-cyan-300">
            Manage all sessions →
          </a>
        </div>
      </div>

      {/* System Status */}
      <div className="glass-card">
        <div className="px-6 py-4 border-b border-cyan-500/10">
          <h3 className="text-lg font-medium text-foreground">System Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-emerald-400 mr-2" weight="duotone" />
              <span className="text-sm text-foreground">Database: Healthy</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-emerald-400 mr-2" weight="duotone" />
              <span className="text-sm text-foreground">API: Operational</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-emerald-400 mr-2" weight="duotone" />
              <span className="text-sm text-foreground">Storage: Available</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

