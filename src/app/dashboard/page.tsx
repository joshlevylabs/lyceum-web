'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import OnboardingCalendar from '@/components/OnboardingCalendar'
import {
  Table,
  Cube,
  UsersThree,
  ChartBar,
  Warning,
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle,
  X,
  VideoCamera,
  Plus,
  Ticket,
  ChatCircle,
  Newspaper,
  User,
  MapPin,
  ArrowRight,
  CaretLeft,
  CaretRight
} from '@phosphor-icons/react'

interface DashboardStats {
  testDataProjects: number
  connectedClusters: number
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
  product_category?: string
  product_name?: string
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
    onboardingSessions: 0
  })
  const [onboardingSessions, setOnboardingSessions] = useState<OnboardingSession[]>([])
  const [schedulingBookings, setSchedulingBookings] = useState<any[]>([])
  const [suggestedBookings, setSuggestedBookings] = useState<any[]>([])
  const [requiresActionBookings, setRequiresActionBookings] = useState<any[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [loadingSchedulingBookings, setLoadingSchedulingBookings] = useState(true)
  const [selectedSession, setSelectedSession] = useState<OnboardingSession | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showSessionDetails, setShowSessionDetails] = useState(false)
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false)
  const [selectedTicketToView, setSelectedTicketToView] = useState<Ticket | null>(null)
  // Download modal removed - now routes to /download-app page
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  // const [downloadingApp, setDownloadingApp] = useState(false)
  const [desktopAppInfo, setDesktopAppInfo] = useState<DesktopAppInfo | null>(null)
  const [activeTab, setActiveTab] = useState<'onboarding' | 'posts' | 'tickets'>('onboarding')
  const [scheduleForm, setScheduleForm] = useState({
    scheduled_at: '',
    duration_minutes: 60
  })
  // Booking scheduler state
  const [availableSlots, setAvailableSlots] = useState<{ [date: string]: any[] }>({})
  const [bookingSlot, setBookingSlot] = useState<any | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState<string>('')
  const [calendarCurrentDate, setCalendarCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showSlotsModal, setShowSlotsModal] = useState(false)
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    ticket_type: 'bug' as Ticket['ticket_type'],
    priority: 'medium' as Ticket['priority'],
    application_section: 'lyceum'
  })
  const router = useRouter()

  // Helper: Get user's brand type based on company field
  const getUserBrandType = (): 'centcom' | 'lyceum' => {
    if (!userProfile?.company) return 'lyceum'

    const centcomCompanies = [
      'centcom',
      'sonance',
      'blaze',
      'iport',
      'danainnovations',
      'dana innovations',
      'james',
      'trufig'
    ]

    const companyLower = userProfile.company.toLowerCase()
    const isCentcom = centcomCompanies.some(name => companyLower.includes(name))

    return isCentcom ? 'centcom' : 'lyceum'
  }

  const brandName = getUserBrandType() === 'centcom' ? 'Centcom' : 'Lyceum Native'

  // Helper: Get product badge color based on category and product name
  const getProductBadgeStyle = (category?: string, productName?: string) => {
    if (category === 'native_app') {
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300'
    }

    if (category === 'plugin') {
      // All plugins use emerald
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
    }

    // Fallback for other or unknown categories
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
  }

  // Helper: Format description with line breaks
  const formatDescription = (description?: string) => {
    if (!description) return null
    return description.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < description.split('\n').length - 1 && <br />}
      </span>
    ))
  }

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
        onboardingSessions: sessionsData.summary?.upcoming_count || 0
      })
    } catch (error) {
      console.warn('Could not fetch dashboard stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  // Fetch onboarding sessions via API endpoint (avoids RLS timeout issues)
  const fetchOnboardingSessions = async () => {
    if (!user) {
      console.log('No user, skipping fetch')
      return
    }

    console.log('Fetching onboarding sessions via API...')
    setLoadingSessions(true)

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) {
        console.log('No session token, skipping fetch')
        setLoadingSessions(false)
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
        // API returns sessions as { upcoming: [], completed: [], cancelled: [], all: [] }
        const upcomingSessions = data.sessions?.upcoming || []
        console.log('Sessions loaded via API:', upcomingSessions.length)
        setOnboardingSessions(upcomingSessions)
      } else {
        console.error('API error:', response.status, response.statusText)
        setOnboardingSessions([])
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

  // Fetch onboarding scheduling bookings
  const fetchSchedulingBookings = async () => {
    if (!user) return

    setLoadingSchedulingBookings(true)
    try {
      const response = await fetch('/api/onboarding/my-bookings')

      if (response.ok) {
        const data = await response.json()
        setSchedulingBookings(data.upcoming || [])
        setSuggestedBookings(data.suggested || [])
        setRequiresActionBookings(data.requiresAction || [])

        // Set the first suggested booking's license as default for booking
        if (data.suggested?.[0]?.license?.id) {
          setSelectedLicense(data.suggested[0].license.id)
        }
      }
    } catch (error) {
      console.warn('Could not fetch scheduling bookings:', error)
    } finally {
      setLoadingSchedulingBookings(false)
    }
  }

  // Fetch available time slots
  const fetchAvailableSlots = async () => {
    try {
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)
      const response = await fetch(`/api/onboarding/available-slots?end_date=${endDate.toISOString()}`)

      if (response.ok) {
        const data = await response.json()
        setAvailableSlots(data.slotsByDate || {})
      }
    } catch (error) {
      console.error('Error fetching available slots:', error)
    }
  }

  // Book a session
  const handleBookSession = async () => {
    if (!bookingSlot) return

    try {
      const response = await fetch('/api/onboarding/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availability_slot_id: bookingSlot.original_slot_id || bookingSlot.id,
          scheduled_start_time: bookingSlot.segment_start || bookingSlot.start_time,
          scheduled_end_time: bookingSlot.segment_end || bookingSlot.end_time,
          license_key_id: selectedLicense || undefined,
          title: `Onboarding Session with ${bookingSlot.admin.full_name || bookingSlot.admin.email}`
        })
      })

      if (response.ok) {
        await fetchSchedulingBookings()
        await fetchAvailableSlots()
        setShowBookingModal(false)
        setBookingSlot(null)
        alert('Session booked successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error booking session:', error)
      alert('Failed to book session')
    }
  }

  // Cancel a booking
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    try {
      const response = await fetch(`/api/onboarding/${bookingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancellation_reason: 'Cancelled by user'
        })
      })

      if (response.ok) {
        await fetchSchedulingBookings()
        await fetchAvailableSlots()
        alert('Booking cancelled successfully')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error cancelling booking:', error)
      alert('Failed to cancel booking')
    }
  }

  // Helper functions for formatting
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
    const tzStr = date.toLocaleTimeString('en-US', {
      timeZoneName: 'short'
    }).split(' ').pop() // Gets timezone abbreviation (e.g., "PST", "EST")
    return `${timeStr} ${tzStr}`
  }

  const openBookingModal = (slot: any) => {
    setBookingSlot(slot)
    setShowBookingModal(true)
  }

  // Generate 1-hour segments from a time slot
  const generateHourlySegments = (slot: any) => {
    const startTime = new Date(slot.start_time)
    const endTime = new Date(slot.end_time)
    const segments = []

    let currentStart = new Date(startTime)
    while (currentStart < endTime) {
      const currentEnd = new Date(currentStart)
      currentEnd.setHours(currentEnd.getHours() + 1)

      // Don't create a segment that goes beyond the slot's end time
      if (currentEnd <= endTime) {
        segments.push({
          ...slot,
          segment_start: currentStart.toISOString(),
          segment_end: currentEnd.toISOString(),
          original_slot_id: slot.id
        })
      }

      currentStart = currentEnd
    }

    return segments
  }

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    return days
  }

  const getSlotsForDate = (date: Date | null) => {
    if (!date) return []
    const dateStr = date.toISOString().split('T')[0]
    return availableSlots[dateStr] || []
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarCurrentDate(prevDate => {
      const newDate = new Date(prevDate)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const isToday = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isPastDate = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const openSlotsModal = (date: Date) => {
    setSelectedDate(date)
    setShowSlotsModal(true)
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
          hasApp: false, // Will be true if Native Lyceum is installed and reports version
          currentVersion: null,
          latestVersion: responseData.latest_version?.version,
          updateAvailable: responseData.update_available,
          platform: platform
        })
        console.log('✅ Desktop app info state set!')
      } else if (response.status === 404) {
        // No version available for this platform/brand - this is expected for some users
        console.log('ℹ️ No desktop app version available for this platform yet')
        setDesktopAppInfo({
          hasApp: false,
          currentVersion: null,
          latestVersion: null,
          updateAvailable: false,
          platform: platform
        })
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
      fetchSchedulingBookings()
      fetchAvailableSlots()
      fetchDesktopAppInfo()

      // Retry after a delay if first attempt fails
      const retryTimeout = setTimeout(() => {
        if (stats.connectedClusters === 0) {
          fetchDashboardStats()
        }
        if (onboardingSessions.length === 0) {
          fetchOnboardingSessions()
        }
        if (tickets.length === 0) {
          fetchTickets()
        }
        if (schedulingBookings.length === 0 && Object.keys(availableSlots).length === 0) {
          fetchSchedulingBookings()
          fetchAvailableSlots()
        }
      }, 2000)

      return () => clearTimeout(retryTimeout)
    }
  }, [user, loading])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
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
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200'
      case 'in_progress':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200'
      case 'resolved':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
    }
  }

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200'
      case 'high':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200'
      case 'medium':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
      case 'low':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Password Reset Notice */}
        {needsPasswordReset && (
          <div className="glass-card border-l-4 border-cyan-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0 p-2 rounded-lg bg-cyan-500/10">
                <Warning className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-foreground/80">
                  Please set a secure password for your account.
                  <button
                    onClick={handleSetPassword}
                    className="ml-2 font-medium text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Set Password Now
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Onboarding Scheduling Alerts */}
        {!loadingSchedulingBookings && requiresActionBookings.length > 0 && (
          <div className="glass-card border-l-4 border-cyan-500 p-6">
            <div className="flex">
              <div className="flex-shrink-0 p-2 rounded-lg bg-cyan-500/10">
                <Warning className="h-6 w-6 text-cyan-400" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-base font-semibold text-foreground">
                  Action Required: Schedule Your Onboarding Session
                </h3>
                <div className="mt-2 text-sm text-foreground/70">
                  <p className="mb-2">
                    You have {requiresActionBookings.length} trial license{requiresActionBookings.length > 1 ? 's' : ''} that require onboarding within 14 days or they will be revoked.
                  </p>
                  {requiresActionBookings.map((booking) => (
                    <div key={booking.id} className="mt-2 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                      <p className="font-medium text-foreground">{booking.title}</p>
                      {booking.trial_deadline && (
                        <p className="text-xs mt-1 text-cyan-400">
                          <strong>Deadline:</strong> {new Date(booking.trial_deadline).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/onboarding/schedule')}
                    className="btn-primary inline-flex items-center"
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    Schedule Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loadingSchedulingBookings && requiresActionBookings.length === 0 && schedulingBookings.length > 0 && (
          <div className="glass-card border-l-4 border-cyan-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0 p-2 rounded-lg bg-cyan-500/10">
                <CheckCircle className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Upcoming Onboarding Sessions
                </h3>
                <p className="mt-1 text-sm text-foreground/70">
                  You have {schedulingBookings.length} scheduled onboarding session{schedulingBookings.length > 1 ? 's' : ''}.
                  <button
                    onClick={() => router.push('/onboarding/schedule')}
                    className="ml-2 font-medium text-cyan-400 hover:text-cyan-300 underline"
                  >
                    View Details
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold leading-7 sm:truncate sm:text-3xl sm:tracking-tight">
            <span className="text-gradient-cyan">Welcome back,</span>{' '}
            <span className="text-foreground">{profile.full_name || profile.username}!</span>
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Here's what's happening with your Lyceum workspace today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Test Data Projects */}
          <div className="glass-card overflow-hidden p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Table className="h-6 w-6 text-cyan-400" weight="duotone" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-foreground/60">
                    Test Data Projects
                  </dt>
                  <dd className="mt-1 text-3xl font-bold tracking-tight text-gradient-cyan">
                    {loadingStats ? '...' : stats.testDataProjects}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Connected Clusters */}
          <div className="glass-card overflow-hidden p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Cube className="h-6 w-6 text-emerald-400" weight="duotone" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-foreground/60">
                    Connected Clusters
                  </dt>
                  <dd className="mt-1 text-3xl font-bold tracking-tight text-emerald-400">
                    {loadingStats ? '...' : stats.connectedClusters}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Onboarding Sessions */}
          <div className="glass-card overflow-hidden p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <GraduationCap className="h-6 w-6 text-cyan-400" weight="duotone" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-foreground/60">
                    Upcoming Sessions
                  </dt>
                  <dd className="mt-1 text-3xl font-bold tracking-tight text-cyan-400">
                    {loadingStats ? '...' : stats.onboardingSessions}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Desktop App Download */}
          {desktopAppInfo && (
            <div className="glass-card overflow-hidden p-5 border-cyan-500/30 glow-cyan-border">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30">
                  <svg className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-foreground/60">
                      Desktop Application
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-foreground">
                      {desktopAppInfo.hasApp && (
                        <>
                          v{desktopAppInfo.currentVersion}
                          {desktopAppInfo.updateAvailable && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Update Available
                            </span>
                          )}
                        </>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={async () => {
                    // Check if user already has a license
                    console.log('🔍 Checking if user has existing license...')
                    try {
                      const { supabase } = await import('@/lib/supabase')
                      const { data: { session } } = await supabase.auth.getSession()

                      if (session?.access_token) {
                        const licenseResponse = await fetch('/api/licenses/generate-main-app', {
                          headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json'
                          }
                        })

                        console.log('📄 License check response status:', licenseResponse.status)

                        if (licenseResponse.ok) {
                          const licenseData = await licenseResponse.json()
                          console.log('📄 License data:', licenseData)

                          if (licenseData.hasLicense) {
                            // User has license, go directly to download page
                            console.log('✅ User has license, redirecting to download page')
                            router.push('/download-app')
                            return
                          } else {
                            console.log('❌ User does not have license')
                          }
                        } else {
                          console.error('❌ License check failed:', await licenseResponse.text())
                        }
                      } else {
                        console.error('❌ No session found')
                      }
                    } catch (error) {
                      console.error('Error checking license:', error)
                    }

                    // No license found, go to subscription page
                    console.log('➡️  Redirecting to subscription page')
                    router.push('/native-app/subscribe')
                  }}
                  className="btn-primary w-full inline-flex justify-center items-center"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  {desktopAppInfo.hasApp ? 'Manage Subscription' : 'Click To Download'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs Section */}
        <div className="glass-card overflow-hidden">
          <div className="border-b border-cyan-500/10">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('onboarding')}
                className={`${
                  activeTab === 'onboarding'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-foreground/50 hover:border-cyan-500/30 hover:text-cyan-400'
                } flex whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium items-center transition-colors`}
              >
                <GraduationCap className="h-5 w-5 mr-2" weight={activeTab === 'onboarding' ? 'duotone' : 'regular'} />
                Onboarding
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`${
                  activeTab === 'posts'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-foreground/50 hover:border-cyan-500/30 hover:text-cyan-400'
                } flex whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium items-center transition-colors`}
              >
                <Newspaper className="h-5 w-5 mr-2" weight={activeTab === 'posts' ? 'duotone' : 'regular'} />
                Posts
              </button>
              <button
                onClick={() => setActiveTab('tickets')}
                className={`${
                  activeTab === 'tickets'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-foreground/50 hover:border-cyan-500/30 hover:text-cyan-400'
                } flex whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium items-center transition-colors`}
              >
                <Ticket className="h-5 w-5 mr-2" weight={activeTab === 'tickets' ? 'duotone' : 'regular'} />
                Tickets
              </button>
            </nav>
          </div>

          <div className="px-6 py-6">
            {/* Tab 1: Onboarding Scheduler */}
            {activeTab === 'onboarding' && (
              <div className="space-y-6">
                {loadingSchedulingBookings ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-400"></div>
                  </div>
                ) : (
                  <>
                    {/* My Sessions Section */}
                    {(schedulingBookings.length > 0 || suggestedBookings.length > 0) && (
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                          My Sessions
                        </h2>

                        {/* Suggested Sessions (Need to book) */}
                        {suggestedBookings.map((booking: any) => (
                          <div key={booking.id} className="glass-card border-2 border-cyan-400/30 dark:border-cyan-500/30 p-6 mb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                  <Warning className="h-5 w-5 text-cyan-500" />
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300">
                                    Suggested - Not Yet Scheduled
                                  </span>
                                  {booking.product_name && (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProductBadgeStyle(booking.product_category, booking.product_name)}`}>
                                      {booking.product_name}
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                  {booking.title}
                                </h3>
                                {booking.description && (
                                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-4 mb-3">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                      {formatDescription(booking.description)}
                                    </p>
                                  </div>
                                )}
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                  Please select a time slot below to schedule this session
                                </p>
                                {booking.is_trial_required && booking.trial_deadline && (
                                  <p className="text-sm text-cyan-600 dark:text-cyan-400 mt-2 font-medium">
                                    <strong>Must be scheduled by:</strong> {formatDate(booking.trial_deadline)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Upcoming Scheduled Sessions */}
                        {schedulingBookings.map((booking: any) => (
                          <div key={booking.id} className="glass-card p-6 mb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                    Scheduled
                                  </span>
                                  {booking.product_name && (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProductBadgeStyle(booking.product_category, booking.product_name)}`}>
                                      {booking.product_name}
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                  {booking.title}
                                </h3>
                                {booking.description && (
                                  <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md p-4 mb-4">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                      {formatDescription(booking.description)}
                                    </p>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                  <div>
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                      <Calendar className="h-4 w-4" />
                                      <span className="text-sm">
                                        {formatDate(booking.scheduled_start_time)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mt-2">
                                      <Clock className="h-4 w-4" />
                                      <span className="text-sm">
                                        {formatTime(booking.scheduled_start_time)} - {formatTime(booking.scheduled_end_time)}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                      <User className="h-4 w-4" />
                                      <span className="text-sm">
                                        {booking.admin?.full_name || booking.admin?.email}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mt-2">
                                      <VideoCamera className="h-4 w-4" />
                                      <span className="text-sm capitalize">
                                        {booking.meeting_platform}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {booking.meeting_link && (
                                  <div className="mt-4">
                                    <a
                                      href={booking.meeting_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-cyan-500 hover:underline text-sm inline-flex items-center"
                                    >
                                      Join Meeting <ArrowRight className="h-4 w-4 ml-1" />
                                    </a>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleCancelBooking(booking.id)}
                                className="ml-4 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-400 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Onboarding Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="glass-card p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-foreground/60">Required Sessions</p>
                            <p className="text-3xl font-bold text-cyan-500">
                              {suggestedBookings.filter((b: any) => b.is_mandatory).length}
                            </p>
                          </div>
                          <Warning className="h-10 w-10 text-cyan-500" weight="duotone" />
                        </div>
                        <p className="text-xs text-foreground/50 mt-2">
                          Must be scheduled
                        </p>
                      </div>

                      <div className="glass-card p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-foreground/60">Scheduled</p>
                            <p className="text-3xl font-bold text-emerald-500">
                              {schedulingBookings.length}
                            </p>
                          </div>
                          <CheckCircle className="h-10 w-10 text-emerald-500" weight="duotone" />
                        </div>
                        <p className="text-xs text-foreground/50 mt-2">
                          Upcoming sessions
                        </p>
                      </div>

                      <div className="glass-card p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-foreground/60">Optional</p>
                            <p className="text-3xl font-bold text-cyan-500">
                              {suggestedBookings.filter((b: any) => !b.is_mandatory).length}
                            </p>
                          </div>
                          <GraduationCap className="h-10 w-10 text-cyan-500" weight="duotone" />
                        </div>
                        <p className="text-xs text-foreground/50 mt-2">
                          Recommended sessions
                        </p>
                      </div>
                    </div>

                    {/* Available Time Slots Calendar */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                          Available Time Slots
                        </h2>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigateMonth('prev')}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <CaretLeft className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setCalendarCurrentDate(new Date())}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                          >
                            Today
                          </button>
                          <button
                            onClick={() => navigateMonth('next')}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <CaretRight className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                          {calendarCurrentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>

                        {/* Days of Week */}
                        <div className="grid grid-cols-7 gap-2 mb-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300 py-2">
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-2">
                          {getDaysInMonth(calendarCurrentDate).map((date, index) => {
                            const daySlots = getSlotsForDate(date)
                            const todayCheck = isToday(date)
                            const isPast = isPastDate(date)

                            return (
                              <div
                                key={index}
                                className={`min-h-[100px] border rounded-lg p-2 transition-all
                                  ${date ? 'glass-card !rounded-lg' : 'bg-gray-50 dark:bg-gray-900 border-transparent'}
                                  ${todayCheck ? 'ring-2 ring-cyan-500' : ''}
                                  ${date && !isPast && daySlots.length > 0 ? 'hover:shadow-md cursor-pointer hover:border-cyan-400/50' : ''}
                                  ${isPast && date ? 'opacity-50' : ''}`}
                                onClick={() => date && !isPast && daySlots.length > 0 && openSlotsModal(date)}
                              >
                                {date && (
                                  <>
                                    <div className={`text-sm font-semibold mb-2 ${todayCheck ? 'text-cyan-500' : 'text-foreground'}`}>
                                      {date.getDate()}
                                    </div>

                                    {daySlots.length > 0 && (
                                      <div className="space-y-1">
                                        {daySlots.slice(0, 2).map((slot: any) => (
                                          <div
                                            key={slot.id}
                                            className="text-xs px-2 py-1 rounded bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200 truncate"
                                            title={`${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`}
                                          >
                                            {formatTime(slot.start_time)}
                                          </div>
                                        ))}
                                        {daySlots.length > 2 && (
                                          <div className="text-xs text-center text-cyan-500 font-medium">
                                            +{daySlots.length - 2} more
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {daySlots.length === 0 && !isPast && (
                                      <div className="text-xs text-gray-400 dark:text-gray-600 text-center mt-4">
                                        No slots
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Legend */}
                        <div className="mt-6 flex gap-4 text-sm justify-center">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-cyan-100 dark:bg-cyan-900/50 rounded"></div>
                            <span className="text-foreground/70">Available slots</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 ring-2 ring-cyan-500 rounded"></div>
                            <span className="text-foreground/70">Today</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab 2: Posts */}
            {activeTab === 'posts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-foreground">
                    Community Posts
                  </h3>
                  <button className="btn-primary inline-flex items-center">
                    <Plus className="h-4 w-4 mr-2" />
                    New Post
                  </button>
                </div>

                <div className="text-center py-12">
                  <Newspaper className="mx-auto h-12 w-12 text-foreground/40" weight="duotone" />
                  <h3 className="mt-2 text-sm font-medium text-foreground">No posts yet</h3>
                  <p className="mt-1 text-sm text-foreground/60">
                    Community posts and announcements will appear here.
                  </p>
                  <div className="mt-6">
                    <button className="btn-primary inline-flex items-center">
                      <Plus className="h-4 w-4 mr-2" />
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
                  <h3 className="text-lg font-medium text-foreground">
                    Support Tickets
                  </h3>
                  <button
                    onClick={() => setShowCreateTicketModal(true)}
                    className="btn-primary inline-flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Ticket
                  </button>
                </div>

                {loadingTickets ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                  </div>
                ) : tickets.length > 0 ? (
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="glass-card p-4 cursor-pointer"
                        onClick={() => setSelectedTicketToView(ticket)}
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
                    <Ticket className="mx-auto h-12 w-12 text-foreground/40" weight="duotone" />
                    <h3 className="mt-2 text-sm font-medium text-foreground">No tickets yet</h3>
                    <p className="mt-1 text-sm text-foreground/60">
                      Need help? Create a support ticket and our team will assist you.
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={() => setShowCreateTicketModal(true)}
                        className="btn-primary inline-flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-2" />
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 w-96 glass-card">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-foreground">
                    {selectedSession.scheduled_at ? 'Reschedule' : 'Schedule'} Session
                  </h3>
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="text-foreground/50 hover:text-cyan-400 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-foreground">{selectedSession.title}</h4>
                  <p className="text-sm text-foreground/60">
                    {selectedSession.plugin_id} • {selectedSession.duration_minutes} minutes
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleForm.scheduled_at}
                      onChange={(e) => setScheduleForm({...scheduleForm, scheduled_at: e.target.value})}
                      className="glass-input w-full px-3 py-2 rounded-md text-foreground"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={scheduleForm.duration_minutes}
                      onChange={(e) => setScheduleForm({...scheduleForm, duration_minutes: parseInt(e.target.value)})}
                      className="glass-input w-full px-3 py-2 rounded-md text-foreground"
                      min="15"
                      max="180"
                      required
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleScheduleSession}
                    disabled={!scheduleForm.scheduled_at}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 max-w-2xl glass-card">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-foreground">
                    Session Details
                  </h3>
                  <button
                    onClick={() => setShowSessionDetails(false)}
                    className="text-foreground/50 hover:text-cyan-400 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-foreground">{selectedSession.title}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedSession.is_mandatory
                          ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
                      }`}>
                        {selectedSession.is_mandatory ? 'Required' : 'Optional'}
                      </span>
                      <span className="text-sm text-foreground/60">
                        {selectedSession.plugin_id} • {selectedSession.duration_minutes} minutes
                      </span>
                    </div>
                  </div>

                  {selectedSession.description && (
                    <div>
                      <h5 className="font-medium text-foreground mb-2">Description</h5>
                      <p className="text-sm text-foreground/70">{selectedSession.description}</p>
                    </div>
                  )}

                  {selectedSession.scheduled_at && (
                    <div>
                      <h5 className="font-medium text-foreground mb-1">Scheduled Time</h5>
                      <p className="text-sm text-foreground/70">
                        {new Date(selectedSession.scheduled_at).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {selectedSession.meeting_link && (
                    <div>
                      <h5 className="font-medium text-foreground mb-1">Meeting Link</h5>
                      <button
                        onClick={() => window.open(selectedSession.meeting_link, '_blank')}
                        className="btn-primary inline-flex items-center"
                      >
                        <VideoCamera className="h-4 w-4 mr-2" />
                        Join Session
                      </button>
                    </div>
                  )}

                  <div className="border-t border-cyan-500/10 pt-4 mt-6">
                    <div className="flex space-x-3">
                      {selectedSession.status !== 'completed' && (
                        <button
                          onClick={() => {
                            setShowSessionDetails(false)
                            openScheduleModal(selectedSession)
                          }}
                          className="btn-ghost inline-flex items-center"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 max-w-2xl glass-card">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-foreground">
                    Create Support Ticket
                  </h3>
                  <button
                    onClick={() => setShowCreateTicketModal(false)}
                    className="text-foreground/50 hover:text-cyan-400 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={ticketForm.title}
                      onChange={(e) => setTicketForm({...ticketForm, title: e.target.value})}
                      className="glass-input w-full px-3 py-2 rounded-md text-foreground"
                      placeholder="Brief description of the issue"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Description
                    </label>
                    <textarea
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                      className="glass-input w-full px-3 py-2 rounded-md text-foreground"
                      rows={4}
                      placeholder="Detailed description of the issue"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-1">
                        Type
                      </label>
                      <select
                        value={ticketForm.ticket_type}
                        onChange={(e) => setTicketForm({...ticketForm, ticket_type: e.target.value as Ticket['ticket_type']})}
                        className="glass-input w-full px-3 py-2 rounded-md text-foreground"
                      >
                        <option value="bug">Bug</option>
                        <option value="feature_request">Feature Request</option>
                        <option value="improvement">Improvement</option>
                        <option value="support">Support</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-1">
                        Priority
                      </label>
                      <select
                        value={ticketForm.priority}
                        onChange={(e) => setTicketForm({...ticketForm, priority: e.target.value as Ticket['priority']})}
                        className="glass-input w-full px-3 py-2 rounded-md text-foreground"
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
                    className="btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTicket}
                    disabled={!ticketForm.title || !ticketForm.description}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Ticket
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Ticket Details Modal */}
        {selectedTicketToView && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border max-w-3xl shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Ticket Details
                    </h3>
                    <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                      {selectedTicketToView.ticket_key}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedTicketToView(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Status and Type Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(selectedTicketToView.status)}`}>
                      {selectedTicketToView.status.replace('_', ' ')}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200">
                      {selectedTicketToView.ticket_type.replace('_', ' ')}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityBadgeColor(selectedTicketToView.priority)}`}>
                      Priority: {selectedTicketToView.priority}
                    </span>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title
                    </label>
                    <div className="text-base font-medium text-gray-900 dark:text-white">
                      {selectedTicketToView.title}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                      {selectedTicketToView.description}
                    </div>
                  </div>

                  {/* Additional Details Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {selectedTicketToView.application_section && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Application Section
                        </label>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {selectedTicketToView.application_section}
                        </div>
                      </div>
                    )}
                    {selectedTicketToView.plugin_name && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Plugin
                        </label>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {selectedTicketToView.plugin_name}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Created
                      </label>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(selectedTicketToView.created_at).toLocaleString()}
                      </div>
                    </div>
                    {selectedTicketToView.updated_at && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Last Updated
                        </label>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {new Date(selectedTicketToView.updated_at).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Steps to Reproduce (for bugs) */}
                  {selectedTicketToView.steps_to_reproduce && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Steps to Reproduce
                      </label>
                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                        {selectedTicketToView.steps_to_reproduce}
                      </div>
                    </div>
                  )}

                  {/* Expected vs Actual Behavior */}
                  {(selectedTicketToView.expected_behavior || selectedTicketToView.actual_behavior) && (
                    <div className="grid grid-cols-2 gap-4">
                      {selectedTicketToView.expected_behavior && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Expected Behavior
                          </label>
                          <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md border border-gray-200 dark:border-gray-700">
                            {selectedTicketToView.expected_behavior}
                          </div>
                        </div>
                      )}
                      {selectedTicketToView.actual_behavior && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Actual Behavior
                          </label>
                          <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md border border-gray-200 dark:border-gray-700">
                            {selectedTicketToView.actual_behavior}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resolution (if resolved/closed) */}
                  {selectedTicketToView.resolution_notes && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                      <label className="block text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-2">
                        Resolution
                      </label>
                      <div className="text-sm text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap">
                        {selectedTicketToView.resolution_notes}
                      </div>
                    </div>
                  )}

                  {/* Status info */}
                  <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-4">
                    <div className="text-sm text-cyan-800 dark:text-cyan-300">
                      {selectedTicketToView.status === 'open' && 'Your ticket has been received and is awaiting review by our support team.'}
                      {selectedTicketToView.status === 'in_progress' && 'Our team is actively working on your ticket.'}
                      {selectedTicketToView.status === 'pending_user' && 'We need additional information from you. Please check for any comments or requests.'}
                      {selectedTicketToView.status === 'resolved' && 'This ticket has been marked as resolved. If you still have issues, you can create a new ticket.'}
                      {selectedTicketToView.status === 'closed' && 'This ticket has been closed. If you need further assistance, please create a new ticket.'}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setSelectedTicketToView(null)}
                    className="btn-ghost"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download Desktop Application Modal */}
        {showDownloadModal && desktopAppInfo && desktopAppInfo.latestVersion && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 max-w-2xl glass-card">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-foreground">
                    Download {brandName}
                  </h3>
                  <button
                    onClick={() => setShowDownloadModal(false)}
                    className="text-foreground/50 hover:text-cyan-400 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-cyan-800 dark:text-cyan-200">
                          Latest Version: {desktopAppInfo.latestVersion}
                        </h3>
                        <div className="mt-2 text-sm text-cyan-700 dark:text-cyan-300">
                          <p>Platform detected: <strong className="capitalize">{desktopAppInfo.platform}</strong></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">
                      Choose your installer format:
                    </h4>
                    <div className="space-y-2">
                      {desktopAppInfo.platform === 'windows' && (
                        <button
                          onClick={() => handleDownload('exe')}
                          disabled={downloadingApp}
                          className="w-full flex items-center justify-between px-4 py-3 glass-card"
                        >
                          <div className="flex items-center">
                            <svg className="h-8 w-8 text-cyan-500" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                            </svg>
                            <div className="ml-3 text-left">
                              <p className="text-sm font-medium text-foreground">
                                Download for Windows
                              </p>
                              <p className="text-xs text-foreground/60">
                                Windows installer (.exe)
                              </p>
                            </div>
                          </div>
                          <svg className="h-5 w-5 text-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      )}
                      {desktopAppInfo.platform === 'macos' && (
                        <button
                          onClick={() => handleDownload('dmg')}
                          disabled={downloadingApp}
                          className="w-full flex items-center justify-between px-4 py-3 glass-card"
                        >
                          <div className="flex items-center">
                            <svg className="h-8 w-8 text-cyan-500" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>
                            <div className="ml-3 text-left">
                              <p className="text-sm font-medium text-foreground">
                                Disk Image (.dmg)
                              </p>
                              <p className="text-xs text-foreground/60">
                                Standard macOS installer
                              </p>
                            </div>
                          </div>
                          <svg className="h-5 w-5 text-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      )}
                      {desktopAppInfo.platform === 'linux' && (
                        <>
                          <button
                            onClick={() => handleDownload('AppImage')}
                            disabled={downloadingApp}
                            className="w-full flex items-center justify-between px-4 py-3 glass-card"
                          >
                            <div className="flex items-center">
                              <svg className="h-8 w-8 text-cyan-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.84-.41 1.684-.287 2.489a6.372 6.372 0 002.716 4.521c.885.584 1.249.584 2.716.584 1.092 0 2.716-.584 2.716-2.489 0-1.467.584-2.716 1.467-2.716 1.467 0 2.716 1.467 2.716 2.716 0 1.905 1.624 2.489 2.716 2.489 1.467 0 1.831 0 2.716-.584a6.372 6.372 0 002.716-4.521c.123-.805-.009-1.649-.287-2.489-.589-1.771-1.831-3.47-2.716-4.521-.75-1.067-.974-1.928-1.05-3.02-.065-1.491 1.056-5.965-3.17-6.298-.165-.013-.325-.021-.48-.021z" />
                              </svg>
                              <div className="ml-3 text-left">
                                <p className="text-sm font-medium text-foreground">
                                  AppImage
                                </p>
                                <p className="text-xs text-foreground/60">
                                  Universal Linux package
                                </p>
                              </div>
                            </div>
                            <svg className="h-5 w-5 text-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDownload('deb')}
                            disabled={downloadingApp}
                            className="w-full flex items-center justify-between px-4 py-3 glass-card"
                          >
                            <div className="flex items-center">
                              <svg className="h-8 w-8 text-cyan-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.84-.41 1.684-.287 2.489a6.372 6.372 0 002.716 4.521c.885.584 1.249.584 2.716.584 1.092 0 2.716-.584 2.716-2.489 0-1.467.584-2.716 1.467-2.716 1.467 0 2.716 1.467 2.716 2.716 0 1.905 1.624 2.489 2.716 2.489 1.467 0 1.831 0 2.716-.584a6.372 6.372 0 002.716-4.521c.123-.805-.009-1.649-.287-2.489-.589-1.771-1.831-3.47-2.716-4.521-.75-1.067-.974-1.928-1.05-3.02-.065-1.491 1.056-5.965-3.17-6.298-.165-.013-.325-.021-.48-.021z" />
                              </svg>
                              <div className="ml-3 text-left">
                                <p className="text-sm font-medium text-foreground">
                                  Debian Package (.deb)
                                </p>
                                <p className="text-xs text-foreground/60">
                                  For Debian/Ubuntu systems
                                </p>
                              </div>
                            </div>
                            <svg className="h-5 w-5 text-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        {/* Available Slots Modal */}
        {showSlotsModal && selectedDate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="max-w-3xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Available Slots - {formatDate(selectedDate.toISOString())}
                  </h2>
                  <button
                    onClick={() => {
                      setShowSlotsModal(false)
                      setSelectedDate(null)
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-3">
                  {getSlotsForDate(selectedDate).map((slot: any) => {
                    const segments = generateHourlySegments(slot)
                    return (
                      <div key={slot.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="mb-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <User className="h-4 w-4" />
                            <span>{slot.admin.full_name || slot.admin.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <VideoCamera className="h-4 w-4" />
                            <span className="capitalize">{slot.meeting_platform}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-foreground/80 mb-2">Available 1-Hour Sessions:</p>
                          {segments.map((segment: any, index: number) => (
                            <div key={index} className="flex items-center justify-between glass-card !rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-cyan-500" />
                                <span className="text-sm font-medium text-foreground">
                                  {formatTime(segment.segment_start)}
                                </span>
                                <span className="text-sm text-foreground/60">-</span>
                                <span className="text-sm font-medium text-foreground">
                                  {formatTime(segment.segment_end)}
                                </span>
                                <span className="text-xs text-foreground/50">(60 min)</span>
                              </div>
                              <button
                                onClick={() => {
                                  setShowSlotsModal(false)
                                  openBookingModal(segment)
                                }}
                                className="btn-primary text-sm inline-flex items-center"
                              >
                                Book
                                <ArrowRight className="h-3 w-3 ml-1" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Booking Confirmation Modal */}
        {showBookingModal && bookingSlot && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="max-w-lg w-full glass-card p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Confirm Booking
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <div className="text-sm text-foreground/60">Date & Time</div>
                  <div className="text-lg font-semibold text-foreground">
                    {formatDate(bookingSlot.segment_start || bookingSlot.start_time)}
                  </div>
                  <div className="text-foreground/80">
                    {formatTime(bookingSlot.segment_start || bookingSlot.start_time)} - {formatTime(bookingSlot.segment_end || bookingSlot.end_time)}
                  </div>
                  <div className="text-xs text-cyan-500 mt-1">
                    60 minute session
                  </div>
                </div>

                <div>
                  <div className="text-sm text-foreground/60">Admin</div>
                  <div className="font-medium text-foreground">
                    {bookingSlot.admin.full_name || bookingSlot.admin.email}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-foreground/60">Platform</div>
                  <div className="font-medium text-foreground capitalize">
                    {bookingSlot.meeting_platform}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBookSession}
                  className="btn-primary flex-1"
                >
                  Confirm Booking
                </button>
                <button
                  onClick={() => {
                    setShowBookingModal(false)
                    setBookingSlot(null)
                  }}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
