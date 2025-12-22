'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  UsersThree as UserGroup,
  Calendar,
  ChartBar,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  X,
  Warning,
  Eye,
  Pencil,
  Trash,
  MagnifyingGlass,
  Funnel,
  CaretLeft,
  CaretRight
} from '@phosphor-icons/react'

interface License {
  id: string
  key_code: string
  license_type: string
  status: string
  category: string
  expires_at?: string
}

interface User {
  id: string
  email: string
  full_name?: string
  company?: string
  created_at: string
  user_key?: string
  license_count?: number
  licenses?: License[]
  license_summary?: {
    total: number
    centcom: number
    plugin: number
    active: number
    trial: number
    expired: number
    has_licenses: boolean
    has_centcom: boolean
    has_plugin: boolean
  }
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
  session_notes?: string
  admin_id?: string
  meeting_link?: string
  live_session_data?: any
  is_overdue?: boolean
  overdue_days?: number
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
  trial_pause_date?: string
  trial_cancellation_warning_sent?: boolean
  days_until_deactivation?: number
  deactivation_reason?: string
}

interface UserWithProgress {
  id: string
  email: string
  full_name?: string
  company?: string
  created_at: string
  licenses: {
    id: string
    key_code: string
    license_type: 'trial' | 'paid' | 'enterprise'
    status: string
    expires_at?: string
    enabled_plugins: string[]
    onboarding_progress?: {
      plugin_id: string
      total_sessions_required: number
      sessions_completed: number
      overall_status: string
      completion_rate: number
      is_overdue: boolean
      days_until_deadline?: number
      onboarding_deadline?: string
      upcoming_sessions: OnboardingSession[]
      completed_sessions: OnboardingSession[]
    }[]
  }[]
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
  const [selectedUser, setSelectedUser] = useState<UserWithProgress | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [usersWithProgress, setUsersWithProgress] = useState<UserWithProgress[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month')
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState<OnboardingSession | null>(null)
  const [sessionNotes, setSessionNotes] = useState('')

  // Session creation state
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [userLicenses, setUserLicenses] = useState<any[]>([])
  const [loadingUserLicenses, setLoadingUserLicenses] = useState(false)
  const [createSessionForm, setCreateSessionForm] = useState({
    user_id: '',
    license_key_id: '',
    template_id: '',
    custom_title: '',
    custom_description: '',
    scheduled_at: '',
    assigned_admin_id: user?.id || '',
    is_custom: false
  })

  // User search and filter state
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [userFilters, setUserFilters] = useState({
    hasLicenses: false,
    hasCentcom: false,
    hasPlugin: false,
    licenseStatus: 'all' as 'all' | 'active' | 'trial' | 'expired'
  })

  // License details modal state
  const [showLicenseDetailsModal, setShowLicenseDetailsModal] = useState(false)
  const [selectedUserLicenses, setSelectedUserLicenses] = useState<any[]>([])
  const [selectedUserName, setSelectedUserName] = useState('')

  // Availability management state
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [editingAvailabilitySlot, setEditingAvailabilitySlot] = useState<any | null>(null)
  const [availabilityViewMode, setAvailabilityViewMode] = useState<'calendar' | 'list'>('calendar')
  const [availabilityCurrentDate, setAvailabilityCurrentDate] = useState(new Date())
  const [availabilityFormData, setAvailabilityFormData] = useState({
    start_time: '',
    end_time: '',
    slot_type: 'onboarding',
    max_concurrent_sessions: 1,
    is_recurring: false,
    recurrence_pattern: '',
    recurrence_end_date: '',
    notes: '',
    location: '',
    meeting_platform: 'zoom'
  })

  // Session scheduling state
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedScheduleSession, setSelectedScheduleSession] = useState<any>(null)
  const [scheduleForm, setScheduleForm] = useState({
    scheduled_at: '',
    duration_minutes: 30,
    meeting_link: '',
    session_notes: ''
  })

  // Fetch data
  useEffect(() => {
    fetchData()
  }, [])

