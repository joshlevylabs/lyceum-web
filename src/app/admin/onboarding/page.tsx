'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  UserGroupIcon,
  CalendarIcon,
  ChartBarIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  full_name?: string
  company?: string
  created_at: string
}

interface OnboardingSession {
  id: string
  user_id: string
  license_key_id?: string
  plugin_id: string
  session_type: string
  session_number: number
  title: string
  description?: string
  duration_minutes: number
  scheduled_at?: string
  assigned_admin_id?: string
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  completion_notes?: string
  centcom_connection_url?: string
  lyceum_connection_url?: string
  created_at: string
  updated_at: string
  user_profiles?: User
  assigned_admin?: {
    id: string
    email: string
    full_name?: string
  }
  license_keys?: {
    id: string
    key_code: string
    license_type: string
    enabled_plugins: string[]
    status: string
    expires_at?: string
  }
}

interface OnboardingProgress {
  id: string
  user_id: string
  license_key_id?: string
  plugin_id: string
  total_sessions_required: number
  sessions_completed: number
  overall_status: 'not_started' | 'in_progress' | 'completed' | 'overdue'
  onboarding_deadline?: string
  created_at: string
  updated_at: string
  user_profiles?: User
  license_keys?: {
    id: string
    key_code: string
    license_type: string
    enabled_plugins: string[]
    status: string
    expires_at?: string
  }
  completion_rate?: number
  is_overdue?: boolean
  days_until_deadline?: number
}

