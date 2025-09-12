'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  CalendarIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  BellIcon,
  ChartBarIcon,
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'

interface OnboardingSession {
  id: string
  user_id: string
  license_id?: string
  license_key_id?: string
  plugin_id: string
  session_type: string
  session_number: number
  title: string
  description?: string
  duration_minutes: number
  scheduled_at?: string
  assigned_admin_id?: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'
  completion_status?: 'passed' | 'failed' | 'needs_followup'
  started_at?: string
  completed_at?: string
  notes?: string
  user_feedback?: string
  user_profiles?: {
    id: string
    email: string
    full_name?: string
    company?: string
  }
  assigned_admin?: {
    id: string
    email: string
    full_name?: string
  }
  is_upcoming?: boolean
  is_past?: boolean
  minutes_until_session?: number
}

interface OnboardingProgress {
  id: string
  user_id: string
  license_id?: string
  license_key_id?: string
  total_sessions_required: number
  plugin_sessions_required: Record<string, number>
  sessions_completed: number
  plugin_sessions_completed: Record<string, number>
  overall_status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'suspended'
  onboarding_deadline: string
  license_active_status: boolean
  started_at: string
  completed_at?: string
  last_session_at?: string
  next_session_due?: string
  user_profiles?: {
    id: string
    email: string
    full_name?: string
    company?: string
  }
  completion_rate?: number
  is_overdue?: boolean
  days_until_deadline?: number
}

export default function OnboardingManagement() {
  const { userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<'sessions' | 'progress' | 'analytics'>('sessions')
  const [sessions, setSessions] = useState<OnboardingSession[]>([])
  const [progress, setProgress] = useState<OnboardingProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters and search
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal state
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<OnboardingSession | null>(null)
  const [isNewSession, setIsNewSession] = useState(false)

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions()
    } else if (activeTab === 'progress') {
      fetchProgress()
    }
  }, [activeTab])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/onboarding/sessions')
      
      if (!response.ok) {
        throw new Error('Failed to fetch sessions')
      }
      
      const data = await response.json()
      
      if (data.setup_required) {
        setError(`Database Setup Required: ${data.message}`)
        setSessions([])
        return
      }
      
      setSessions(data.sessions || [])
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const fetchProgress = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/onboarding/progress')
      
      if (!response.ok) {
        throw new Error('Failed to fetch progress')
      }
      
      const data = await response.json()
      
      if (data.setup_required) {
        setError(`Database Setup Required: ${data.message}`)
        setProgress([])
        return
      }
      
      setProgress(data.progress || [])
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load progress')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSession = () => {
    setSelectedSession(null)
    setIsNewSession(true)
    setIsSessionModalOpen(true)
  }

  const handleEditSession = (session: OnboardingSession) => {
    setSelectedSession(session)
    setIsNewSession(false)
    setIsSessionModalOpen(true)
  }

  const handleUpdateSessionStatus = async (sessionId: string, status: string, notes?: string) => {
    try {
      const response = await fetch('/api/admin/onboarding/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          status,
          notes,
          completed_at: status === 'completed' ? new Date().toISOString() : undefined
        })
      })

      if (!response.ok) throw new Error('Failed to update session')
      
      // Refresh sessions
      fetchSessions()
    } catch (error) {
      console.error('Error updating session:', error)
      setError('Failed to update session')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50'
      case 'scheduled': return 'text-blue-600 bg-blue-50'
      case 'in_progress': return 'text-yellow-600 bg-yellow-50'
      case 'overdue': return 'text-red-600 bg-red-50'
      case 'cancelled': return 'text-gray-600 bg-gray-50'
      case 'no_show': return 'text-orange-600 bg-orange-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircleIcon
      case 'scheduled': return CalendarIcon
      case 'in_progress': return ClockIcon
      case 'overdue': return ExclamationTriangleIcon
      case 'cancelled': return XCircleIcon
      case 'no_show': return XCircleIcon
      default: return ClockIcon
    }
  }

  const filteredSessions = sessions.filter(session => {
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter
    const matchesType = typeFilter === 'all' || session.session_type === typeFilter
    const matchesSearch = !searchTerm || 
      session.user_profiles?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.title.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesType && matchesSearch
  })

  const filteredProgress = progress.filter(item => {
    const matchesStatus = statusFilter === 'all' || item.overall_status === statusFilter
    const matchesSearch = !searchTerm || 
      item.user_profiles?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboarding Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage trial license onboarding sessions and track user progress
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleCreateSession}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Schedule Session
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
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
                    <li>Run the SQL script from <code className="bg-red-100 px-1 rounded">SETUP_ONBOARDING_TABLES.sql</code></li>
                    <li>Refresh this page</li>
                  </ol>
                  <p className="mt-2 text-xs text-red-600">
                    The SQL file has been created in your project root directory.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sessions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CalendarIcon className="inline-block w-5 h-5 mr-2" />
            Sessions ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'progress'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ChartBarIcon className="inline-block w-5 h-5 mr-2" />
            Progress ({progress.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DocumentTextIcon className="inline-block w-5 h-5 mr-2" />
            Analytics
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by user email, name, or session title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
          {activeTab === 'sessions' && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="initial">Initial</option>
              <option value="standard">Standard</option>
              <option value="plugin_specific">Plugin Specific</option>
              <option value="followup">Follow-up</option>
            </select>
          )}
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'sessions' && (
        <SessionsTab 
          sessions={filteredSessions}
          onEditSession={handleEditSession}
          onUpdateStatus={handleUpdateSessionStatus}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
      )}

      {activeTab === 'progress' && (
        <ProgressTab 
          progress={filteredProgress}
          getStatusColor={getStatusColor}
        />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsTab 
          sessions={sessions}
          progress={progress}
        />
      )}

      {/* Session Modal */}
      <SessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        session={selectedSession}
        isNew={isNewSession}
        onSave={() => {
          setIsSessionModalOpen(false)
          fetchSessions()
        }}
      />
    </div>
  )
}

