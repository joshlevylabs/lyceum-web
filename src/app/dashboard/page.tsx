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
      
      console.log('Querying onboarding_sessions table...')
      // Query sessions directly - RLS will automatically filter by user_id
      const { data: sessions, error: sessionsError } = await supabase
        .from('onboarding_sessions')
        .select(`
          *,
          license_keys (
            id,
            key_code,
            license_type,
            status,
            features,
            enabled_plugins,
            expires_at
          )
        `)
        .in('status', ['scheduled', 'pending', 'rescheduled'])
        .order('scheduled_at', { ascending: true })
      
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

  // Load data when user is available
  useEffect(() => {
    if (user && !loading) {
      fetchDashboardStats()
      fetchOnboardingSessions()
      fetchTickets()
      
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>
    </DashboardLayout>
  )
}
