'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import OnboardingCalendar from '@/components/OnboardingCalendar'
import {
  TableCellsIcon,
  CubeIcon,
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  VideoCameraIcon,
  PlusIcon,
  TicketIcon,
  ChatBubbleLeftRightIcon,
  NewspaperIcon
} from '@heroicons/react/24/outline'

interface DashboardStats {
  testDataProjects: number
  connectedClusters: number
  groups: number
  onboardingSessions: number
}

interface DesktopAppInfo {
  hasApp: boolean
  currentVersion: string | null
  latestVersion: string | null
  updateAvailable: boolean
  platform: string
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

interface Ticket {
  id: string
  ticket_key: string
  title: string
  description: string
  ticket_type: 'bug' | 'feature_request' | 'improvement' | 'support' | 'other'
  status: 'open' | 'in_progress' | 'pending_user' | 'resolved' | 'closed' | 'duplicate' | 'wont_fix'
  priority: 'critical' | 'high' | 'medium' | 'low'
  created_at: string
  updated_at: string
}

interface Post {
  id: string
  title: string
  content: string
  author: string
  created_at: string
  likes: number
  comments_count: number
}

export default function Dashboard() {
  const { user, userProfile, loading } = useAuth()
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    testDataProjects: 0,
    connectedClusters: 0,
    groups: 0,
    onboardingSessions: 0
  })
  const [onboardingSessions, setOnboardingSessions] = useState<OnboardingSession[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [selectedSession, setSelectedSession] = useState<OnboardingSession | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showSessionDetails, setShowSessionDetails] = useState(false)
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [downloadingApp, setDownloadingApp] = useState(false)
  const [desktopAppInfo, setDesktopAppInfo] = useState<DesktopAppInfo | null>(null)
  const [activeTab, setActiveTab] = useState<'onboarding' | 'posts' | 'tickets'>('onboarding')
  const [scheduleForm, setScheduleForm] = useState({
    scheduled_at: '',
    duration_minutes: 60
  })
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    ticket_type: 'bug' as Ticket['ticket_type'],
    priority: 'medium' as Ticket['priority'],
    application_section: 'lyceum'
  })
  const router = useRouter()

  useEffect(() => {
    if (user && user.user_metadata?.invited_by_admin && !user.user_metadata?.password_set) {
      setNeedsPasswordReset(true)
    } else {
      setNeedsPasswordReset(false)
    }
  }, [user])

  // Refresh user session when component mounts (in case metadata was updated)
  useEffect(() => {
    const refreshSession = async () => {
      const { supabase } = await import('@/lib/supabase')
      await supabase.auth.refreshSession()
    }
    if (user) {
      refreshSession()
    }
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  // Redirect to verification page if email is not verified
  useEffect(() => {
    if (!loading && user && userProfile && !userProfile.email_verified) {
      router.push('/auth/verify-email')
    }
  }, [user, userProfile, loading, router])

  const handleSetPassword = () => {
    router.push('/auth/set-password')
  }

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    if (!user) return

    setLoadingStats(true)
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) {
        setLoadingStats(false)
        return
      }

      // Fetch clusters
      const clustersResponse = await fetch('/api/clusters', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const clustersData = await clustersResponse.json()

      // Fetch groups
      const groupsResponse = await fetch('/api/groups', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const groupsData = await groupsResponse.json()

      // Fetch onboarding sessions
      const sessionsResponse = await fetch('/api/user/onboarding/sessions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const sessionsData = await sessionsResponse.json()

      setStats({
        testDataProjects: 0, // TODO: Implement test data projects count API
        connectedClusters: clustersData.total || 0,
        groups: groupsData.groups?.length || 0,
        onboardingSessions: sessionsData.summary?.upcoming_count || 0
      })
    } catch (error) {
      console.warn('Could not fetch dashboard stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  // Fetch onboarding sessions - Query directly from Supabase (bypasses hanging getSession)
  const fetchOnboardingSessions = async () => {
    if (!user) {
      console.log('No user, skipping fetch')
      return
    }

    console.log('Fetching onboarding sessions directly from Supabase...')
    setLoadingSessions(true)
    
    try {
      const { supabase } = await import('@/lib/supabase')
      
      console.log('Querying onboarding_sessions table with 5s timeout...')
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000)
      })
      
      // Query sessions directly - RLS will automatically filter by user_id
      // NOTE: Removed license_keys join to avoid RLS timeout issues
      const queryPromise = supabase
        .from('onboarding_sessions')
        .select('*')
        .in('status', ['scheduled', 'pending', 'rescheduled'])
        .order('scheduled_at', { ascending: true })
      
      // Race the query against the timeout
      const result = await Promise.race([queryPromise, timeoutPromise]) as any
      const { data: sessions, error: sessionsError } = result
      
      console.log('Query result:', { 
        success: !sessionsError, 
        count: sessions?.length || 0,
        error: sessionsError?.message 
      })
      
      if (sessionsError) {
        console.error('Error querying sessions:', sessionsError)
        setOnboardingSessions([])
      } else {
        console.log('Sessions loaded:', sessions?.length || 0)
        setOnboardingSessions(sessions || [])
      }
    } catch (error: any) {
      console.error('Error fetching onboarding sessions:', error.message || error)
      if (error.message?.includes('timeout')) {
        console.error('⚠️ Query timed out - Supabase might be slow or RLS policies might be blocking')
      }
      setOnboardingSessions([])
    } finally {
      console.log('Setting loadingSessions to false')
      setLoadingSessions(false)
    }
  }

  // Fetch tickets
  const fetchTickets = async () => {
    if (!user) return

    setLoadingTickets(true)
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) {
        setLoadingTickets(false)
        return
      }
      
      const response = await fetch('/api/tickets', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.warn('Could not fetch tickets:', error)
    } finally {
      setLoadingTickets(false)
    }
  }

  // Schedule or reschedule session
  const handleScheduleSession = async () => {
    if (!user || !selectedSession) return

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) return
      
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
        await fetchOnboardingSessions()
        await fetchDashboardStats()
      }
    } catch (error) {
      console.error('Error scheduling session:', error)
    }
  }

  // Create ticket
  const handleCreateTicket = async () => {
    if (!user) return

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) return
      
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ticketForm)
      })

      if (response.ok) {
        setShowCreateTicketModal(false)
        setTicketForm({
          title: '',
          description: '',
          ticket_type: 'bug',
          priority: 'medium',
          application_section: 'lyceum'
        })
        await fetchTickets()
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
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

  // Helper function to detect platform
  const detectPlatform = (): string => {
    if (typeof window === 'undefined') return 'windows'

    const userAgent = window.navigator.userAgent.toLowerCase()

    if (userAgent.includes('win')) return 'windows'
    if (userAgent.includes('mac')) return 'macos'
    if (userAgent.includes('linux')) return 'linux'

    return 'windows' // Default fallback
  }

  // Fetch desktop app version info
  const fetchDesktopAppInfo = async () => {
    console.log('🎯 Fetching desktop app info...', { user: !!user })
    if (!user) {
      console.log('❌ No user, skipping desktop app info fetch')
      return
    }

    try {
      // Detect user's platform
      const platform = detectPlatform()
      console.log('✅ Platform detected:', platform)

      console.log('Step 1: Making API call without explicit auth (using cookies)...')
      // Try making the API call without fetching session explicitly
      // The API should use cookies to authenticate on the server side
      const response = await fetch(
        `/api/centcom/versions/latest?platform=${platform}&user_id=${user.id}`,
        {
          credentials: 'include', // Include cookies for auth
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      console.log('📡 API Response status:', response.status)

      if (response.ok) {
        const responseData = await response.json()
        console.log('✅ Desktop app info received:', responseData)
        setDesktopAppInfo({
          hasApp: false, // Will be true if Centcom is installed and reports version
          currentVersion: null,
          latestVersion: responseData.latest_version?.version,
          updateAvailable: responseData.update_available,
          platform: platform
        })
        console.log('✅ Desktop app info state set!')
      } else {
        console.error('❌ API call failed:', response.status)
        const errorText = await response.text()
        console.error('Error response:', errorText)
      }
    } catch (error) {
      console.error('❌ ERROR in fetchDesktopAppInfo:', error)
      console.error('Error details:', error instanceof Error ? error.message : String(error))
    }
  }

  // Handle download
  const handleDownload = async (installerType: string) => {
    if (!user || !desktopAppInfo) return

    setDownloadingApp(true)

    try {
      const response = await fetch(
        `/api/centcom/download/${desktopAppInfo.latestVersion}/${desktopAppInfo.platform}?user_id=${user.id}&installer_type=${installerType}`,
        {
          credentials: 'include', // Include cookies for auth
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to get download URL')
      }

      const data = await response.json()

      // Trigger download
      const link = document.createElement('a')
      link.href = data.download_url
      link.download = data.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Track download completion
      await fetch('/api/centcom/download/track', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          download_id: data.download_id,
          status: 'success'
        })
      })

      setShowDownloadModal(false)

    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download application. Please try again.')
    } finally {
      setDownloadingApp(false)
    }
  }

  // Load data when user is available
  useEffect(() => {
    if (user && !loading) {
      fetchDashboardStats()
      fetchOnboardingSessions()
      fetchTickets()
      fetchDesktopAppInfo()
      
      // Retry after a delay if first attempt fails
      const retryTimeout = setTimeout(() => {
        if (stats.connectedClusters === 0 && stats.groups === 0) {
          fetchDashboardStats()
        }
        if (onboardingSessions.length === 0) {
          fetchOnboardingSessions()
        }
        if (tickets.length === 0) {
          fetchTickets()
        }
      }, 2000)
      
      return () => clearTimeout(retryTimeout)
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
    }
  }

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Password Reset Notice */}
        {needsPasswordReset && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
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

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            Welcome back, {profile.full_name || profile.username}!
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Here's what's happening with your Lyceum workspace today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {/* Test Data Projects */}
          <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow ring-1 ring-gray-200 dark:ring-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TableCellsIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                      Test Data Projects
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                      {loadingStats ? '...' : stats.testDataProjects}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Connected Clusters */}
          <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow ring-1 ring-gray-200 dark:ring-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CubeIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                      Connected Clusters
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                      {loadingStats ? '...' : stats.connectedClusters}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Groups */}
          <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow ring-1 ring-gray-200 dark:ring-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                      Groups
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                      {loadingStats ? '...' : stats.groups}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Onboarding Sessions */}
          <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow ring-1 ring-gray-200 dark:ring-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AcademicCapIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                      Upcoming Sessions
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                      {loadingStats ? '...' : stats.onboardingSessions}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop App Download */}
          {desktopAppInfo && (
            <div className="overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow ring-1 ring-indigo-400">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-indigo-100">
                        Desktop Application
                      </dt>
                      <dd className="mt-1 text-lg font-semibold text-white">
                        {desktopAppInfo.hasApp ? (
                          <>
                            v{desktopAppInfo.currentVersion}
                            {desktopAppInfo.updateAvailable && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-400 text-yellow-900">
                                Update Available
                              </span>
                            )}
                          </>
                        ) : (
                          'Not Installed'
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setShowDownloadModal(true)}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    {desktopAppInfo.hasApp ? 'Download Update' : 'Download Centcom'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs Section */}
        <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('onboarding')}
                className={`${
                  activeTab === 'onboarding'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                } flex whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium items-center`}
              >
                <AcademicCapIcon className="h-5 w-5 mr-2" />
                Onboarding Sessions
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`${
                  activeTab === 'posts'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                } flex whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium items-center`}
              >
                <NewspaperIcon className="h-5 w-5 mr-2" />
                Posts
              </button>
              <button
                onClick={() => setActiveTab('tickets')}
                className={`${
                  activeTab === 'tickets'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                } flex whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium items-center`}
              >
                <TicketIcon className="h-5 w-5 mr-2" />
                Tickets
              </button>
            </nav>
          </div>

          <div className="px-6 py-6">
            {/* Tab 1: Upcoming Onboarding Sessions */}
            {activeTab === 'onboarding' && (
              <div className="space-y-6">
                {loadingSessions ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : onboardingSessions.length > 0 ? (
                  <>
                    {/* Calendar View */}
                    <OnboardingCalendar 
                      sessions={onboardingSessions}
                      onSessionClick={openSessionDetails}
                    />

                    {/* List View */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Upcoming Sessions List
                      </h3>
                      <div className="space-y-3">
                    {onboardingSessions.slice(0, 5).map((session) => (
                      <div 
                        key={session.id} 
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                                {session.title}
                              </h5>
                              <span 
                                className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  session.is_mandatory 
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                                }`}
                              >
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
                          </div>
                          <div className="flex flex-col space-y-2 ml-4">
                            <button
                              onClick={() => openScheduleModal(session)}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              {session.scheduled_at ? 'Reschedule' : 'Schedule'}
                            </button>
                            <button
                              onClick={() => openSessionDetails(session)}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              View Details
                            </button>
                            {session.meeting_link && (
                              <button
                                onClick={() => window.open(session.meeting_link, '_blank')}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                              >
                                <VideoCameraIcon className="h-3 w-3 mr-1" />
                                Join
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No upcoming sessions</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Your onboarding sessions will appear here once they are assigned.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Posts */}
            {activeTab === 'posts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Community Posts
                  </h3>
                  <button className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    New Post
                  </button>
                </div>

                <div className="text-center py-12">
                  <NewspaperIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No posts yet</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Community posts and announcements will appear here.
                  </p>
                  <div className="mt-6">
                    <button className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create your first post
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Tickets */}
            {activeTab === 'tickets' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Support Tickets
                  </h3>
                  <button 
                    onClick={() => setShowCreateTicketModal(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    New Ticket
                  </button>
                </div>

                {loadingTickets ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : tickets.length > 0 ? (
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <div 
                        key={ticket.id} 
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer"
                        onClick={() => router.push(`/admin/tickets/${ticket.ticket_key}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                {ticket.ticket_key}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200">
                                {ticket.ticket_type.replace('_', ' ')}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeColor(ticket.status)}`}>
                                {ticket.status.replace('_', ' ')}
                              </span>
                            </div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                              {ticket.title}
                            </h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {ticket.description}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                              Created {new Date(ticket.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="ml-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeColor(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <TicketIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tickets yet</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Need help? Create a support ticket and our team will assist you.
                    </p>
                    <div className="mt-6">
                      <button 
                        onClick={() => setShowCreateTicketModal(true)}
                        className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Create your first ticket
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Schedule Session Modal */}
        {showScheduleModal && selectedSession && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
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

                <div className="mb-4">
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
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleScheduleSession}
                    disabled={!scheduleForm.scheduled_at}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

                  {selectedSession.scheduled_at && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-1">Scheduled Time</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(selectedSession.scheduled_at).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {selectedSession.meeting_link && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-1">Meeting Link</h5>
                      <button
                        onClick={() => window.open(selectedSession.meeting_link, '_blank')}
                        className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <VideoCameraIcon className="h-4 w-4 mr-2" />
                        Join Session
                      </button>
                    </div>
                  )}

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
                    <div className="flex space-x-3">
                      {selectedSession.status !== 'completed' && (
                        <button
                          onClick={() => {
                            setShowSessionDetails(false)
                            openScheduleModal(selectedSession)
                          }}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {selectedSession.scheduled_at ? 'Reschedule' : 'Schedule'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Ticket Modal */}
        {showCreateTicketModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Create Support Ticket
                  </h3>
                  <button
                    onClick={() => setShowCreateTicketModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={ticketForm.title}
                      onChange={(e) => setTicketForm({...ticketForm, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Brief description of the issue"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      rows={4}
                      placeholder="Detailed description of the issue"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type
                      </label>
                      <select
                        value={ticketForm.ticket_type}
                        onChange={(e) => setTicketForm({...ticketForm, ticket_type: e.target.value as Ticket['ticket_type']})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="bug">Bug</option>
                        <option value="feature_request">Feature Request</option>
                        <option value="improvement">Improvement</option>
                        <option value="support">Support</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Priority
                      </label>
                      <select
                        value={ticketForm.priority}
                        onChange={(e) => setTicketForm({...ticketForm, priority: e.target.value as Ticket['priority']})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateTicketModal(false)}
                    className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTicket}
                    disabled={!ticketForm.title || !ticketForm.description}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Ticket
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download Centcom Modal */}
        {showDownloadModal && desktopAppInfo && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Download {userProfile?.license_type?.includes('CENTCOM') ? 'Centcom' : 'Native Lyceum'}
                  </h3>
                  <button
                    onClick={() => setShowDownloadModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Latest Version: {desktopAppInfo.latestVersion}
                        </h3>
                        <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                          <p>Platform detected: <strong className="capitalize">{desktopAppInfo.platform}</strong></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Choose your installer format:
                    </h4>
                    <div className="space-y-2">
                      {desktopAppInfo.platform === 'windows' && (
                        <>
                          <button
                            onClick={() => handleDownload('exe')}
                            disabled={downloadingApp}
                            className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                          >
                            <div className="flex items-center">
                              <svg className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                              </svg>
                              <div className="ml-3 text-left">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  Setup.exe (Recommended)
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Standard Windows installer
                                </p>
                              </div>
                            </div>
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDownload('msi')}
                            disabled={downloadingApp}
                            className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                          >
                            <div className="flex items-center">
                              <svg className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                              </svg>
                              <div className="ml-3 text-left">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  Setup.msi
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  For enterprise deployment
                                </p>
                              </div>
                            </div>
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                        </>
                      )}
                      {desktopAppInfo.platform === 'macos' && (
                        <button
                          onClick={() => handleDownload('dmg')}
                          disabled={downloadingApp}
                          className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                          <div className="flex items-center">
                            <svg className="h-8 w-8 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>
                            <div className="ml-3 text-left">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Disk Image (.dmg)
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Standard macOS installer
                              </p>
                            </div>
                          </div>
                          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      )}
                      {desktopAppInfo.platform === 'linux' && (
                        <>
                          <button
                            onClick={() => handleDownload('AppImage')}
                            disabled={downloadingApp}
                            className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                          >
                            <div className="flex items-center">
                              <svg className="h-8 w-8 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.84-.41 1.684-.287 2.489a6.372 6.372 0 002.716 4.521c.885.584 1.249.584 2.716.584 1.092 0 2.716-.584 2.716-2.489 0-1.467.584-2.716 1.467-2.716 1.467 0 2.716 1.467 2.716 2.716 0 1.905 1.624 2.489 2.716 2.489 1.467 0 1.831 0 2.716-.584a6.372 6.372 0 002.716-4.521c.123-.805-.009-1.649-.287-2.489-.589-1.771-1.831-3.47-2.716-4.521-.75-1.067-.974-1.928-1.05-3.02-.065-1.491 1.056-5.965-3.17-6.298-.165-.013-.325-.021-.48-.021z" />
                              </svg>
                              <div className="ml-3 text-left">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  AppImage
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Universal Linux package
                                </p>
                              </div>
                            </div>
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDownload('deb')}
                            disabled={downloadingApp}
                            className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                          >
                            <div className="flex items-center">
                              <svg className="h-8 w-8 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.84-.41 1.684-.287 2.489a6.372 6.372 0 002.716 4.521c.885.584 1.249.584 2.716.584 1.092 0 2.716-.584 2.716-2.489 0-1.467.584-2.716 1.467-2.716 1.467 0 2.716 1.467 2.716 2.716 0 1.905 1.624 2.489 2.716 2.489 1.467 0 1.831 0 2.716-.584a6.372 6.372 0 002.716-4.521c.123-.805-.009-1.649-.287-2.489-.589-1.771-1.831-3.47-2.716-4.521-.75-1.067-.974-1.928-1.05-3.02-.065-1.491 1.056-5.965-3.17-6.298-.165-.013-.325-.021-.48-.021z" />
                              </svg>
                              <div className="ml-3 text-left">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  Debian Package (.deb)
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  For Debian/Ubuntu systems
                                </p>
                              </div>
                            </div>
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-xs text-gray-600 dark:text-gray-400">
                    <p className="font-medium text-gray-900 dark:text-white mb-1">System Requirements:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {desktopAppInfo.platform === 'windows' && (
                        <>
                          <li>Windows 10 or later (64-bit)</li>
                          <li>4GB RAM minimum (8GB recommended)</li>
                          <li>500MB available disk space</li>
                        </>
                      )}
                      {desktopAppInfo.platform === 'macos' && (
                        <>
                          <li>macOS 10.15 (Catalina) or later</li>
                          <li>4GB RAM minimum (8GB recommended)</li>
                          <li>500MB available disk space</li>
                        </>
                      )}
                      {desktopAppInfo.platform === 'linux' && (
                        <>
                          <li>Ubuntu 20.04+ or equivalent</li>
                          <li>4GB RAM minimum (8GB recommended)</li>
                          <li>500MB available disk space</li>
                        </>
                      )}
                    </ul>
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