export default function AdminOnboardingManagement() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('calendar')
  const [sessions, setSessions] = useState<OnboardingSession[]>([])
  const [progress, setProgress] = useState<OnboardingProgress[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSession, setSelectedSession] = useState<OnboardingSession | null>(null)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [sessionNotes, setSessionNotes] = useState('')

  // Fetch data
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch sessions, progress, and users in parallel
      const [sessionsRes, progressRes, usersRes] = await Promise.all([
        fetch('/api/admin/onboarding/sessions'),
        fetch('/api/admin/onboarding/progress'),
        fetch('/api/admin/users/list') // Assuming you have this endpoint
      ])

      if (!sessionsRes.ok || !progressRes.ok) {
        throw new Error('Failed to fetch onboarding data')
      }

      const [sessionsData, progressData] = await Promise.all([
        sessionsRes.json(),
        progressRes.json()
      ])

      if (sessionsData.error) {
        setError(sessionsData.error)
        if (sessionsData.setup_required) {
          return
        }
      }

      setSessions(sessionsData.sessions || [])
      setProgress(progressData.progress || [])
      
      // If users endpoint exists, use it, otherwise extract from sessions/progress
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
      }

    } catch (err) {
      console.error('Failed to fetch onboarding data:', err)
      setError('Failed to load onboarding data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Get unique users from sessions and progress data
  const getAllUsers = () => {
    const userMap = new Map<string, User>()
    
    sessions.forEach(session => {
      if (session.user_profiles) {
        userMap.set(session.user_profiles.id, session.user_profiles)
      }
    })
    
    progress.forEach(prog => {
      if (prog.user_profiles) {
        userMap.set(prog.user_profiles.id, prog.user_profiles)
      }
    })

    return Array.from(userMap.values())
  }

  const allUsers = users.length > 0 ? users : getAllUsers()

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getSessionsForDate = (date: Date) => {
    const dateStr = date.toDateString()
    return sessions.filter(session => {
      if (!session.scheduled_at) return false
      const sessionDate = new Date(session.scheduled_at)
      return sessionDate.toDateString() === dateStr
    })
  }

  const getOverdueUsersForDate = (date: Date) => {
    const dateStr = date.toDateString()
    return progress.filter(prog => {
      if (!prog.onboarding_deadline) return false
      const deadline = new Date(prog.onboarding_deadline)
      return deadline.toDateString() === dateStr && prog.is_overdue
    })
  }

  const getTrialExpiringForDate = (date: Date) => {
    const dateStr = date.toDateString()
    return progress.filter(prog => {
      if (!prog.license_keys || prog.license_keys.license_type !== 'trial') return false
      if (!prog.onboarding_deadline) return false
      
      const deadline = new Date(prog.onboarding_deadline)
      const trialPauseDate = new Date(deadline.getTime() + (7 * 24 * 60 * 60 * 1000)) // 7 days after deadline
      
      return trialPauseDate.toDateString() === dateStr && prog.is_overdue
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  // Session management functions
  const openSessionModal = (session: OnboardingSession) => {
    setSelectedSession(session)
    setSessionNotes(session.notes || '')
    setShowSessionModal(true)
  }

  const saveSessionNotes = async () => {
    if (!selectedSession) return

    try {
      const response = await fetch('/api/admin/onboarding/sessions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: selectedSession.id,
          notes: sessionNotes
        })
      })

      if (response.ok) {
        // Update local state
        setSessions(prev => prev.map(s => 
          s.id === selectedSession.id 
            ? { ...s, notes: sessionNotes }
            : s
        ))
        setShowSessionModal(false)
        setSelectedSession(null)
      } else {
        console.error('Failed to save session notes')
      }
    } catch (error) {
      console.error('Error saving session notes:', error)
    }
  }

  const connectToCentcom = (session: OnboardingSession) => {
    if (session.centcom_connection_url) {
      window.open(session.centcom_connection_url, '_blank')
    } else {
      // Generate connection URL based on user and license info
      const connectionUrl = `/admin/live-connection/centcom/${session.user_id}?session_id=${session.id}`
      window.open(connectionUrl, '_blank')
    }
  }

  const connectToLyceum = (session: OnboardingSession) => {
    if (session.lyceum_connection_url) {
      window.open(session.lyceum_connection_url, '_blank')
    } else {
      // Generate connection URL based on user info
      const connectionUrl = `/admin/live-connection/lyceum/${session.user_id}?session_id=${session.id}`
      window.open(connectionUrl, '_blank')
    }
  }

  // Filter functions
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = !searchTerm || 
      session.user_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.title?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const filteredProgress = progress.filter(prog => {
    // Handle cases where user_profiles might be null due to simplified query
    const email = prog.user_profiles?.email || `User ${prog.user_id}`
    const fullName = prog.user_profiles?.full_name || ''
    
    const matchesSearch = !searchTerm || 
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || prog.overall_status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Stats calculations
  const stats = {
    totalUsers: allUsers.length,
    totalSessions: sessions.length,
    completedSessions: sessions.filter(s => s.status === 'completed').length,
    upcomingSessions: sessions.filter(s => s.status === 'scheduled').length,
    overdueUsers: progress.filter(p => p.is_overdue).length,
    trialUsers: progress.filter(p => p.license_keys?.license_type === 'trial').length
  }

  const tabs = [
    { id: 'calendar', name: 'Calendar', icon: CalendarIcon },
    { id: 'sessions', name: 'Sessions', icon: ChartBarIcon },
    { id: 'users', name: 'User Progress', icon: UserGroupIcon }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
                {error.includes('Database Setup Required') && (
                  <div className="mt-3 text-sm text-red-700">
                    <p className="font-medium">Setup Instructions:</p>
                    <ol className="mt-2 ml-4 list-decimal">
                      <li>Go to your Supabase dashboard</li>
                      <li>Open the SQL Editor</li>
                      <li>Run the SQL script from <code className="bg-red-100 px-1 rounded">SETUP_ONBOARDING_TABLES_FIXED.sql</code></li>
                      <li>Refresh this page</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Onboarding Management
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage user onboarding sessions and track trial license compliance
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.totalSessions}</p>
                <p className="text-sm text-gray-600">Total Sessions</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.completedSessions}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.upcomingSessions}</p>
                <p className="text-sm text-gray-600">Upcoming</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.overdueUsers}</p>
                <p className="text-sm text-gray-600">Overdue</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <XCircleIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.trialUsers}</p>
                <p className="text-sm text-gray-600">Trial Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users, sessions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <FunnelIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Schedule Session
                </button>
                <button
                  onClick={fetchData}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'calendar' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 hover:bg-gray-100 rounded-md"
                  >
                    <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 hover:bg-gray-100 rounded-md"
                  >
                    <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-0 mb-4">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50 border-r border-b border-gray-200 last:border-r-0">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {Array.from({ length: getFirstDayOfMonth(currentDate) }, (_, i) => (
                  <div key={`empty-${i}`} className="h-24 border-r border-b border-gray-200 last:border-r-0 bg-gray-50"></div>
                ))}

                {Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => {
                  const day = i + 1
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                  const todaySessions = getSessionsForDate(date)
                  const overdueUsers = getOverdueUsersForDate(date)
                  const trialExpiring = getTrialExpiringForDate(date)
                  const isToday = date.toDateString() === new Date().toDateString()
                  const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDate(date)}
                      className={`h-24 p-1 border-r border-b border-gray-200 last:border-r-0 cursor-pointer hover:bg-gray-50 ${
                        isToday ? 'bg-blue-50' : ''
                      } ${isSelected ? 'bg-blue-100' : ''}`}
                    >
                      <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                        {day}
                      </div>
                      
                      {/* Session indicators */}
                      <div className="space-y-1 mt-1">
                        {todaySessions.slice(0, 2).map((session, idx) => (
                          <div
                            key={session.id}
                            className={`text-xs px-1 py-0.5 rounded truncate ${
                              session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              session.status === 'completed' ? 'bg-green-100 text-green-800' :
                              session.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {session.user_profiles?.email?.split('@')[0] || 'User'}
                          </div>
                        ))}
                        
                        {todaySessions.length > 2 && (
                          <div className="text-xs text-gray-500">+{todaySessions.length - 2} more</div>
                        )}

                        {/* Overdue indicators */}
                        {overdueUsers.length > 0 && (
                          <div className="text-xs px-1 py-0.5 bg-red-100 text-red-800 rounded truncate">
                            {overdueUsers.length} overdue
                          </div>
                        )}

                        {/* Trial expiring indicators */}
                        {trialExpiring.length > 0 && (
                          <div className="text-xs px-1 py-0.5 bg-orange-100 text-orange-800 rounded truncate">
                            {trialExpiring.length} trial ending
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Selected Date Details */}
              {selectedDate && (
                <div className="mt-6 border-t pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h4>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Scheduled Sessions */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Scheduled Sessions</h5>
                      <div className="space-y-2">
                        {getSessionsForDate(selectedDate).map((session) => (
                          <div key={session.id} className="p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-blue-900">{session.title}</p>
                                <p className="text-sm text-blue-700">
                                  {session.user_profiles?.email} • {new Date(session.scheduled_at!).toLocaleTimeString()}
                                </p>
                              </div>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                session.status === 'completed' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {session.status}
                              </span>
                            </div>
                          </div>
                        ))}
                        {getSessionsForDate(selectedDate).length === 0 && (
                          <p className="text-sm text-gray-500">No sessions scheduled</p>
                        )}
                      </div>
                    </div>

                    {/* Overdue Users */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Overdue Users</h5>
                      <div className="space-y-2">
                        {getOverdueUsersForDate(selectedDate).map((prog) => (
                          <div key={prog.id} className="p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center">
                              <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-2" />
                              <div>
                                <p className="font-medium text-red-900">
                                  {prog.user_profiles?.email || `User ${prog.user_id}`}
                                </p>
                                <p className="text-sm text-red-700">
                                  {prog.sessions_completed}/{prog.total_sessions_required} sessions completed
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {getOverdueUsersForDate(selectedDate).length === 0 && (
                          <p className="text-sm text-gray-500">No overdue users</p>
                        )}
                      </div>
                    </div>

                    {/* Trial Expiring */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Trial Pauses/Cancellations</h5>
                      <div className="space-y-2">
                        {getTrialExpiringForDate(selectedDate).map((prog) => (
                          <div key={prog.id} className="p-3 bg-orange-50 rounded-lg">
                            <div className="flex items-center">
                              <ClockIcon className="h-4 w-4 text-orange-500 mr-2" />
                              <div>
                                <p className="font-medium text-orange-900">
                                  {prog.user_profiles?.email || `User ${prog.user_id}`}
                                </p>
                                <p className="text-sm text-orange-700">
                                  Trial will pause due to overdue onboarding
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {getTrialExpiringForDate(selectedDate).length === 0 && (
                          <p className="text-sm text-gray-500">No trials expiring</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scheduled
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Live Connection
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSessions.map((session) => (
                    <tr key={session.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {session.user_profiles?.full_name || session.user_profiles?.email}
                          </div>
                          <div className="text-sm text-gray-500">{session.user_profiles?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{session.title}</div>
                          <div className="text-sm text-gray-500">
                            {session.plugin_id} • Session {session.session_number} • {session.duration_minutes}min
                          </div>
                          {session.description && (
                            <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                              {session.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.scheduled_at ? (
                          <div>
                            <div>{new Date(session.scheduled_at).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(session.scheduled_at).toLocaleTimeString()}
                            </div>
                          </div>
                        ) : (
                          'Not scheduled'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          session.status === 'completed' ? 'bg-green-100 text-green-800' :
                          session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          session.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          session.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {session.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs">
                          {session.notes ? (
                            <div className="truncate" title={session.notes}>
                              {session.notes}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No notes</span>
                          )}
                          {session.completion_notes && (
                            <div className="text-xs text-green-600 mt-1 truncate" title={session.completion_notes}>
                              Completion: {session.completion_notes}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => connectToCentcom(session)}
                            disabled={session.status !== 'in_progress' && session.status !== 'scheduled'}
                            className={`px-2 py-1 text-xs rounded-md ${
                              session.status === 'in_progress' || session.status === 'scheduled'
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            title="Connect to user's Centcom application"
                          >
                            Centcom
                          </button>
                          <button
                            onClick={() => connectToLyceum(session)}
                            disabled={session.status !== 'in_progress' && session.status !== 'scheduled'}
                            className={`px-2 py-1 text-xs rounded-md ${
                              session.status === 'in_progress' || session.status === 'scheduled'
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            title="Connect to user's Lyceum portal"
                          >
                            Lyceum
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => openSessionModal(session)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View/Edit Session Notes"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button 
                            className="text-green-600 hover:text-green-900"
                            title="View Session Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button 
                            className="text-red-600 hover:text-red-900"
                            title="Cancel Session"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredSessions.length === 0 && (
                <div className="text-center py-12">
                  <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No onboarding sessions match your current filters.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      License
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deadline
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProgress.map((prog) => (
                    <tr key={prog.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {prog.user_profiles?.full_name || prog.user_profiles?.email || `User ${prog.user_id}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {prog.user_profiles?.email || `ID: ${prog.user_id}`}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${prog.completion_rate || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{prog.completion_rate || 0}%</span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {prog.sessions_completed}/{prog.total_sessions_required} sessions
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {prog.license_keys?.license_type || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {prog.plugin_id || 'centcom'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          prog.overall_status === 'completed' ? 'bg-green-100 text-green-800' :
                          prog.overall_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          prog.overall_status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {prog.overall_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prog.onboarding_deadline ? (
                          <div>
                            <div>{new Date(prog.onboarding_deadline).toLocaleDateString()}</div>
                            <div className={`text-xs ${prog.is_overdue ? 'text-red-600' : 'text-gray-500'}`}>
                              {prog.days_until_deadline && prog.days_until_deadline > 0 
                                ? `${prog.days_until_deadline} days left`
                                : prog.is_overdue 
                                ? 'Overdue'
                                : 'Today'
                              }
                            </div>
                          </div>
                        ) : (
                          'No deadline'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button 
                          onClick={() => setShowCreateModal(true)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-900">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredProgress.length === 0 && (
                <div className="text-center py-12">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No user progress data matches your current filters.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Session Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Onboarding Session</h3>
            <p className="text-sm text-gray-600 mb-4">
              Session creation form would go here. This allows admins to schedule onboarding sessions for any user.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Notes Modal */}
      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Session Details & Notes</h3>
                  <p className="text-sm text-gray-600">
                    {selectedSession.title} - {selectedSession.user_profiles?.email}
                  </p>
                </div>
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Session Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-sm text-gray-900 capitalize">
                    {selectedSession.status.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Scheduled</label>
                  <p className="text-sm text-gray-900">
                    {selectedSession.scheduled_at 
                      ? new Date(selectedSession.scheduled_at).toLocaleString()
                      : 'Not scheduled'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Duration</label>
                  <p className="text-sm text-gray-900">{selectedSession.duration_minutes} minutes</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Plugin</label>
                  <p className="text-sm text-gray-900">{selectedSession.plugin_id}</p>
                </div>
              </div>

              {/* Description */}
              {selectedSession.description && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                    {selectedSession.description}
                  </div>
                </div>
              )}

              {/* Session Notes */}
              <div className="mb-6">
                <label htmlFor="session-notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Session Notes
                </label>
                <textarea
                  id="session-notes"
                  rows={6}
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add notes about this onboarding session..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use this space to document session progress, user feedback, issues encountered, and next steps.
                </p>
              </div>

              {/* Completion Notes (read-only if completed) */}
              {selectedSession.completion_notes && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Completion Notes
                  </label>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-gray-900">
                    {selectedSession.completion_notes}
                  </div>
                </div>
              )}

              {/* Live Connection Info */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Live Connection Options</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => connectToCentcom(selectedSession)}
                      disabled={selectedSession.status !== 'in_progress' && selectedSession.status !== 'scheduled'}
                      className={`px-3 py-1 text-sm rounded-md ${
                        selectedSession.status === 'in_progress' || selectedSession.status === 'scheduled'
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Connect to Centcom Application
                    </button>
                    <span className="text-xs text-gray-600">
                      {selectedSession.status === 'in_progress' || selectedSession.status === 'scheduled'
                        ? 'Available during scheduled/active sessions'
                        : 'Only available for active sessions'
                      }
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => connectToLyceum(selectedSession)}
                      disabled={selectedSession.status !== 'in_progress' && selectedSession.status !== 'scheduled'}
                      className={`px-3 py-1 text-sm rounded-md ${
                        selectedSession.status === 'in_progress' || selectedSession.status === 'scheduled'
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Connect to Lyceum Portal
                    </button>
                    <span className="text-xs text-gray-600">
                      {selectedSession.status === 'in_progress' || selectedSession.status === 'scheduled'
                        ? 'Available during scheduled/active sessions'
                        : 'Only available for active sessions'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowSessionModal(false)
                    setSelectedSession(null)
                    setSessionNotes('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSessionNotes}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}