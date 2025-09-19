'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  UserIcon,
  KeyIcon,
  ChartBarIcon,
  CogIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  PresentationChartLineIcon,
  TableCellsIcon,
  CubeIcon,
  PlayIcon,
  AcademicCapIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline'

interface UserProfile {
  email: string
  full_name: string
  username: string
  role: string
  company?: string
  onboarding_status?: string
}

interface OnboardingSession {
  id: string
  title: string
  description?: string
  plugin_id: string
  session_type: string
  status: string
  scheduled_at?: string
  duration_minutes: number
  is_mandatory: boolean
  meeting_link?: string
  session_notes?: string
  license_keys?: {
    id: string
    key_code: string
    license_type: string
    status: string
  }
}

interface OnboardingSessions {
  upcoming: OnboardingSession[]
  completed: OnboardingSession[]
  cancelled: OnboardingSession[]
  all: OnboardingSession[]
}

interface OnboardingData {
  sessions: OnboardingSessions
  summary: {
    total_sessions: number
    upcoming_count: number
    completed_count: number
    completion_rate: number
  }
}

export default function Dashboard() {
  const { user, userProfile, loading } = useAuth()
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false)
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null)
  const [loadingOnboarding, setLoadingOnboarding] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState<OnboardingSession | null>(null)
  const [showSessionDetails, setShowSessionDetails] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({
    scheduled_at: '',
    duration_minutes: 60
  })
  const router = useRouter()

  // Debug logging
  console.log('Dashboard - Auth state:', {
    user: !!user,
    userProfile: !!userProfile,
    loading,
    userEmail: user?.email,
    profileName: userProfile?.full_name
  })

  useEffect(() => {
    if (user && user.user_metadata?.invited_by_admin && !user.user_metadata?.password_set) {
      setNeedsPasswordReset(true)
    }
  }, [user])

  // Redirect to login if not authenticated (additional protection)
  useEffect(() => {
    if (!loading && !user) {
      console.log('Dashboard: No user found, redirecting to login')
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  const handleSetPassword = () => {
    router.push('/auth/set-password')
  }

  // Fetch onboarding sessions
  const fetchOnboardingSessions = async () => {
    if (!user) return

    setLoadingOnboarding(true)
    try {
      // Get the current session to extract the access token
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('No access token found')
        return
      }
      
      const response = await fetch('/api/user/onboarding/sessions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setOnboardingData(data)
        console.log('Onboarding data loaded:', data)
      } else {
        console.error('Failed to fetch onboarding sessions')
      }
    } catch (error) {
      console.error('Error fetching onboarding sessions:', error)
    } finally {
      setLoadingOnboarding(false)
    }
  }

  // Schedule or reschedule session
  const handleScheduleSession = async () => {
    if (!user || !selectedSession) return

    try {
      // Get the current session to extract the access token
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('No access token found')
        return
      }
      
      const response = await fetch('/api/user/onboarding/sessions', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: selectedSession.id,
          scheduled_at: scheduleForm.scheduled_at,
          duration_minutes: scheduleForm.duration_minutes
        })
      })

      if (response.ok) {
        setShowScheduleModal(false)
        setSelectedSession(null)
        setScheduleForm({ scheduled_at: '', duration_minutes: 60 })
        await fetchOnboardingSessions() // Refresh data
      } else {
        console.error('Failed to schedule session')
      }
    } catch (error) {
      console.error('Error scheduling session:', error)
    }
  }

  // Open schedule modal
  const openScheduleModal = (session: OnboardingSession) => {
    setSelectedSession(session)
    setScheduleForm({
      scheduled_at: session.scheduled_at ? session.scheduled_at.slice(0, 16) : '',
      duration_minutes: session.duration_minutes || 60
    })
    setShowScheduleModal(true)
  }

  // Open session details modal
  const openSessionDetails = (session: OnboardingSession) => {
    setSelectedSession(session)
    setShowSessionDetails(true)
  }

  // Load onboarding data when user is available
  useEffect(() => {
    if (user && !loading) {
      fetchOnboardingSessions()
    }
  }, [user, loading])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading user data...</p>
        </div>
      </DashboardLayout>
    )
  }

  const profile = userProfile || {
    email: user.email || '',
    full_name: user.user_metadata?.full_name || '',
    username: user.user_metadata?.user_name || '',
    role: user.user_metadata?.role || 'user',
    company: user.user_metadata?.company || '',
    onboarding_status: 'pending'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Password Reset Notice */}
        {needsPasswordReset && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Please set a secure password for your account.
                  <button
                    onClick={handleSetPassword}
                    className="ml-2 font-medium text-yellow-700 underline hover:text-yellow-600"
                  >
                    Set Password Now
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Welcome to Lyceum, {profile.full_name || profile.username}!
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Your industrial analytics platform is ready. Use the sidebar to navigate to different sections of the application.
            </p>
            
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{profile.email}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    profile.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' :
                    profile.role === 'superadmin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                  }`}>
                    {profile.role}
                  </span>
                </dd>
              </div>
              
              {profile.company && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Company</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{profile.company}</dd>
                </div>
              )}
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    profile.onboarding_status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                  }`}>
                    {profile.onboarding_status || 'pending'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Onboarding Sessions Section */}
        {onboardingData && onboardingData.summary.total_sessions > 0 && (
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <AcademicCapIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Your Onboarding Sessions
                </h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {onboardingData.summary.completion_rate}% Complete
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{onboardingData.summary.completed_count} of {onboardingData.summary.total_sessions} sessions</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${onboardingData.summary.completion_rate}%` }}
                  ></div>
                </div>
              </div>

              {/* Upcoming Sessions */}
              {onboardingData.sessions.upcoming.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <ClockIcon className="h-4 w-4 mr-2 text-orange-500" />
                    Upcoming Sessions ({onboardingData.sessions.upcoming.length})
                  </h4>
                  <div className="space-y-3">
                    {onboardingData.sessions.upcoming.slice(0, 3).map((session) => (
                      <div key={session.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                                {session.title}
                              </h5>
                              <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                session.is_mandatory 
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                              }`}>
                                {session.is_mandatory ? 'Required' : 'Optional'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {session.plugin_id} • {session.duration_minutes} minutes
                            </p>
                            {session.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                                {session.description}
                              </p>
                            )}
                            {session.scheduled_at && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Scheduled: {new Date(session.scheduled_at).toLocaleString()}
                              </p>
                            )}
                            {session.license_keys && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                License: {session.license_keys.key_code}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col space-y-1 ml-4">
                            <button
                              onClick={() => openScheduleModal(session)}
                              className="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              {session.scheduled_at ? 'Reschedule' : 'Schedule'}
                            </button>
                            <button
                              onClick={() => openSessionDetails(session)}
                              className="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                              View Details
                            </button>
                            {session.meeting_link && (
                              <a
                                href={session.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-2 py-1 border border-green-300 dark:border-green-600 shadow-sm text-xs font-medium rounded text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/50 hover:bg-green-100 dark:hover:bg-green-900/70"
                              >
                                <VideoCameraIcon className="h-3 w-3 mr-1" />
                                Join Session
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {onboardingData.sessions.upcoming.length > 3 && (
                    <div className="mt-3 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        And {onboardingData.sessions.upcoming.length - 3} more sessions...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Recent Completed Sessions */}
              {onboardingData.sessions.completed.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500" />
                    Recently Completed ({onboardingData.sessions.completed.length})
                  </h4>
                  <div className="space-y-2">
                    {onboardingData.sessions.completed.slice(0, 2).map((session) => (
                      <div key={session.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-green-50 dark:bg-green-900/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                              {session.title}
                            </h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {session.plugin_id} • Completed
                            </p>
                          </div>
                          <button
                            onClick={() => openSessionDetails(session)}
                            className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No sessions message */}
              {onboardingData.sessions.upcoming.length === 0 && onboardingData.sessions.completed.length === 0 && (
                <div className="text-center py-6">
                  <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No sessions yet</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Your onboarding sessions will appear here once they are assigned.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Test Data */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TableCellsIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Test Data</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">Manage Projects</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/test-data')}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                  Open Test Data
                </button>
              </div>
            </div>
          </div>

          {/* Analytics Studio */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <PresentationChartLineIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Analytics Studio</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">Data Analysis</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/analytics-studio')}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700 transition-colors"
                >
                  Open Analytics
                </button>
              </div>
            </div>
          </div>

          {/* Data Visualizer */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Data Visualizer</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">Charts & Graphs</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/data-visualizer')}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 transition-colors"
                >
                  Open Visualizer
                </button>
              </div>
            </div>
          </div>

          {/* Centcom Assets */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CubeIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Centcom Assets</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">Asset Management</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/assets')}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-md text-sm hover:bg-orange-700 transition-colors"
                >
                  View Assets
                </button>
              </div>
            </div>
          </div>

          {/* Admin Portal (if admin) */}
          {(profile.role === 'admin' || profile.role === 'superadmin') && (
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ShieldCheckIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Admin Portal</dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">System Management</dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/admin')}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
                  >
                    Open Admin Portal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sequencer */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <PlayIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Sequencer</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">Automation</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/sequencer')}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors"
                >
                  Open Sequencer
                </button>
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserIcon className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Account</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">Profile Settings</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/settings')}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
                >
                  Manage Profile
                </button>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CogIcon className="h-6 w-6 text-slate-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Settings</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">Preferences</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/settings')}
                  className="w-full bg-slate-600 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-700 transition-colors"
                >
                  Open Settings
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Session Modal */}
        {showScheduleModal && selectedSession && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3 text-center">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {selectedSession.scheduled_at ? 'Reschedule' : 'Schedule'} Session
                  </h3>
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4 text-left">
                  <h4 className="font-medium text-gray-900 dark:text-white">{selectedSession.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedSession.plugin_id} • {selectedSession.duration_minutes} minutes
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleForm.scheduled_at}
                      onChange={(e) => setScheduleForm({...scheduleForm, scheduled_at: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={scheduleForm.duration_minutes}
                      onChange={(e) => setScheduleForm({...scheduleForm, duration_minutes: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      min="15"
                      max="180"
                      required
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Note:</strong> Meeting link and session notes management will be available in future updates.
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleScheduleSession}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={!scheduleForm.scheduled_at}
                  >
                    {selectedSession.scheduled_at ? 'Reschedule' : 'Schedule'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Session Details Modal */}
        {showSessionDetails && selectedSession && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Session Details
                  </h3>
                  <button
                    onClick={() => setShowSessionDetails(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedSession.title}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedSession.is_mandatory 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                      }`}>
                        {selectedSession.is_mandatory ? 'Required' : 'Optional'}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedSession.plugin_id} • {selectedSession.duration_minutes} minutes
                      </span>
                    </div>
                  </div>

                  {selectedSession.description && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Description</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{selectedSession.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-1">Status</h5>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedSession.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' :
                        selectedSession.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                      }`}>
                        {selectedSession.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-1">Session Type</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{selectedSession.session_type}</p>
                    </div>
                  </div>

                  {selectedSession.scheduled_at && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-1">Scheduled Time</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(selectedSession.scheduled_at).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {selectedSession.license_keys && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-1">License</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {selectedSession.license_keys.key_code} ({selectedSession.license_keys.license_type})
                      </p>
                    </div>
                  )}

                  {selectedSession.meeting_link && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-1">Meeting Link</h5>
                      <a
                        href={selectedSession.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        <VideoCameraIcon className="h-4 w-4 mr-1" />
                        Join Session
                      </a>
                    </div>
                  )}

                  {selectedSession.session_notes && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-1">Session Notes</h5>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
                        <p className="text-sm text-gray-600 dark:text-gray-300">{selectedSession.session_notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
                    <div className="flex space-x-3">
                      {selectedSession.status !== 'completed' && (
                        <button
                          onClick={() => {
                            setShowSessionDetails(false)
                            openScheduleModal(selectedSession)
                          }}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {selectedSession.scheduled_at ? 'Reschedule' : 'Schedule'}
                        </button>
                      )}
                      {selectedSession.meeting_link && (
                        <a
                          href={selectedSession.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-2 border border-green-300 dark:border-green-600 shadow-sm text-sm font-medium rounded-md text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/50 hover:bg-green-100 dark:hover:bg-green-900/70"
                        >
                          <VideoCameraIcon className="h-4 w-4 mr-2" />
                          Join Session
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}