  // Load availability when tab changes
  useEffect(() => {
    if (activeTab === 'availability' && availabilitySlots.length === 0) {
      fetchAvailabilitySlots()
    }
  }, [activeTab])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch sessions, progress, and users in parallel
      const [sessionsRes, progressRes, usersRes, usersWithProgressRes] = await Promise.all([
        fetch('/api/admin/onboarding/sessions'),
        fetch('/api/admin/onboarding/progress'),
        fetch('/api/admin/users/list'), // Assuming you have this endpoint
        fetch('/api/admin/users/with-onboarding-progress') // New endpoint for comprehensive user data
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

      // Fetch comprehensive user progress data
      if (usersWithProgressRes.ok) {
        const usersWithProgressData = await usersWithProgressRes.json()
        setUsersWithProgress(usersWithProgressData.users || [])
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

  // User management functions
  const openUserModal = (user: UserWithProgress) => {
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'in_progress': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'overdue': return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'not_started': return 'bg-foreground/10 text-foreground/60 border-foreground/20'
      default: return 'bg-foreground/10 text-foreground/60 border-foreground/20'
    }
  }

  const getLicenseTypeColor = (type: string) => {
    switch (type) {
      case 'trial': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'paid': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'enterprise': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      default: return 'bg-foreground/10 text-foreground/60 border-foreground/20'
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

  // Filter users with progress
  const filteredUsersWithProgress = usersWithProgress.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.company?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const hasStatusMatch = statusFilter === 'all' || user.licenses.some(license => 
      license.onboarding_progress?.some(progress => progress.overall_status === statusFilter)
    )
    
    return matchesSearch && hasStatusMatch
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
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'sessions', name: 'Sessions', icon: ChartBar },
    { id: 'users', name: 'User Progress', icon: UserGroup },
    { id: 'availability', name: 'My Availability', icon: Clock },
    { id: 'bookings', name: 'Bookings', icon: Calendar }
  ]

  // Calendar helper functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const getCalendarDays = () => {
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const firstDayOfCalendar = new Date(firstDayOfMonth)
    firstDayOfCalendar.setDate(firstDayOfCalendar.getDate() - firstDayOfMonth.getDay())
    
    const days = []
    const currentDay = new Date(firstDayOfCalendar)
    
    // Generate 42 days (6 weeks * 7 days) for complete calendar grid
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay))
      currentDay.setDate(currentDay.getDate() + 1)
    }
    
    return days
  }

  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => {
      if (!session.scheduled_at) return false
      const sessionDate = new Date(session.scheduled_at)
      return sessionDate.toDateString() === date.toDateString()
    })
  }

  // Session notes functions
  const openNotesModal = (session: OnboardingSession) => {
    setSelectedSession(session)
    setSessionNotes(session.session_notes || '')
    setShowNotesModal(true)
  }

  const saveSessionNotes = async () => {
    if (!selectedSession) return
    
    try {
      // TODO: Implement API call to save notes
      console.log('Saving notes for session:', selectedSession.id, sessionNotes)
      
      // Update local state
      setSessions(prev => prev.map(s => 
        s.id === selectedSession.id 
          ? { ...s, session_notes: sessionNotes }
          : s
      ))
      
      setShowNotesModal(false)
      setSelectedSession(null)
      setSessionNotes('')
    } catch (error) {
      console.error('Error saving session notes:', error)
    }
  }

  // Session creation functions
  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const response = await fetch('/api/admin/onboarding/templates')
      const data = await response.json()
      
      if (response.ok) {
        setTemplates(data.templates || [])
      } else {
        console.error('Failed to fetch templates:', data.error)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const fetchUserLicenses = async (userId: string) => {
    if (!userId) {
      setUserLicenses([])
      return
    }

    try {
      setLoadingUserLicenses(true)
      const response = await fetch(`/api/admin/users/${userId}/licenses`)
      const data = await response.json()
      
      if (data.error) {
        console.error('Error fetching user licenses:', data.error)
        setUserLicenses([])
      } else {
        setUserLicenses(data.licenses || [])
      }
    } catch (error) {
      console.error('Failed to fetch user licenses:', error)
      setUserLicenses([])
    } finally {
      setLoadingUserLicenses(false)
    }
  }

  const openCreateSessionModal = (userId?: string, licenseKeyId?: string) => {
    setCreateSessionForm(prev => ({
      ...prev,
      user_id: userId || '',
      license_key_id: licenseKeyId || '',
      template_id: '',
      custom_title: '',
      custom_description: '',
      scheduled_at: '',
      is_custom: false
    }))
    setShowCreateSessionModal(true)
    
    // Fetch templates if not already loaded
    if (templates.length === 0) {
      fetchTemplates()
    }
    
    // Fetch user licenses if user is provided
    if (userId) {
      fetchUserLicenses(userId)
    } else {
      setUserLicenses([])
    }
  }

  // Filter and search users
  const filteredUsers = users.filter(user => {
    // Search filter
    if (userSearchTerm) {
      const searchLower = userSearchTerm.toLowerCase()
      const matchesSearch =
        user.full_name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.user_key?.toLowerCase().includes(searchLower) ||
        user.company?.toLowerCase().includes(searchLower)

      if (!matchesSearch) return false
    }

    // License filters
    if (userFilters.hasLicenses && !user.license_summary?.has_licenses) {
      return false
    }

    if (userFilters.hasCentcom && !user.license_summary?.has_centcom) {
      return false
    }

    if (userFilters.hasPlugin && !user.license_summary?.has_plugin) {
      return false
    }

    // License status filter
    if (userFilters.licenseStatus !== 'all') {
      const statusKey = userFilters.licenseStatus as keyof typeof user.license_summary
      if (!user.license_summary || user.license_summary[statusKey] === 0) {
        return false
      }
    }

    return true
  })

  const handleUserChange = (newUserId: string) => {
    setCreateSessionForm(prev => ({
      ...prev,
      user_id: newUserId,
      license_key_id: '' // Reset license selection when user changes
    }))

    // Fetch licenses for the new user
    fetchUserLicenses(newUserId)
  }

  const resetFilters = () => {
    setUserSearchTerm('')
    setUserFilters({
      hasLicenses: false,
      hasCentcom: false,
      hasPlugin: false,
      licenseStatus: 'all'
    })
  }

  const openLicenseDetailsModal = (userLicenses: any[], userName: string) => {
    setSelectedUserLicenses(userLicenses)
    setSelectedUserName(userName)
    setShowLicenseDetailsModal(true)
  }

  // Session scheduling functions
  const openScheduleModal = (session: any) => {
    setSelectedScheduleSession(session)
    setScheduleForm({
      scheduled_at: session.scheduled_at ? new Date(session.scheduled_at).toISOString().slice(0, 16) : '',
      duration_minutes: session.duration_minutes || 30,
      meeting_link: '', // Will be available in future update
      session_notes: '' // Will be available in future update
    })
    setShowScheduleModal(true)
  }

  const scheduleSession = async () => {
    if (!selectedScheduleSession) return

    try {
      setLoading(true)
      
      const response = await fetch(`/api/admin/onboarding/sessions/${selectedScheduleSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_at: scheduleForm.scheduled_at ? new Date(scheduleForm.scheduled_at).toISOString() : null,
          duration_minutes: scheduleForm.duration_minutes,
          status: scheduleForm.scheduled_at ? 'scheduled' : 'pending'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setShowScheduleModal(false)
        setSelectedScheduleSession(null)
        // Refresh the data
        fetchData()
        alert('Session scheduled successfully!')
      } else {
        alert(`Error: ${data.error || 'Failed to schedule session'}`)
      }
    } catch (error) {
      console.error('Error scheduling session:', error)
      alert('Error scheduling session')
    } finally {
      setLoading(false)
    }
  }

  const createSession = async () => {
    try {
      // Clean up form data - convert empty strings to null for timestamp and UUID fields
      const cleanScheduledAt = createSessionForm.scheduled_at?.trim() ? createSessionForm.scheduled_at : null
      const cleanAssignedAdminId = createSessionForm.assigned_admin_id?.trim() ? createSessionForm.assigned_admin_id : null

      const payload = createSessionForm.is_custom 
        ? {
            user_id: createSessionForm.user_id,
            license_key_id: createSessionForm.license_key_id,
            custom_title: createSessionForm.custom_title,
            custom_description: createSessionForm.custom_description,
            scheduled_at: cleanScheduledAt,
            assigned_admin_id: cleanAssignedAdminId
          }
        : {
            user_id: createSessionForm.user_id,
            license_key_id: createSessionForm.license_key_id,
            template_id: createSessionForm.template_id,
            scheduled_at: cleanScheduledAt,
            assigned_admin_id: cleanAssignedAdminId
          }

      const response = await fetch('/api/admin/onboarding/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        console.log('Session created successfully:', data.session)
        setShowCreateSessionModal(false)
        await fetchData() // Refresh data
      } else {
        console.error('Failed to create session:', data.error)
        alert(`Failed to create session: ${data.error}`)
      }
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Error creating session. Please try again.')
    }
  }

  const autoCreateSessions = async (userId: string, licenseKeyId: string) => {
    try {
      const response = await fetch('/api/admin/onboarding/auto-create-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          license_key_id: licenseKeyId,
          trigger_type: 'manual_trigger',
          triggered_by: user?.id
        })
      })

      const data = await response.json()

      if (response.ok) {
        console.log('Auto-created sessions:', data)
        alert(`Successfully created ${data.sessions_created} sessions automatically!`)
        await fetchData() // Refresh data
      } else {
        console.error('Failed to auto-create sessions:', data.error)
        alert(`Failed to auto-create sessions: ${data.error}`)
      }
    } catch (error) {
      console.error('Error auto-creating sessions:', error)
      alert('Error auto-creating sessions. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <Warning className="h-5 w-5 text-red-400" />
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

  // Availability calendar helper functions
  const fetchAvailabilitySlots = async () => {
    try {
      setLoadingAvailability(true)
      const response = await fetch('/api/admin/availability')
      if (response.ok) {
        const data = await response.json()
        setAvailabilitySlots(data.slots || [])
      }
    } catch (error) {
      console.error('Error fetching availability slots:', error)
    } finally {
      setLoadingAvailability(false)
    }
  }

  const handleCreateAvailabilitySlot = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(availabilityFormData)
      })

      if (response.ok) {
        const result = await response.json()
        await fetchAvailabilitySlots()
        setShowAvailabilityModal(false)
        resetAvailabilityForm()
        if (result.count && result.count > 1) {
          alert(`✅ Success! Created ${result.count} recurring availability slots.`)
        } else {
          alert('✅ Availability slot created successfully!')
        }
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating availability slot:', error)
      alert('Failed to create availability slot')
    }
  }

  const handleDeleteAvailabilitySlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this availability slot?')) return

    try {
      const response = await fetch(`/api/admin/availability/${slotId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchAvailabilitySlots()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting availability slot:', error)
      alert('Failed to delete availability slot')
    }
  }

  const resetAvailabilityForm = () => {
    setAvailabilityFormData({
      start_time: '',
      end_time: '',
      slot_type: 'onboarding',
      max_concurrent_sessions: 1,
      is_recurring: false,
      recurrence_pattern: '',
      recurrence_end_date: '',
      notes: '',
      location: '',
      meeting_platform: 'zoom'
    })
  }

  const openQuickCreateAvailability = (date: Date) => {
    const startDate = new Date(date)
    startDate.setHours(9, 0, 0, 0)
    const endDate = new Date(startDate)
    endDate.setHours(10, 0, 0, 0)

    setAvailabilityFormData({
      start_time: startDate.toISOString().slice(0, 16),
      end_time: endDate.toISOString().slice(0, 16),
      slot_type: 'onboarding',
      max_concurrent_sessions: 1,
      is_recurring: false,
      recurrence_pattern: '',
      recurrence_end_date: '',
      notes: '',
      location: '',
      meeting_platform: 'zoom'
    })
    setShowAvailabilityModal(true)
  }

  const getAvailabilityDaysInMonth = (date: Date) => {
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

  const getAvailabilitySlotsForDate = (date: Date | null) => {
    if (!date) return []
    const dateStr = date.toISOString().split('T')[0]
    return availabilitySlots.filter(slot => {
      const slotDate = new Date(slot.start_time).toISOString().split('T')[0]
      return slotDate === dateStr
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }

  const navigateAvailabilityMonth = (direction: 'prev' | 'next') => {
    setAvailabilityCurrentDate(prevDate => {
      const newDate = new Date(prevDate)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const formatAvailabilityTime = (dateString: string) => {
    const date = new Date(dateString);
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const tzStr = date.toLocaleTimeString('en-US', {
      timeZoneName: 'short'
    }).split(' ').pop(); // Gets timezone abbreviation (e.g., "PST", "EST")
    return `${timeStr} ${tzStr}`;
  }

  const isAvailabilityToday = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isAvailabilityPastDate = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Onboarding Management
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Manage user onboarding sessions and track trial license compliance
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
          <div className="glass-card p-5 overflow-hidden">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <UserGroup className="h-6 w-6 text-cyan-400" weight="duotone" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <p className="text-2xl font-bold tracking-tight text-foreground">{stats.totalUsers}</p>
                <p className="text-sm text-foreground/60">Total Users</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 overflow-hidden">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Calendar className="h-6 w-6 text-cyan-400" weight="duotone" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <p className="text-2xl font-bold tracking-tight text-foreground">{stats.totalSessions}</p>
                <p className="text-sm text-foreground/60">Total Sessions</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 overflow-hidden">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="h-6 w-6 text-emerald-400" weight="duotone" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <p className="text-2xl font-bold tracking-tight text-foreground">{stats.completedSessions}</p>
                <p className="text-sm text-foreground/60">Completed</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 overflow-hidden">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Clock className="h-6 w-6 text-cyan-400" weight="duotone" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <p className="text-2xl font-bold tracking-tight text-foreground">{stats.upcomingSessions}</p>
                <p className="text-sm text-foreground/60">Upcoming</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 overflow-hidden">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <Warning className="h-6 w-6 text-red-400" weight="duotone" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <p className="text-2xl font-bold tracking-tight text-foreground">{stats.overdueUsers}</p>
                <p className="text-sm text-foreground/60">Overdue</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 overflow-hidden">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <XCircle className="h-6 w-6 text-amber-400" weight="duotone" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <p className="text-2xl font-bold tracking-tight text-foreground">{stats.trialUsers}</p>
                <p className="text-sm text-foreground/60">Trial Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-cyan-500/10">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-foreground/50 hover:text-cyan-400 hover:border-cyan-500/30'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center cursor-pointer transition-colors`}
              >
                <tab.icon className="h-5 w-5 mr-2" weight={activeTab === tab.id ? 'duotone' : 'regular'} />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters and Actions */}
        <div className="glass-card mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlass className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/40" />
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
                  <Funnel className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/40" />
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
                  onClick={() => openCreateSessionModal()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Schedule Session
                </button>
                <button
                  onClick={fetchData}
                  className="bg-foreground/10 text-foreground/70 px-4 py-2 rounded-md hover:bg-gray-200"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="glass-card">
          {activeTab === 'calendar' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-foreground">Onboarding Calendar</h3>
                <div className="flex items-center space-x-4">
                  <select 
                    value={calendarView} 
                    onChange={(e) => setCalendarView(e.target.value as 'month' | 'week' | 'day')}
                    className="rounded-md border-gray-300 text-sm"
                  >
                    <option value="month">Month View</option>
                    <option value="week">Week View</option>
                    <option value="day">Day View</option>
                  </select>
                  <button
                    onClick={() => openCreateSessionModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Session
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Calendar */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-lg border border-cyan-500/20 p-4">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-lg font-medium text-foreground">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigateMonth('prev')}
                          className="p-2 hover:bg-gray-100 rounded-md"
                        >
                          <CaretLeft className="h-5 w-5 text-foreground/60" />
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
                          <CaretRight className="h-5 w-5 text-foreground/60" />
                        </button>
                      </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-0 mb-4">
                      {/* Day headers */}
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="p-3 text-center text-sm font-medium text-foreground/60 bg-cyan-500/5 border-r border-b border-gray-200 last:border-r-0">
                          {day}
                        </div>
                      ))}

                      {/* Calendar days */}
                      {getCalendarDays().map((date, index) => {
                        const dayNumber = date.getDate()
                        const isToday = date.toDateString() === new Date().toDateString()
                        const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                        const sessionsForDay = getSessionsForDate(date)
                        const overdueSessionsForDay = sessionsForDay.filter(s => s.is_overdue)
                        
                        return (
                          <div
                            key={index}
                            className={`min-h-[120px] p-2 border-r border-b border-gray-200 last:border-r-0 cursor-pointer hover:bg-cyan-500/5 ${
                              !isCurrentMonth ? 'bg-cyan-500/5 text-foreground/40' : ''
                            } ${isToday ? 'bg-blue-50' : ''}`}
                            onClick={() => setSelectedDate(date)}
                          >
                            <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
                              {dayNumber}
                            </div>
                            <div className="mt-1 space-y-1">
                              {sessionsForDay.slice(0, 3).map((session) => (
                                <div
                                  key={`calendar-${session.id}`}
                                  className={`text-xs p-1 rounded truncate ${
                                    session.is_overdue 
                                      ? 'bg-red-100 text-red-800 border-l-2 border-red-500' 
                                      : session.status === 'completed' 
                                        ? 'bg-green-100 text-green-800'
                                        : session.status === 'scheduled' 
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-foreground/10 text-foreground/80'
                                  }`}
                                >
                                  {session.is_overdue && '⚠️ '}
                                  {session.title}
                                </div>
                              ))}
                              {sessionsForDay.length > 3 && (
                                <div className="text-xs text-foreground/60">
                                  +{sessionsForDay.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* 🚨 CRITICAL ALERTS */}
                  <div className="bg-white rounded-lg border border-red-200 p-4">
                    <h4 className="text-md font-semibold text-red-900 mb-3 flex items-center">
                      <Warning className="h-5 w-5 text-red-500 mr-2" />
                      🚨 Critical Alerts
                    </h4>
                    <div className="space-y-3">
                      {/* Trial Deactivations (0-3 days) */}
                      {progress
                        .filter(p => p.days_until_deactivation !== null && p.days_until_deactivation !== undefined && p.days_until_deactivation <= 3)
                        .map((prog) => (
                        <div key={`critical-${prog.id}`} className="p-3 bg-red-50 border border-red-300 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-red-900">
                              {prog.user_profiles?.email || `User ${prog.user_id}`}
                            </p>
                            <span className="text-xs bg-red-200 text-red-900 px-2 py-1 rounded-full font-bold">
                              {prog.days_until_deactivation! <= 0 ? 'DEACTIVATED' : `${prog.days_until_deactivation} days`}
                            </span>
                          </div>
                          <p className="text-sm text-red-800 font-medium">
                            {prog.days_until_deactivation! <= 0 
                              ? '🔒 Trial license deactivated - onboarding incomplete'
                              : '⏰ Trial will be deactivated soon - schedule sessions immediately!'
                            }
                          </p>
                          <p className="text-xs text-red-700 mt-1">
                            Progress: {prog.sessions_completed}/{prog.total_sessions_required} sessions ({prog.completion_rate}%)
                          </p>
                        </div>
                      ))}

                      {/* Overdue Sessions */}
                      {sessions.filter(s => s.is_overdue).slice(0, 3).map((session) => (
                        <div key={`overdue-${session.id}`} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-orange-900">{session.title}</p>
                            <span className="text-xs bg-orange-200 text-orange-900 px-2 py-1 rounded-full">
                              {session.overdue_days} days overdue
                            </span>
                          </div>
                          <p className="text-sm text-orange-800">
                            {session.user_profiles?.email || `User ${session.user_id}`}
                          </p>
                          <p className="text-xs text-orange-700 mt-1">
                            Originally scheduled: {session.scheduled_at ? new Date(session.scheduled_at).toLocaleDateString() : 'No date'}
                          </p>
                        </div>
                      ))}

                      {progress.filter(p => p.days_until_deactivation !== null && p.days_until_deactivation !== undefined && p.days_until_deactivation <= 3).length === 0 && 
                       sessions.filter(s => s.is_overdue).length === 0 && (
                        <div className="text-sm text-foreground/60 italic">
                          ✅ No critical alerts - all trials are on track!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Today's Sessions */}
                  <div className="bg-white rounded-lg border border-cyan-500/20 p-4">
                    <h4 className="text-md font-semibold text-foreground mb-3 flex items-center">
                      <Clock className="h-5 w-5 text-blue-500 mr-2" />
                      Today's Sessions
                    </h4>
                    <div className="space-y-3">
                      {getSessionsForDate(new Date()).length > 0 ? (
                        getSessionsForDate(new Date()).map((session) => (
                          <div key={`upcoming-${session.id}`} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-blue-900">{session.title}</p>
                              <span className="text-xs text-blue-600">
                                {session.scheduled_at ? new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time'}
                              </span>
                            </div>
                            <p className="text-sm text-blue-700">
                              {session.user_profiles?.email || `User ${session.user_id}`}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                session.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                                'bg-foreground/10 text-foreground/80'
                              }`}>
                                {session.status.replace('_', ' ')}
                              </span>
                              {session.session_type === 'virtual_call' && session.meeting_link && (
                                <a 
                                  href={session.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  🎥 Join Call
                                </a>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-foreground/60">No sessions scheduled for today</p>
                      )}
                    </div>
                  </div>

                  {/* Warning Zone - 4-7 days */}
                  <div className="bg-white rounded-lg border border-orange-200 p-4">
                    <h4 className="text-md font-semibold text-orange-800 mb-3 flex items-center">
                      <Warning className="h-5 w-5 text-orange-500 mr-2" />
                      ⚠️ Warning Zone
                    </h4>
                    <div className="space-y-3">
                      {progress
                        .filter(p => p.days_until_deactivation !== null && p.days_until_deactivation !== undefined && p.days_until_deactivation > 3 && p.days_until_deactivation <= 7)
                        .map((prog) => (
                        <div key={`warning-${prog.id}`} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-orange-900">
                              {prog.user_profiles?.email || `User ${prog.user_id}`}
                            </p>
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                              {prog.days_until_deactivation} days left
                            </span>
                          </div>
                          <p className="text-sm text-orange-700">
                            Schedule remaining sessions soon to avoid trial deactivation
                          </p>
                          <p className="text-xs text-orange-600 mt-1">
                            Progress: {prog.sessions_completed}/{prog.total_sessions_required} sessions
                          </p>
                        </div>
                      ))}
                      
                      {progress.filter(p => p.days_until_deactivation !== null && p.days_until_deactivation !== undefined && p.days_until_deactivation > 3 && p.days_until_deactivation <= 7).length === 0 && (
                        <p className="text-sm text-foreground/60">No trials in warning zone</p>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-white rounded-lg border border-cyan-500/20 p-4">
                    <h4 className="text-md font-semibold text-foreground mb-3">Quick Stats</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-foreground/60">This Week</span>
                        <span className="text-sm font-medium">{sessions.filter(s => {
                          const sessionDate = s.scheduled_at ? new Date(s.scheduled_at) : null
                          if (!sessionDate) return false
                          const weekStart = new Date(currentDate)
                          weekStart.setDate(weekStart.getDate() - weekStart.getDay())
                          const weekEnd = new Date(weekStart)
                          weekEnd.setDate(weekEnd.getDate() + 6)
                          return sessionDate >= weekStart && sessionDate <= weekEnd
                        }).length} sessions</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-foreground/60">Overdue</span>
                        <span className="text-sm font-medium text-red-600">{sessions.filter(s => s.is_overdue).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-foreground/60">Critical Trials</span>
                        <span className="text-sm font-medium text-red-600">
                          {progress.filter(p => p.days_until_deactivation !== null && p.days_until_deactivation !== undefined && p.days_until_deactivation <= 3).length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-foreground/60">Warning Trials</span>
                        <span className="text-sm font-medium text-orange-600">
                          {progress.filter(p => p.days_until_deactivation !== null && p.days_until_deactivation !== undefined && p.days_until_deactivation > 3 && p.days_until_deactivation <= 7).length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-4">
              {/* Session Actions */}
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    onClick={() => openCreateSessionModal()}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Session
                  </button>
                </div>
                <div className="text-sm text-foreground/60">
                  {filteredSessions.length} sessions
                </div>
              </div>

              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-cyan-500/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Session
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Scheduled
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Deadline
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      License
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSessions.map((session) => {
                    // Find user data from usersWithProgress
                    const user = usersWithProgress.find(u => u.id === session.user_id);
                    // Find license data from usersWithProgress
                    const license = user?.licenses?.find(l => l.id === session.license_key_id);
                    // Calculate deadline (30 days from session creation for trial licenses)
                    const deadline = license?.license_type === 'trial' 
                      ? new Date(new Date(session.created_at).getTime() + 30 * 24 * 60 * 60 * 1000)
                      : null;
                    const isOverdue = deadline && new Date() > deadline;
                    
                    return (
                    <tr key={`session-row-${session.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user?.full_name || user?.email || `User ${session.user_id.slice(0, 8)}`}
                          </div>
                          <div className="text-sm text-foreground/60">{user?.email || 'Unknown user'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                            <span>{session.title}</span>
                          </div>
                          <div className="text-sm text-foreground/60">
                            {session.plugin_id} • Session {session.session_number} • {session.duration_minutes}min
                          </div>
                          {session.description && (
                            <div className="text-xs text-foreground/40 mt-1 truncate max-w-xs">
                              {session.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          session.is_mandatory 
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {session.is_mandatory ? '⚠️ Required' : '📖 Optional'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.scheduled_at ? new Date(session.scheduled_at).toLocaleString() : 'Not scheduled'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {deadline ? (
                          <div className={`${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                            {deadline.toLocaleDateString()}
                            {isOverdue && (
                              <div className="text-xs text-red-500 font-medium">
                                {Math.ceil((new Date().getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24))} days overdue
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-foreground/60">No deadline</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            isOverdue ? 'bg-red-100 text-red-800 border border-red-300' :
                            session.status === 'completed' ? 'bg-green-100 text-green-800' :
                            session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                            session.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            session.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-foreground/10 text-foreground/80'
                          }`}>
                            {isOverdue ? '⚠️ OVERDUE' : session.status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {license?.key_code || 'Unknown License'}
                        </div>
                        <div className="text-sm text-foreground/60">
                          {license?.license_type} • {license?.status || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Schedule/Reschedule Button */}
                          <button 
                            onClick={() => openScheduleModal(session)}
                            className={`px-3 py-1 text-xs font-medium rounded-md ${
                              session.scheduled_at 
                                ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }`}
                            title={session.scheduled_at ? "Reschedule session" : "Schedule session"}
                          >
                            {session.scheduled_at ? 'Reschedule' : 'Schedule'}
                          </button>
                          
                          {/* View Details */}
                          <button 
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="View session details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {/* Edit/Notes */}
                          <button 
                            onClick={() => openNotesModal(session)}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                            title="Add session notes"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {filteredSessions.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-foreground/40" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions found</h3>
                  <p className="mt-1 text-sm text-foreground/60">
                    No onboarding sessions match your current filters.
                  </p>
                </div>
              )}
            </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-cyan-500/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Licenses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Outstanding Sessions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Completed Sessions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Deadlines
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsersWithProgress.map((user) => {
                    // Calculate session counts across all licenses
                    const allSessions = user.licenses.flatMap(license => 
                      license.onboarding_progress?.flatMap(progress => [
                        ...progress.upcoming_sessions || [],
                        ...progress.completed_sessions || []
                      ]) || []
                    )
                    
                    // Get outstanding sessions (from upcoming_sessions)
                    const outstandingSessions = user.licenses.flatMap(license => 
                      license.onboarding_progress?.flatMap(progress => 
                        progress.upcoming_sessions || []
                      ) || []
                    )
                    
                    // Get completed sessions
                    const completedSessionsList = user.licenses.flatMap(license => 
                      license.onboarding_progress?.flatMap(progress => 
                        progress.completed_sessions || []
                      ) || []
                    )
                    
                    const requiredOutstanding = outstandingSessions.filter(s => s.is_mandatory).length
                    const optionalOutstanding = outstandingSessions.filter(s => !s.is_mandatory).length
                    const completedSessions = completedSessionsList.length
                    
                    // Get overall status and closest deadline
                    const allProgress = user.licenses.flatMap(license => license.onboarding_progress || [])
                    const hasOverdue = allProgress.some(p => p.is_overdue)
                    const hasInProgress = allProgress.some(p => p.overall_status === 'in_progress')
                    const hasCompleted = allProgress.some(p => p.overall_status === 'completed')
                    
                    let overallStatus = 'No onboarding'
                    if (hasOverdue) overallStatus = 'Overdue'
                    else if (hasInProgress) overallStatus = 'In Progress'
                    else if (hasCompleted) overallStatus = 'Completed'
                    else if (allProgress.length > 0) overallStatus = 'Pending'
                    
                    // Find closest deadline
                    const closestDeadline = allProgress
                      .map(p => p.onboarding_deadline)
                      .filter(Boolean)
                      .map(d => new Date(d))
                      .sort((a, b) => a.getTime() - b.getTime())[0]
                    
                    return (
                      <tr key={`progress-${user.id}`} className="hover:bg-cyan-500/5">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : user.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || user.email}
                            </div>
                            <div className="text-sm text-foreground/60">{user.email}</div>
                            {user.company && (
                              <div className="text-xs text-foreground/40">{user.company}</div>
                            )}
                          </div>
                        </div>
                      </td>
                        {/* Licenses Column - Clickable Count */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => openLicenseDetailsModal(user.licenses, user.full_name || user.email)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-cyan-500/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <span className="text-lg font-semibold text-blue-600">{user.licenses.length}</span>
                            <span className="ml-1 text-foreground/60">{user.licenses.length === 1 ? 'license' : 'licenses'}</span>
                          </button>
                          <div className="mt-1 text-xs text-foreground/60">
                            {user.licenses.filter(l => l.license_type === 'trial').length > 0 && 
                              `${user.licenses.filter(l => l.license_type === 'trial').length} trial`}
                            {user.licenses.filter(l => l.license_type !== 'trial').length > 0 && 
                              ` ${user.licenses.filter(l => l.license_type !== 'trial').length} paid`}
                          </div>
                        </td>
                        {/* Outstanding Sessions Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="font-medium text-red-600">{requiredOutstanding}</span>
                              <span className="text-foreground/60 ml-1">required</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-orange-600">{optionalOutstanding}</span>
                              <span className="text-foreground/60 ml-1">optional</span>
                            </div>
                          </div>
                        </td>
                        
                        {/* Completed Sessions Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-center">
                            <span className="text-lg font-semibold text-green-600">{completedSessions}</span>
                            <div className="text-xs text-foreground/60">completed</div>
                          </div>
                        </td>
                        {/* Status Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(overallStatus.toLowerCase().replace(' ', '_'))}`}>
                            {overallStatus}
                          </span>
                        </td>
                        {/* Deadlines Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {closestDeadline ? (
                            <div className="text-sm">
                              <div className={`font-medium ${
                                closestDeadline < new Date() ? 'text-red-600' : 
                                closestDeadline <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'text-orange-600' : 
                                'text-gray-900'
                              }`}>
                                {closestDeadline.toLocaleDateString()}
                              </div>
                              <div className="text-xs text-foreground/60">
                                {closestDeadline < new Date() ? 'Overdue' : 
                                 closestDeadline <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'Due soon' : 
                                 'Upcoming'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-foreground/60">No deadlines</span>
                          )}
                        </td>
                        {/* Actions Column */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedUser(user)
                              setShowUserModal(true)
                            }}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              
              {filteredUsersWithProgress.length === 0 && (
                <div className="text-center py-12">
                  <UserGroup className="mx-auto h-12 w-12 text-foreground/40" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                  <p className="mt-1 text-sm text-foreground/60">
                    No users match your current filters.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Availability Tab */}
          {activeTab === 'availability' && (
            <div className="glass-card p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {availabilityCurrentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigateAvailabilityMonth('prev')}
                    className="px-3 py-2 border border-gray-300 rounded-md hover:bg-cyan-500/5"
                  >
                    <CaretLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setAvailabilityCurrentDate(new Date())}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-cyan-500/5"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => navigateAvailabilityMonth('next')}
                    className="px-3 py-2 border border-gray-300 rounded-md hover:bg-cyan-500/5"
                  >
                    <CaretRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Days of Week */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-700 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {getAvailabilityDaysInMonth(availabilityCurrentDate).map((date, index) => {
                  const daySlots = getAvailabilitySlotsForDate(date)
                  const isToday = isAvailabilityToday(date)
                  const isPast = isAvailabilityPastDate(date)

                  return (
                    <div
                      key={index}
                      className={`
                        min-h-[120px] border rounded-lg p-2 transition-all
                        ${date ? 'bg-white border-gray-200' : 'bg-cyan-500/5 border-transparent'}
                        ${isToday ? 'ring-2 ring-blue-500' : ''}
                        ${date && !isPast ? 'hover:shadow-md cursor-pointer' : ''}
                        ${isPast && date ? 'opacity-50' : ''}
                      `}
                      onClick={() => date && !isPast && openQuickCreateAvailability(date)}
                    >
                      {date && (
                        <>
                          <div className={`text-sm font-semibold mb-2 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                            {date.getDate()}
                          </div>

                          {daySlots.length > 0 && (
                            <div className="space-y-1">
                              {daySlots.slice(0, 3).map((slot) => (
                                <div
                                  key={slot.id}
                                  className={`text-xs p-1 rounded truncate ${
                                    slot.is_available
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  } hover:opacity-80`}
                                  title={`${formatAvailabilityTime(slot.start_time)} - ${formatAvailabilityTime(slot.end_time)}`}
                                >
                                  {formatAvailabilityTime(slot.start_time)}
                                </div>
                              ))}
                              {daySlots.length > 3 && (
                                <div className="text-xs text-foreground/60 text-center">
                                  +{daySlots.length - 3} more
                                </div>
                              )}
                            </div>
                          )}

                          {daySlots.length === 0 && !isPast && (
                            <div className="text-xs text-foreground/40 text-center mt-4">
                              Click to add
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 rounded"></div>
                  <span className="text-gray-700">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 rounded"></div>
                  <span className="text-gray-700">Full</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 ring-2 ring-blue-500 rounded"></div>
                  <span className="text-gray-700">Today</span>
                </div>
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="glass-card p-6">
              <div className="text-center py-8">
                <Calendar className="h-16 w-16 mx-auto text-foreground/40 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Bookings Management
                </h3>
                <p className="text-foreground/60 mb-4">
                  View and manage all onboarding session bookings
                </p>
                <a
                  href="/admin/onboarding/bookings"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  Open Bookings Page
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Session Modal */}
      {showCreateSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-foreground mb-4">Create Onboarding Session</h3>
            
            <div className="space-y-4">
              {/* User Selection with Search and Filters */}
              <div className="border border-gray-300 rounded-lg p-4 bg-cyan-500/5">
                <label className="block text-sm font-semibold text-gray-900 mb-3">Select User</label>

                {/* Search Bar */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Search by name, email, user key, or company..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 placeholder-gray-500"
                  />
                </div>

                {/* Filters */}
                <div className="mb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">Filters:</span>
                    <button
                      onClick={resetFilters}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Reset All
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Has Licenses Filter */}
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userFilters.hasLicenses}
                        onChange={(e) => setUserFilters(prev => ({ ...prev, hasLicenses: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-900">Has Licenses</span>
                    </label>

                    {/* Has Centcom Filter */}
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userFilters.hasCentcom}
                        onChange={(e) => setUserFilters(prev => ({ ...prev, hasCentcom: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-900">Has Centcom</span>
                    </label>

                    {/* Has Plugin Filter */}
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userFilters.hasPlugin}
                        onChange={(e) => setUserFilters(prev => ({ ...prev, hasPlugin: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-900">Has Plugin</span>
                    </label>

                    {/* License Status Filter */}
                    <div>
                      <select
                        value={userFilters.licenseStatus}
                        onChange={(e) => setUserFilters(prev => ({ ...prev, licenseStatus: e.target.value as any }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active Only</option>
                        <option value="trial">Trial Only</option>
                        <option value="expired">Expired Only</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* User Dropdown */}
                <div>
                  <select
                    value={createSessionForm.user_id}
                    onChange={(e) => handleUserChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900 bg-white"
                    size={8}
                  >
                    <option value="" className="text-foreground/60">Select a user...</option>
                    {filteredUsers.map(user => {
                      const displayName = user.full_name || user.email?.split('@')[0] || 'Unknown'
                      const userKey = user.user_key || 'No Key'
                      const summary = user.license_summary
                      const licenseInfo = summary
                        ? `${summary.total} total (C:${summary.centcom} P:${summary.plugin} A:${summary.active})`
                        : 'No licenses'

                      return (
                        <option key={`select-${user.id}`} value={user.id} className="py-1">
                          {`${displayName} | ${user.email} | ${userKey} | ${licenseInfo}`}
                        </option>
                      )
                    })}
                  </select>
                  <div className="mt-1 text-xs text-foreground/60">
                    Showing {filteredUsers.length} of {users.length} users
                  </div>
                </div>

                {/* Selected User Details */}
                {createSessionForm.user_id && users.find(u => u.id === createSessionForm.user_id) && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="text-xs text-gray-900 space-y-1">
                      <div className="font-semibold text-blue-900 mb-2">Selected User Details</div>
                      <div><span className="font-medium text-gray-700">Name:</span> <span className="text-gray-900">{users.find(u => u.id === createSessionForm.user_id)?.full_name || 'N/A'}</span></div>
                      <div><span className="font-medium text-gray-700">Email:</span> <span className="text-gray-900">{users.find(u => u.id === createSessionForm.user_id)?.email}</span></div>
                      <div><span className="font-medium text-gray-700">User Key:</span> <span className="text-gray-900 font-mono">{users.find(u => u.id === createSessionForm.user_id)?.user_key || 'Not assigned'}</span></div>
                      {users.find(u => u.id === createSessionForm.user_id)?.company && (
                        <div><span className="font-medium text-gray-700">Company:</span> <span className="text-gray-900">{users.find(u => u.id === createSessionForm.user_id)?.company}</span></div>
                      )}
                      {users.find(u => u.id === createSessionForm.user_id)?.license_summary && (
                        <div className="mt-2 pt-2 border-t border-blue-300">
                          <div className="font-medium text-gray-700 mb-1">License Summary:</div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-foreground/60">Total:</span>
                              <span className="ml-1 font-semibold text-gray-900">{users.find(u => u.id === createSessionForm.user_id)?.license_summary?.total}</span>
                            </div>
                            <div>
                              <span className="text-foreground/60">Centcom:</span>
                              <span className="ml-1 font-semibold text-gray-900">{users.find(u => u.id === createSessionForm.user_id)?.license_summary?.centcom}</span>
                            </div>
                            <div>
                              <span className="text-foreground/60">Plugin:</span>
                              <span className="ml-1 font-semibold text-gray-900">{users.find(u => u.id === createSessionForm.user_id)?.license_summary?.plugin}</span>
                            </div>
                            <div>
                              <span className="text-foreground/60">Active:</span>
                              <span className="ml-1 font-semibold text-green-700">{users.find(u => u.id === createSessionForm.user_id)?.license_summary?.active}</span>
                            </div>
                            <div>
                              <span className="text-foreground/60">Trial:</span>
                              <span className="ml-1 font-semibold text-yellow-700">{users.find(u => u.id === createSessionForm.user_id)?.license_summary?.trial}</span>
                            </div>
                            <div>
                              <span className="text-foreground/60">Expired:</span>
                              <span className="ml-1 font-semibold text-red-700">{users.find(u => u.id === createSessionForm.user_id)?.license_summary?.expired}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* License Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License</label>
                {loadingUserLicenses ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-cyan-500/5 text-foreground/60">
                    Loading licenses...
                  </div>
                ) : userLicenses.length === 0 ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-cyan-500/5 text-foreground/60">
                    {createSessionForm.user_id ? 'No licenses found for this user' : 'Select a user first'}
                  </div>
                ) : (
                  <select
                    value={createSessionForm.license_key_id}
                    onChange={(e) => setCreateSessionForm(prev => ({ ...prev, license_key_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a license...</option>
                    {userLicenses.map(license => (
                      <option key={license.id} value={license.id}>
                        {license.key_code} ({license.license_type}) - {license.status_display}
                        {license.expires_at && ` - Expires: ${license.formatted_expiry}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Session Type Toggle */}
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!createSessionForm.is_custom}
                    onChange={() => setCreateSessionForm(prev => ({ ...prev, is_custom: false }))}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">From Template</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={createSessionForm.is_custom}
                    onChange={() => setCreateSessionForm(prev => ({ ...prev, is_custom: true }))}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Custom Session</span>
                </label>
              </div>

              {/* Template Selection */}
              {!createSessionForm.is_custom && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Session Template</label>
                  {loadingTemplates ? (
                    <div className="text-sm text-foreground/60">Loading templates...</div>
                  ) : (
                    <select
                      value={createSessionForm.template_id}
                      onChange={(e) => setCreateSessionForm(prev => ({ ...prev, template_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a template...</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.title} ({template.plugin_id}) - {template.duration_minutes}min
                        </option>
                      ))}
                    </select>
                  )}
                  
                  {/* Template Preview */}
                  {createSessionForm.template_id && templates.find(t => t.id === createSessionForm.template_id) && (
                    <div className="mt-2 p-3 bg-cyan-500/5 rounded-md">
                      <h4 className="text-sm font-medium text-gray-900">Template Details:</h4>
                      <p className="text-sm text-foreground/60 mt-1">
                        {templates.find(t => t.id === createSessionForm.template_id)?.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-foreground/60">
                        <span>Duration: {templates.find(t => t.id === createSessionForm.template_id)?.duration_minutes} min</span>
                        <span>Plugin: {templates.find(t => t.id === createSessionForm.template_id)?.plugin_id}</span>
                        <span className={templates.find(t => t.id === createSessionForm.template_id)?.is_mandatory ? 'text-red-600' : 'text-green-600'}>
                          {templates.find(t => t.id === createSessionForm.template_id)?.is_mandatory ? 'Mandatory' : 'Optional'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Session Fields */}
              {createSessionForm.is_custom && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Title</label>
                    <input
                      type="text"
                      value={createSessionForm.custom_title}
                      onChange={(e) => setCreateSessionForm(prev => ({ ...prev, custom_title: e.target.value }))}
                      placeholder="Enter session title..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={createSessionForm.custom_description}
                      onChange={(e) => setCreateSessionForm(prev => ({ ...prev, custom_description: e.target.value }))}
                      placeholder="Enter session description..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Scheduled Date/Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  value={createSessionForm.scheduled_at}
                  onChange={(e) => setCreateSessionForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowCreateSessionModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={createSession}
                disabled={!createSessionForm.user_id || !createSessionForm.license_key_id || 
                         (!createSessionForm.is_custom && !createSessionForm.template_id) ||
                         (createSessionForm.is_custom && !createSessionForm.custom_title)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* License Details Modal */}
      {showLicenseDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-foreground">
                License Details - {selectedUserName}
              </h3>
              <button
                onClick={() => setShowLicenseDetailsModal(false)}
                className="text-foreground/40 hover:text-foreground/60"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {selectedUserLicenses.map((license) => (
                <div key={license.id} className="border border-cyan-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getLicenseTypeColor(license.license_type)}`}>
                        {license.license_type.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {license.key_code}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      license.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-foreground/10 text-foreground/80'
                    }`}>
                      {license.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-foreground/60">Assigned:</span>
                      <span className="ml-2 text-gray-900">
                        {license.assigned_at ? new Date(license.assigned_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground/60">Expires:</span>
                      <span className="ml-2 text-gray-900">
                        {license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                    {license.enabled_plugins && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-foreground/60">Enabled Plugins:</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {license.enabled_plugins.map((plugin, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              {plugin}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {license.onboarding_progress && license.onboarding_progress.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Onboarding Progress</h4>
                      {license.onboarding_progress.map((progress, idx) => (
                        <div key={idx} className="bg-cyan-500/5 rounded p-3 mb-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Plugin: {progress.plugin_id || 'centcom'}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(progress.overall_status)}`}>
                              {progress.overall_status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-foreground/60">
                            <span>Sessions: {progress.sessions_completed}/{progress.total_sessions_required}</span>
                            {progress.onboarding_deadline && (
                              <span>Deadline: {new Date(progress.onboarding_deadline).toLocaleDateString()}</span>
                            )}
                          </div>
                          {progress.completion_rate !== undefined && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${progress.completion_rate}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-foreground/60 mt-1">{progress.completion_rate}% complete</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {selectedUserLicenses.length === 0 && (
                <div className="text-center py-8 text-foreground/60">
                  No licenses found for this user.
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowLicenseDetailsModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="flex flex-col h-full min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-lg font-medium text-white">
                      {selectedUser.full_name ? selectedUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : selectedUser.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-gray-900">
                      {selectedUser.full_name || selectedUser.email}
                    </h3>
                    <p className="text-sm text-foreground/60">{selectedUser.email}</p>
                    {selectedUser.company && (
                      <p className="text-sm text-foreground/60">{selectedUser.company}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-foreground/40 hover:text-foreground/60"
                >
                  <XCircle className="h-8 w-8" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0" style={{maxHeight: 'calc(90vh - 120px)'}}>
                <div className="space-y-8">
                  {/* User Information */}
                  <div className="bg-cyan-500/5 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-foreground mb-3">User Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground/60">Email</label>
                        <p className="text-sm text-gray-900">{selectedUser.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground/60">Full Name</label>
                        <p className="text-sm text-gray-900">{selectedUser.full_name || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground/60">Company</label>
                        <p className="text-sm text-gray-900">{selectedUser.company || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground/60">Created</label>
                        <p className="text-sm text-gray-900">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground/60">Total Licenses</label>
                        <p className="text-sm text-gray-900">{selectedUser.licenses.length}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground/60">Active Licenses</label>
                        <p className="text-sm text-gray-900">
                          {selectedUser.licenses.filter(l => l.status === 'active').length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Licenses and Onboarding Progress */}
                  {selectedUser.licenses.map((license) => (
                    <div key={license.id} className="border border-cyan-500/20 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getLicenseTypeColor(license.license_type)}`}>
                            {license.license_type.toUpperCase()}
                          </span>
                          <span className="text-lg font-medium text-foreground">
                            License: {license.key_code}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            license.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-foreground/10 text-foreground/80'
                          }`}>
                            {license.status}
                          </span>
                          {license.expires_at && (
                            <span className="text-sm text-foreground/60">
                              Expires: {new Date(license.expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* License Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Enabled Plugins</h5>
                          <div className="flex flex-wrap gap-2">
                            {license.enabled_plugins.map((plugin) => (
                              <span key={plugin} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {plugin}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">License Status</h5>
                          <p className="text-sm text-gray-900">{license.status}</p>
                          {license.expires_at && (
                            <p className="text-xs text-foreground/60 mt-1">
                              Expires on {new Date(license.expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Onboarding Progress */}
                      {license.onboarding_progress && license.onboarding_progress.length > 0 ? (
                        <div>
                          <h5 className="text-lg font-medium text-foreground mb-4">Onboarding Progress</h5>
                          <div className="space-y-4">
                            {license.onboarding_progress.map((progress, idx) => (
                              <div key={idx} className="bg-white border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-3">
                                    <h6 className="text-md font-medium text-gray-900">{progress.plugin_id}</h6>
                                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(progress.overall_status)}`}>
                                      {progress.overall_status.replace('_', ' ')}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-gray-900">{progress.completion_rate}%</div>
                                    <div className="text-xs text-foreground/60">
                                      {progress.sessions_completed}/{progress.total_sessions_required} sessions
                                    </div>
                                  </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ width: `${progress.completion_rate}%` }}
                                  ></div>
                                </div>

                                {/* Deadline Information */}
                                {progress.onboarding_deadline && (
                                  <div className="mb-4 p-3 rounded-lg bg-cyan-500/5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-gray-700">Deadline</span>
                                      <div className="text-right">
                                        <div className="text-sm text-gray-900">
                                          {new Date(progress.onboarding_deadline).toLocaleDateString()}
                                        </div>
                                        <div className={`text-xs ${progress.is_overdue ? 'text-red-600' : 'text-foreground/60'}`}>
                                          {progress.days_until_deadline && progress.days_until_deadline > 0 
                                            ? `${progress.days_until_deadline} days remaining`
                                            : progress.is_overdue 
                                            ? 'Overdue'
                                            : 'Due today'
                                          }
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Sessions */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Upcoming Sessions */}
                                  <div>
                                    <div className="text-sm font-medium text-gray-700 mb-2 block">Upcoming Sessions</div>
                                    <div className="space-y-2">
                                      {progress.upcoming_sessions.length > 0 ? (
                                        progress.upcoming_sessions.map((session) => (
                                          <div key={`progress-upcoming-${session.id}`} className="bg-blue-50 border border-blue-200 rounded p-3">
                                            <div className="flex items-center justify-between">
                                              <div className="flex-1">
                                                <div className="text-sm font-medium text-blue-900">{session.title}</div>
                                                <div className="text-xs text-blue-700">
                                                  {session.scheduled_at 
                                                    ? new Date(session.scheduled_at).toLocaleString()
                                                    : 'Not scheduled'
                                                  }
                                                </div>
                                                {session.is_mandatory && (
                                                  <span className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded mt-1 inline-block">
                                                    Required
                                                  </span>
                                                )}
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                  {session.duration_minutes}min
                                                </span>
                                                <button
                                                  onClick={() => openScheduleModal(session)}
                                                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                                >
                                                  {session.scheduled_at ? 'Reschedule' : 'Schedule'}
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-sm text-foreground/60 italic">No upcoming sessions</div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Completed Sessions */}
                                  <div>
                                    <div className="text-sm font-medium text-gray-700 mb-2 block">Completed Sessions</div>
                                    <div className="space-y-2">
                                      {progress.completed_sessions.length > 0 ? (
                                        progress.completed_sessions.slice(-3).map((session) => (
                                          <div key={`progress-completed-${session.id}`} className="bg-green-50 border border-green-200 rounded p-3">
                                            <div className="flex items-center justify-between">
                                              <div>
                                                <div className="text-sm font-medium text-green-900">{session.title}</div>
                                                <div className="text-xs text-green-700">
                                                  {session.scheduled_at 
                                                    ? new Date(session.scheduled_at).toLocaleDateString()
                                                    : 'N/A'
                                                  }
                                                </div>
                                              </div>
                                              <CheckCircle className="h-4 w-4 text-green-600" />
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-sm text-foreground/60 italic">No completed sessions</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-foreground/40 mb-2">
                            <CheckCircle className="h-12 w-12 mx-auto" />
                          </div>
                          <h5 className="text-lg font-medium text-foreground mb-1">No Onboarding Required</h5>
                          <p className="text-sm text-foreground/60">This license doesn't require onboarding sessions.</p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Quick Actions */}
                  <div className="bg-cyan-500/5 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-foreground mb-3">Quick Actions</h4>
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={() => openCreateSessionModal(selectedUser.id, selectedUser.licenses[0]?.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Session
                      </button>
                      <button 
                        onClick={() => {
                          // Close user modal and switch to calendar tab for scheduling
                          setShowUserModal(false)
                          setActiveTab('calendar')
                        }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule New Session
                      </button>
                      {selectedUser.licenses.length > 0 && (
                        <button 
                          onClick={() => autoCreateSessions(selectedUser.id, selectedUser.licenses[0].id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Auto-Create Sessions
                        </button>
                      )}
                      <button 
                        onClick={() => setActiveTab('calendar')}
                        className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center"
                      >
                        <ChartBar className="h-4 w-4 mr-2" />
                        View Calendar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Notes Modal */}
      {showNotesModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">
                Session Notes - {selectedSession.title}
              </h3>
              <button
                onClick={() => setShowNotesModal(false)}
                className="text-foreground/40 hover:text-foreground/60"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="bg-cyan-500/5 p-3 rounded-lg">
                <div className="text-sm text-foreground/60">
                  <p><strong>User:</strong> {selectedSession.user_profiles?.email || `User ${selectedSession.user_id}`}</p>
                  <p><strong>Session:</strong> {selectedSession.plugin_id} • Session {selectedSession.session_number}</p>
                  <p><strong>Status:</strong> {selectedSession.status.replace('_', ' ')}</p>
                  {selectedSession.scheduled_at && (
                    <p><strong>Scheduled:</strong> {new Date(selectedSession.scheduled_at).toLocaleString()}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="session-notes" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes
              </label>
              <textarea
                id="session-notes"
                rows={8}
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Add your notes about this session... 

Examples:
• User questions and concerns
• Technical issues encountered  
• Follow-up items required
• Session completion status
• Next steps or recommendations"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="mt-1 text-xs text-foreground/60">
                Notes are private to admins and help track session progress and issues.
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-foreground/60">
                {selectedSession.session_notes ? 'Last updated: ' + new Date().toLocaleDateString() : 'No previous notes'}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowNotesModal(false)}
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

      {/* Session Scheduling Modal */}
      {showScheduleModal && selectedScheduleSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">
                  {selectedScheduleSession.scheduled_at ? 'Reschedule Session' : 'Schedule Session'}
                </h3>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="text-foreground/40 hover:text-foreground/60"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session
                  </label>
                  <div className="text-sm text-gray-900 p-2 bg-cyan-500/5 rounded">
                    {selectedScheduleSession.title}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.scheduled_at}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <select
                    value={scheduleForm.duration_minutes}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Basic Scheduling</p>
                    <p>Additional features like meeting links and notes will be available in a future update.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={scheduleSession}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (selectedScheduleSession.scheduled_at ? 'Reschedule' : 'Schedule')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Availability Modal */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Availability Slot</h2>
            <form onSubmit={handleCreateAvailabilitySlot}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={availabilityFormData.start_time}
                    onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={availabilityFormData.end_time}
                    onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Concurrent Sessions</label>
                  <input
                    type="number"
                    min="1"
                    value={availabilityFormData.max_concurrent_sessions}
                    onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, max_concurrent_sessions: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Platform</label>
                  <select
                    value={availabilityFormData.meeting_platform}
                    onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, meeting_platform: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="zoom">Zoom</option>
                    <option value="google_meet">Google Meet</option>
                    <option value="teams">Microsoft Teams</option>
                    <option value="phone">Phone</option>
                    <option value="in_person">In Person</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Link/Location</label>
                  <input
                    type="text"
                    value={availabilityFormData.location}
                    onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, location: e.target.value })}
                    placeholder="e.g., https://zoom.us/j/123456789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_recurring"
                      checked={availabilityFormData.is_recurring}
                      onChange={(e) => {
                        const isChecked = e.target.checked
                        setAvailabilityFormData({
                          ...availabilityFormData,
                          is_recurring: isChecked,
                          recurrence_end_date: isChecked && !availabilityFormData.recurrence_end_date
                            ? new Date(new Date(availabilityFormData.start_time).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
                            : availabilityFormData.recurrence_end_date
                        })
                      }}
                      className="rounded"
                    />
                    <label htmlFor="is_recurring" className="text-sm font-medium text-gray-700">Recurring Availability</label>
                  </div>
                </div>
                {availabilityFormData.is_recurring && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Recurrence Pattern *</label>
                      <select
                        required={availabilityFormData.is_recurring}
                        value={availabilityFormData.recurrence_pattern}
                        onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, recurrence_pattern: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select pattern</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                      <input
                        type="datetime-local"
                        required={availabilityFormData.is_recurring}
                        value={availabilityFormData.recurrence_end_date}
                        onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, recurrence_end_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Create Slot</button>
                <button
                  type="button"
                  onClick={() => { setShowAvailabilityModal(false); resetAvailabilityForm() }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-cyan-500/5"
                >Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}