// Sessions Tab Component
function SessionsTab({ 
  sessions, 
  onEditSession, 
  onUpdateStatus, 
  getStatusColor, 
  getStatusIcon 
}: {
  sessions: OnboardingSession[]
  onEditSession: (session: OnboardingSession) => void
  onUpdateStatus: (id: string, status: string, notes?: string) => void
  getStatusColor: (status: string) => string
  getStatusIcon: (status: string) => any
}) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No onboarding sessions</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by scheduling a new session.</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <ul className="divide-y divide-gray-200">
        {sessions.map((session) => {
          const StatusIcon = getStatusIcon(session.status)
          return (
            <li key={session.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`rounded-full p-2 ${getStatusColor(session.status)}`}>
                    <StatusIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{session.title}</h3>
                    <p className="text-sm text-gray-500">
                      {session.user_profiles?.full_name || session.user_profiles?.email}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500">
                        {session.plugin_id} • Session {session.session_number}
                      </span>
                      {session.scheduled_at && (
                        <span className="text-xs text-gray-500">
                          {new Date(session.scheduled_at).toLocaleString()}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {session.duration_minutes} min
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                    {session.status.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => onEditSession(session)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {session.notes && (
                <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  <strong>Notes:</strong> {session.notes}
                </div>
              )}
              {session.status === 'scheduled' && (
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => onUpdateStatus(session.id, 'in_progress')}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200"
                  >
                    Start Session
                  </button>
                  <button
                    onClick={() => onUpdateStatus(session.id, 'completed', 'Session completed successfully')}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-green-800 bg-green-100 hover:bg-green-200"
                  >
                    Mark Complete
                  </button>
                  <button
                    onClick={() => onUpdateStatus(session.id, 'no_show')}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-red-800 bg-red-100 hover:bg-red-200"
                  >
                    No Show
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Progress Tab Component
function ProgressTab({ 
  progress, 
  getStatusColor 
}: {
  progress: OnboardingProgress[]
  getStatusColor: (status: string) => string
}) {
  if (progress.length === 0) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No onboarding progress</h3>
        <p className="mt-1 text-sm text-gray-500">Progress will appear as users begin their onboarding journey.</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <ul className="divide-y divide-gray-200">
        {progress.map((item) => (
          <li key={item.id} className="p-6 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">
                  {item.user_profiles?.full_name || item.user_profiles?.email}
                </h3>
                <p className="text-sm text-gray-500">{item.user_profiles?.company}</p>
                
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      {item.sessions_completed} of {item.total_sessions_required} sessions completed
                    </span>
                    <span className="text-gray-500">{item.completion_rate}%</span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        item.completion_rate === 100 
                          ? 'bg-green-500' 
                          : item.completion_rate >= 50 
                          ? 'bg-blue-500' 
                          : 'bg-yellow-500'
                      }`}
                      style={{ width: `${item.completion_rate}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                  <span>Deadline: {new Date(item.onboarding_deadline).toLocaleDateString()}</span>
                  {item.days_until_deadline !== null && (
                    <span className={item.is_overdue ? 'text-red-600' : 'text-gray-500'}>
                      {item.is_overdue ? `${Math.abs(item.days_until_deadline)} days overdue` : `${item.days_until_deadline} days left`}
                    </span>
                  )}
                  {item.last_session_at && (
                    <span>Last session: {new Date(item.last_session_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              
              <div className="ml-6 flex flex-col items-end space-y-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.overall_status)}`}>
                  {item.overall_status.replace('_', ' ')}
                </span>
                {!item.license_active_status && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-red-800 bg-red-100">
                    License Suspended
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Analytics Tab Component
function AnalyticsTab({ 
  sessions, 
  progress 
}: {
  sessions: OnboardingSession[]
  progress: OnboardingProgress[]
}) {
  const stats = {
    totalSessions: sessions.length,
    completedSessions: sessions.filter(s => s.status === 'completed').length,
    scheduledSessions: sessions.filter(s => s.status === 'scheduled').length,
    overdueUsers: progress.filter(p => p.is_overdue).length,
    completedOnboarding: progress.filter(p => p.overall_status === 'completed').length,
    averageCompletionRate: progress.length > 0 
      ? Math.round(progress.reduce((sum, p) => sum + (p.completion_rate || 0), 0) / progress.length)
      : 0
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Sessions</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalSessions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed Sessions</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.completedSessions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Scheduled Sessions</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.scheduledSessions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Overdue Users</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.overdueUsers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed Onboarding</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.completedOnboarding}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg. Completion Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.averageCompletionRate}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and additional analytics can be added here */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Onboarding Insights</h3>
        <div className="text-sm text-gray-600">
          <p className="mb-2">
            📊 <strong>Completion Rate:</strong> {stats.averageCompletionRate}% average across all users
          </p>
          <p className="mb-2">
            ⏰ <strong>Sessions Today:</strong> {sessions.filter(s => 
              s.scheduled_at && 
              new Date(s.scheduled_at).toDateString() === new Date().toDateString()
            ).length} scheduled
          </p>
          <p className="mb-2">
            🔴 <strong>At Risk:</strong> {stats.overdueUsers} users have exceeded their onboarding deadline
          </p>
          <p>
            ✅ <strong>Success Rate:</strong> {progress.length > 0 ? Math.round((stats.completedOnboarding / progress.length) * 100) : 0}% of users have completed onboarding
          </p>
        </div>
      </div>
    </div>
  )
}

// Session Modal Component (simplified for space)
function SessionModal({
  isOpen,
  onClose,
  session,
  isNew,
  onSave
}: {
  isOpen: boolean
  onClose: () => void
  session: OnboardingSession | null
  isNew: boolean
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    user_email: '',
    plugin_id: 'centcom',
    session_type: 'standard',
    duration_minutes: 30,
    scheduled_at: '',
    notes: ''
  })

  useEffect(() => {
    if (session && !isNew) {
      setFormData({
        title: session.title || '',
        description: session.description || '',
        user_email: session.user_profiles?.email || '',
        plugin_id: session.plugin_id || 'centcom',
        session_type: session.session_type || 'standard',
        duration_minutes: session.duration_minutes || 30,
        scheduled_at: session.scheduled_at ? new Date(session.scheduled_at).toISOString().slice(0, 16) : '',
        notes: session.notes || ''
      })
    } else if (isNew) {
      setFormData({
        title: '',
        description: '',
        user_email: '',
        plugin_id: 'centcom',
        session_type: 'standard',
        duration_minutes: 30,
        scheduled_at: '',
        notes: ''
      })
    }
  }, [session, isNew])

  const handleSave = async () => {
    try {
      const url = isNew ? '/api/admin/onboarding/sessions' : '/api/admin/onboarding/sessions'
      const method = isNew ? 'POST' : 'PUT'
      
      const body: any = {
        ...formData,
        scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null
      }

      if (!isNew && session) {
        body.session_id = session.id
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) throw new Error('Failed to save session')

      onSave()
    } catch (error) {
      console.error('Error saving session:', error)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title className="text-lg font-medium leading-6 text-gray-900">
                  {isNew ? 'Schedule New Session' : 'Edit Session'}
                </Dialog.Title>
                
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Session title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">User Email</label>
                    <input
                      type="email"
                      value={formData.user_email}
                      onChange={(e) => setFormData({...formData, user_email: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Scheduled Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.scheduled_at}
                      onChange={(e) => setFormData({...formData, scheduled_at: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Plugin</label>
                      <select
                        value={formData.plugin_id}
                        onChange={(e) => setFormData({...formData, plugin_id: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="centcom">Centcom</option>
                        <option value="analytics">Analytics</option>
                        <option value="reporting">Reporting</option>
                        <option value="dashboard">Dashboard</option>
                        <option value="integrations">Integrations</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Duration (min)</label>
                      <input
                        type="number"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        min="15"
                        max="120"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Session Type</label>
                    <select
                      value={formData.session_type}
                      onChange={(e) => setFormData({...formData, session_type: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="initial">Initial</option>
                      <option value="standard">Standard</option>
                      <option value="plugin_specific">Plugin Specific</option>
                      <option value="followup">Follow-up</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description/Notes</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Session description or admin notes"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={onClose}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {isNew ? 'Schedule' : 'Save'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
