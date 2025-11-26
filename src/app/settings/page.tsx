'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import PaymentMethodSetup from '@/components/billing/PaymentMethodSetup'
import ClusterCreationWizard from '@/components/ClusterCreationWizard'
import { createClient } from '@/lib/supabase'
import {
  UserIcon,
  KeyIcon,
  ShieldCheckIcon,
  ComputerDesktopIcon,
  CreditCardIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  PencilIcon,
  CheckIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CircleStackIcon,
  PlusIcon,
  CloudIcon,
  CheckCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

type ViewType = 'home' | 'profile' | 'appearance' | 'payment' | 'licenses' | 'sessions' | 'groups' | 'clusters'

interface Cluster {
  id: string
  cluster_key?: string
  name: string
  slug: string
  description?: string
  cluster_type: 'local' | 'cloud'
  architecture?: string
  status: 'active' | 'inactive' | 'configuring' | 'error' | 'maintenance' | 'offline'
  health_status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | 'offline'
  is_connected?: boolean
  last_heartbeat_at?: string
  provider?: string
  region?: string
  connection_config: Record<string, any>
  current_project_count: number
  max_projects: number
  storage_used_gb: number
  storage_quota_gb?: number
  last_health_check_at?: string
  created_at: string
  updated_at: string
}

interface QuickstartTipProps {
  title: string
  description: string
  steps?: string[]
  onClose: () => void
}

function QuickstartTip({ title, description, steps, onClose }: QuickstartTipProps) {
  return (
    <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              🚀 Quickstart: {title}
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              {description}
            </p>
            {steps && steps.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  How to get started:
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200 ml-2">
                  {steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 p-1"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [currentView, setCurrentView] = useState<ViewType>('home')
  const [showQuickstart, setShowQuickstart] = useState<Record<string, boolean>>({})
  const { user, userProfile, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editedProfile, setEditedProfile] = useState({
    full_name: '',
    company: '',
    username: ''
  })

  // Data loading states
  const [enhancedProfile, setEnhancedProfile] = useState<any>(null)
  const [licenses, setLicenses] = useState<any[]>([])
  const [subscription, setSubscription] = useState<any>(null)
  const [pluginSubscriptions, setPluginSubscriptions] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [activeSessions, setActiveSessions] = useState<any[]>([])
  const [activeDesktopSessions, setActiveDesktopSessions] = useState<any[]>([])
  const [activeWebSessions, setActiveWebSessions] = useState<any[]>([])
  const [inactiveSessions, setInactiveSessions] = useState<any[]>([])
  const [sessionStats, setSessionStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)

  // Clusters state
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [clustersLoading, setClustersLoading] = useState(false)
  const [clustersError, setClustersError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Subscription cancellation state
  const [cancellingSubId, setCancellingSubId] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [subToCancel, setSubToCancel] = useState<any>(null)

  const toggleQuickstart = (view: string) => {
    setShowQuickstart(prev => ({ ...prev, [view]: !prev[view] }))
  }

  // Fetch enhanced profile data
  const fetchEnhancedProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setEnhancedProfile(data.profile)
        setEditedProfile({
          full_name: data.profile?.full_name || '',
          company: data.profile?.company || '',
          username: data.profile?.username || ''
        })
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    }
  }

  // Fetch licenses
  const fetchLicenses = async () => {
    try {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        console.error('No session for licenses:', sessionError)
        return
      }

      const response = await fetch('/api/licenses/my-licenses', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setLicenses(data.licenses || [])
      }
    } catch (error) {
      console.error('Failed to fetch licenses:', error)
    }
  }

  // Fetch subscription
  const fetchSubscription = async () => {
    try {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        console.error('No session for subscription:', sessionError)
        return
      }

      const response = await fetch('/api/subscriptions/native-app', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    }
  }

  // Fetch plugin subscriptions
  const fetchPluginSubscriptions = async () => {
    try {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        console.error('No session for plugin subscriptions:', sessionError)
        return
      }

      const response = await fetch('/api/plugin-subscriptions/my-subscriptions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPluginSubscriptions(data.subscriptions || [])
      }
    } catch (error) {
      console.error('Failed to fetch plugin subscriptions:', error)
    }
  }

  // Fetch sessions
  const fetchSessions = async () => {
    try {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        console.error('No session for fetching sessions:', sessionError)
        return
      }

      const response = await fetch('/api/auth/sessions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
        setActiveSessions(data.active_sessions || [])
        setActiveDesktopSessions(data.active_desktop_sessions || [])
        setActiveWebSessions(data.active_web_sessions || [])
        setInactiveSessions(data.inactive_sessions || [])
        setSessionStats(data.stats || null)
      } else {
        console.error('Failed to fetch sessions:', response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }

  // Fetch clusters
  const fetchClusters = async () => {
    try {
      setClustersLoading(true)
      setClustersError(null)

      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        console.error('No session for clusters:', sessionError)
        return
      }

      const response = await fetch('/api/clusters', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load clusters')
      }

      if (data.success || data.clusters) {
        const transformedClusters = (data.clusters || []).map((c: any) => ({
          id: c.id,
          cluster_key: c.cluster_key || c.slug,
          name: c.name,
          slug: c.cluster_key || c.slug,
          description: c.description,
          cluster_type: c.architecture === 'centcom' ? 'local' : c.cluster_type || 'cloud',
          architecture: c.architecture,
          status: c.status || 'active',
          health_status: c.health_status || 'unknown',
          provider: c.provider,
          region: c.region || 'Unknown',
          connection_config: {},
          current_project_count: c.current_project_count || 0,
          max_projects: c.max_projects || 100,
          storage_used_gb: c.storage_used_gb || 0,
          storage_quota_gb: c.storage_quota_gb,
          last_health_check_at: c.last_health_check_at || c.updated_at,
          created_at: c.created_at,
          updated_at: c.updated_at,
          is_connected: c.is_connected
        }))

        setClusters(transformedClusters)
      } else {
        throw new Error(data.error || 'Failed to load clusters')
      }
    } catch (err: any) {
      console.error('Error loading clusters:', err)
      setClustersError(err.message || 'Failed to load clusters')
      setClusters([])
    } finally {
      setClustersLoading(false)
    }
  }

  // Revoke a session
  const revokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session? The device will be logged out.')) {
      return
    }

    setRevokingSessionId(sessionId)
    try {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        console.error('No session for revoking:', sessionError)
        setErrorMessage('Authentication error. Please refresh the page.')
        setTimeout(() => setErrorMessage(''), 5000)
        setRevokingSessionId(null)
        return
      }

      const response = await fetch('/api/auth/sessions/revoke', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_id: sessionId })
      })

      if (response.ok) {
        setSuccessMessage('Session revoked successfully')
        // Refresh sessions list
        await fetchSessions()
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const errorData = await response.json()
        setErrorMessage(errorData.error || 'Failed to revoke session')
        setTimeout(() => setErrorMessage(''), 5000)
      }
    } catch (error) {
      console.error('Failed to revoke session:', error)
      setErrorMessage('Failed to revoke session')
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setRevokingSessionId(null)
    }
  }

  // Profile edit handlers
  const handleInputChange = (field: string, value: string) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedProfile)
      })

      const data = await response.json()

      if (response.ok) {
        await fetchEnhancedProfile()
        setIsEditingProfile(false)
        setSuccessMessage('Profile updated successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setErrorMessage(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      setErrorMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleStartEdit = () => {
    setErrorMessage('')
    setSuccessMessage('')
    setIsEditingProfile(true)
  }

  const handleCancelEdit = () => {
    setEditedProfile({
      full_name: enhancedProfile?.full_name || '',
      company: enhancedProfile?.company || '',
      username: enhancedProfile?.username || ''
    })
    setErrorMessage('')
    setSuccessMessage('')
    setIsEditingProfile(false)
  }

  // Handle subscription cancellation
  const handleCancelSubscription = async (subscriptionId: string) => {
    setCancellingSubId(subscriptionId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_id: subscriptionId })
      })

      const data = await response.json()

      if (response.ok) {
        // Update local state to reflect cancellation
        // Handle both plugin subscriptions and native app subscription
        setPluginSubscriptions(prev =>
          prev.map(sub =>
            sub.id === subscriptionId
              ? { ...sub, status: 'cancelled', cancelled_at: data.subscription.cancelled_at }
              : sub
          )
        )

        // Update native app subscription if it's the one being cancelled
        if (subscription?.id === subscriptionId) {
          setSubscription(prev =>
            prev ? { ...prev, status: 'cancelled', cancelled_at: data.subscription.cancelled_at } : null
          )
        }

        setSuccessMessage('Subscription cancelled successfully. Your license will remain active until expiration.')
        setTimeout(() => setSuccessMessage(''), 5000)
      } else {
        setErrorMessage(data.error || 'Failed to cancel subscription')
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
      setErrorMessage('An unexpected error occurred while cancelling subscription')
    } finally {
      setCancellingSubId(null)
      setShowCancelConfirm(false)
      setSubToCancel(null)
    }
  }

  const confirmCancelSubscription = (subscription: any) => {
    setSubToCancel(subscription)
    setShowCancelConfirm(true)
  }

  const closeCancelConfirm = () => {
    setShowCancelConfirm(false)
    setSubToCancel(null)
  }

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut()
      router.push('/login')
    }
  }

  // Fetch data based on current view
  useEffect(() => {
    if (currentView === 'profile') {
      fetchEnhancedProfile()
    } else if (currentView === 'payment') {
      fetchSubscription()
    } else if (currentView === 'licenses') {
      fetchSubscription()
      fetchPluginSubscriptions()
      fetchLicenses()
    } else if (currentView === 'sessions') {
      fetchSessions()
    } else if (currentView === 'clusters') {
      fetchClusters()
    }
  }, [currentView])

  // Home View - Category Grid
  if (currentView === 'home') {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
                Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your account, preferences, and integrations
              </p>
            </div>
            <button
              onClick={() => toggleQuickstart('home')}
              className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <InformationCircleIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Quickstart Tip */}
          {showQuickstart['home'] && (
            <QuickstartTip
              title="Settings Overview"
              description="Welcome to your settings hub! Here you can customize your Lyceum experience and manage your account."
              steps={[
                "Start with Profile & Identity to set up your personal information",
                "Configure Appearance to match your workflow preferences",
                "Set up Payment & Billing for subscription management",
                "Manage Licenses & Sessions for access control"
              ]}
              onClose={() => toggleQuickstart('home')}
            />
          )}

          {/* Category Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Profile Category */}
            <div
              onClick={() => setCurrentView('profile')}
              className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gray-100 dark:bg-gray-900/30 rounded-lg group-hover:bg-gray-200 dark:group-hover:bg-gray-900/50 transition-colors">
                  <UserIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  →
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                Profile & Identity
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Manage your personal information, username, and profile details
              </p>
              <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                💡 Keep your profile up-to-date for better collaboration
              </div>
            </div>

            {/* Appearance Category */}
            <div
              onClick={() => setCurrentView('appearance')}
              className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/50 transition-colors">
                  <Cog6ToothIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  →
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                Appearance & Theme
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Customize your interface theme and visual preferences
              </p>
              <div className="mt-3 text-xs text-indigo-600 dark:text-indigo-400">
                💡 Choose light or dark mode for comfortable viewing
              </div>
            </div>

            {/* Payment & Billing Category */}
            <div
              onClick={() => setCurrentView('payment')}
              className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-600 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                  <CreditCardIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  →
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                Payment & Billing
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Manage payment methods, subscriptions, and billing history
              </p>
              <div className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">
                💡 Keep your payment info current for uninterrupted service
              </div>
            </div>

            {/* Subscriptions & Licenses Category */}
            <div
              onClick={() => setCurrentView('licenses')}
              className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-green-300 dark:hover:border-green-600 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                  <ShieldCheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  →
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                Subscriptions & Licenses
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                View and manage your subscriptions, licenses, and plugin access
              </p>
              <div className="mt-3 text-xs text-green-600 dark:text-green-400">
                💡 Track your subscription status and license details
              </div>
            </div>

            {/* Session Information Category */}
            <div
              onClick={() => setCurrentView('sessions')}
              className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-yellow-300 dark:hover:border-yellow-600 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg group-hover:bg-yellow-200 dark:group-hover:bg-yellow-900/50 transition-colors">
                  <ComputerDesktopIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  →
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                Session Information
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Monitor login sessions and view account activity history
              </p>
              <div className="mt-3 text-xs text-yellow-600 dark:text-yellow-400">
                💡 Review your session history for security
              </div>
            </div>

            {/* Clusters Category */}
            <div
              onClick={() => setCurrentView('clusters')}
              className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-600 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                  <CircleStackIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  →
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                Clusters
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Manage your local and cloud clusters, connections, and storage
              </p>
              <div className="mt-3 text-xs text-purple-600 dark:text-purple-400">
                💡 Configure and monitor your cluster infrastructure
              </div>
            </div>

            {/* User Groups Category */}
            <div
              onClick={() => setCurrentView('groups')}
              className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-600 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg group-hover:bg-cyan-200 dark:group-hover:bg-cyan-900/50 transition-colors">
                  <UserGroupIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  →
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                User Groups
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Manage group memberships and collaborative workspaces
              </p>
              <div className="mt-3 text-xs text-cyan-600 dark:text-cyan-400">
                💡 Collaborate with team members in shared groups
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Profile & Identity View
  if (currentView === 'profile') {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          {/* Navigation Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentView('home')}
              className="mr-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
              Profile & Identity
            </h1>
            <button
              onClick={() => toggleQuickstart('profile')}
              className="ml-4 p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <InformationCircleIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Quickstart Tip */}
          {showQuickstart['profile'] && (
            <QuickstartTip
              title="Profile Settings"
              description="Keep your personal information up-to-date for better collaboration and communication."
              steps={[
                "Review your current profile information",
                "Click Edit to update your details",
                "Save changes to update your profile across Lyceum"
              ]}
              onClose={() => toggleQuickstart('profile')}
            />
          )}

          {/* Content Panels */}
          <div className="space-y-6">
            {/* Edit Profile Panel */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                    <UserIcon className="h-5 w-5 mr-2 text-gray-500" />
                    Personal Information
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Update your personal details and contact information
                  </p>
                </div>
                {!isEditingProfile && (
                  <button
                    onClick={handleStartEdit}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center space-x-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              <div className="p-6">
                {isEditingProfile ? (
                  <div className="space-y-4">
                    {errorMessage && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                        {errorMessage}
                      </div>
                    )}
                    {successMessage && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
                        {successMessage}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editedProfile.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={editedProfile.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="username_123"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        3-30 characters, letters, numbers, and underscores only
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        value={editedProfile.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                      >
                        <CheckIcon className="h-4 w-4" />
                        <span>Save Changes</span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {successMessage && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
                        {successMessage}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                        <p className="text-gray-800 dark:text-white mt-1">{enhancedProfile?.full_name || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Username</label>
                        <p className="text-gray-800 dark:text-white mt-1">{enhancedProfile?.username || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                        <p className="text-gray-800 dark:text-white mt-1">{userProfile?.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Company</label>
                        <p className="text-gray-800 dark:text-white mt-1">{enhancedProfile?.company || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</label>
                        <p className="text-gray-800 dark:text-white mt-1 capitalize">{userProfile?.role || 'User'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Created</label>
                        <p className="text-gray-800 dark:text-white mt-1">
                          {enhancedProfile?.created_at ? new Date(enhancedProfile.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Account Information Panel */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                  <InformationCircleIcon className="h-5 w-5 mr-2 text-blue-500" />
                  Account Information
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">User ID</label>
                    <p className="text-gray-800 dark:text-white mt-1 font-mono text-sm">{user?.id || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Status</label>
                    <p className="text-green-600 dark:text-green-400 mt-1 font-medium">Active</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Security Section */}
            {/* Password Management Panel */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                  <KeyIcon className="h-5 w-5 mr-2 text-red-500" />
                  Password
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage your account password
                </p>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-800 dark:text-white font-medium">Change Password</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Use a strong password to keep your account secure
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/reset-password')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            </div>

            {/* Two-Factor Authentication Panel */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 mr-2 text-blue-500" />
                  Two-Factor Authentication
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Add an extra layer of security to your account
                </p>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-800 dark:text-white font-medium">MFA Status</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Not configured
                    </p>
                  </div>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled
                  >
                    Enable MFA
                  </button>
                </div>
              </div>
            </div>

            {/* Session Management Panel */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                  <ComputerDesktopIcon className="h-5 w-5 mr-2 text-gray-500" />
                  Session Management
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage your active session
                </p>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-800 dark:text-white font-medium">Sign Out</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Sign out of your account on this device
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Appearance View
  if (currentView === 'appearance') {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          {/* Navigation Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentView('home')}
              className="mr-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
              Appearance & Theme
            </h1>
            <button
              onClick={() => toggleQuickstart('appearance')}
              className="ml-4 p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <InformationCircleIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Quickstart Tip */}
          {showQuickstart['appearance'] && (
            <QuickstartTip
              title="Appearance Settings"
              description="Customize your Lyceum interface to match your preferences and working environment."
              steps={[
                "Choose between Light, Dark, or System theme",
                "Theme selection is saved automatically",
                "System theme follows your operating system settings"
              ]}
              onClose={() => toggleQuickstart('appearance')}
            />
          )}

          {/* Content Panels */}
          <div className="space-y-6">
            {/* Theme Selection Panel */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                  <Cog6ToothIcon className="h-5 w-5 mr-2 text-indigo-500" />
                  Theme Preference
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Choose how Lyceum looks to you. Select a theme or sync with your system settings.
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Light Theme Option */}
                  <button
                    onClick={() => setTheme('light')}
                    className={`relative p-6 rounded-lg border-2 transition-all ${
                      theme === 'light'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <SunIcon className="h-8 w-8 text-yellow-500" />
                      <span className="font-medium text-gray-900 dark:text-white">Light</span>
                      <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                        Bright and clean interface
                      </p>
                    </div>
                    {theme === 'light' && (
                      <div className="absolute top-3 right-3">
                        <div className="h-6 w-6 bg-indigo-500 rounded-full flex items-center justify-center">
                          <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>

                  {/* Dark Theme Option */}
                  <button
                    onClick={() => setTheme('dark')}
                    className={`relative p-6 rounded-lg border-2 transition-all ${
                      theme === 'dark'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <MoonIcon className="h-8 w-8 text-indigo-500" />
                      <span className="font-medium text-gray-900 dark:text-white">Dark</span>
                      <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                        Easy on the eyes in low light
                      </p>
                    </div>
                    {theme === 'dark' && (
                      <div className="absolute top-3 right-3">
                        <div className="h-6 w-6 bg-indigo-500 rounded-full flex items-center justify-center">
                          <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>

                  {/* System Theme Option */}
                  <button
                    onClick={() => setTheme('system')}
                    className={`relative p-6 rounded-lg border-2 transition-all ${
                      theme === 'system'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <ComputerDesktopIcon className="h-8 w-8 text-gray-500" />
                      <span className="font-medium text-gray-900 dark:text-white">System</span>
                      <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                        Sync with system preferences
                      </p>
                    </div>
                    {theme === 'system' && (
                      <div className="absolute top-3 right-3">
                        <div className="h-6 w-6 bg-indigo-500 rounded-full flex items-center justify-center">
                          <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Payment & Billing View
  if (currentView === 'payment') {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          {/* Navigation Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentView('home')}
              className="mr-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
              Payment & Billing
            </h1>
            <button
              onClick={() => toggleQuickstart('payment')}
              className="ml-4 p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <InformationCircleIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Quickstart Tip */}
          {showQuickstart['payment'] && (
            <QuickstartTip
              title="Payment & Billing"
              description="Manage your payment methods and subscription to ensure uninterrupted service."
              steps={[
                "Add or update your payment method",
                "Review your current subscription status",
                "View billing history in the payment portal"
              ]}
              onClose={() => toggleQuickstart('payment')}
            />
          )}

          {/* Content Panels */}
          <div className="space-y-6">
            {/* Payment Method Panel */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                  <CreditCardIcon className="h-5 w-5 mr-2 text-emerald-500" />
                  Payment Method
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage your payment method for subscriptions
                </p>
              </div>
              <div className="p-6">
                <PaymentMethodSetup userId={user?.id || ''} />
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Subscriptions & Licenses View
  if (currentView === 'licenses') {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          {/* Navigation Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentView('home')}
              className="mr-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
              Subscriptions & Licenses
            </h1>
            <button
              onClick={() => toggleQuickstart('licenses')}
              className="ml-4 p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <InformationCircleIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Quickstart Tip */}
          {showQuickstart['licenses'] && (
            <QuickstartTip
              title="Subscriptions & Licenses"
              description="View your subscriptions and associated license keys for Lyceum services."
              steps={[
                "Check your desktop application subscription status",
                "Review any plugin subscriptions",
                "View license keys for desktop applications"
              ]}
              onClose={() => toggleQuickstart('licenses')}
            />
          )}

          {/* Content Panels */}
          <div className="space-y-6">
            {/* Main Subscription Panel */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 mr-2 text-green-500" />
                  Desktop Application Subscription
                </h2>
              </div>
              <div className="p-6">
                {subscription ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Type</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        subscription.subscription_type === 'trial'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {subscription.subscription_type === 'trial' ? 'Trial' : 'Paid'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        subscription.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {subscription.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Created</span>
                      <span className="text-gray-800 dark:text-white">
                        {new Date(subscription.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {/* Display linked license key */}
                    {licenses.length > 0 && (
                      <>
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Associated License Keys:</span>
                        </div>
                        {licenses
                          .filter((lic: any) => lic.license_type === 'main-application')
                          .map((license: any) => (
                            <div key={license.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600 dark:text-gray-400">License Key</span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  license.status === 'active'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : license.status === 'trial'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                  {license.status}
                                </span>
                              </div>
                              <div className="font-mono text-sm text-gray-800 dark:text-white font-bold">
                                {license.key_code}
                              </div>
                              {license.expires_at && (
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  Expires: {new Date(license.expires_at).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ))}
                      </>
                    )}

                    {/* Cancel Subscription Button for Desktop App */}
                    {subscription.status === 'active' && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => confirmCancelSubscription(subscription)}
                          disabled={cancellingSubId === subscription.id}
                          className="w-full px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {cancellingSubId === subscription.id ? 'Cancelling...' : 'Cancel Subscription'}
                        </button>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                          Your license will remain active until {
                            licenses.find((lic: any) => lic.license_type === 'main-application')?.expires_at
                              ? new Date(licenses.find((lic: any) => lic.license_type === 'main-application').expires_at).toLocaleDateString()
                              : 'expiration'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No active subscription</p>
                )}
              </div>
            </div>

            {/* Plugin Subscriptions Panel */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                  <Cog6ToothIcon className="h-5 w-5 mr-2 text-indigo-500" />
                  Plugin Subscriptions
                </h2>
              </div>
              <div className="p-6">
                {pluginSubscriptions.length > 0 ? (
                  <div className="space-y-4">
                    {pluginSubscriptions.map((sub: any) => {
                      // Find matching plugin licenses
                      const pluginLicenses = licenses.filter((lic: any) =>
                        lic.license_category === 'plugin' &&
                        lic.license_type === sub.plugin_type
                      )

                      return (
                        <div key={sub.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-800 dark:text-white capitalize">
                              {sub.plugin_type.replace('_', ' ')}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                sub.subscription_type === 'trial'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                              }`}>
                                {sub.subscription_type === 'trial' ? 'Trial' : 'Paid'}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                sub.status === 'active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {sub.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Created: {new Date(sub.created_at).toLocaleDateString()}
                          </div>

                          {/* Display plugin license keys */}
                          {pluginLicenses.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">License Keys:</span>
                              <div className="mt-2 space-y-2">
                                {pluginLicenses.map((license: any) => (
                                  <div key={license.id} className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-mono text-xs text-gray-800 dark:text-white font-bold">
                                        {license.key_code}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        license.status === 'active'
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                          : license.status === 'trial'
                                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                      }`}>
                                        {license.status}
                                      </span>
                                    </div>
                                    {license.expires_at && (
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        Expires: {new Date(license.expires_at).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Cancel Subscription Button */}
                          {sub.status === 'active' && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <button
                                onClick={() => confirmCancelSubscription(sub)}
                                disabled={cancellingSubId === sub.id}
                                className="w-full px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {cancellingSubId === sub.id ? 'Cancelling...' : 'Cancel Subscription'}
                              </button>
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                                Your license will remain active until {pluginLicenses[0]?.expires_at ? new Date(pluginLicenses[0].expires_at).toLocaleDateString() : 'expiration'}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No plugin subscriptions</p>
                )}
              </div>
            </div>
          </div>

          {/* Cancellation Confirmation Modal */}
          {showCancelConfirm && subToCancel && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
                <div className="flex items-start mb-4">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Cancel Subscription?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      Are you sure you want to cancel your <strong>
                        {subToCancel.subscription_category === 'native_app' || subToCancel.subscription_category === undefined
                          ? 'Desktop Application'
                          : subToCancel.plugin_type?.replace('_', ' ')}
                      </strong> subscription?
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Important:</strong>
                      </p>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
                        <li>Your subscription will be cancelled immediately</li>
                        <li>You will NOT be refunded for remaining time</li>
                        <li>Your license will remain active until the expiration date</li>
                        <li>You can continue using the plugin until your license expires</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closeCancelConfirm}
                    disabled={cancellingSubId !== null}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Keep Subscription
                  </button>
                  <button
                    onClick={() => handleCancelSubscription(subToCancel.id)}
                    disabled={cancellingSubId !== null}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {cancellingSubId ? 'Cancelling...' : 'Yes, Cancel Subscription'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    )
  }

  // Session Information View
  if (currentView === 'sessions') {
    // Helper function to get risk score color
    const getRiskScoreColor = (score: number) => {
      if (score >= 70) return 'text-red-600 dark:text-red-400'
      if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
      return 'text-green-600 dark:text-green-400'
    }

    // Helper function to get risk score background
    const getRiskScoreBg = (score: number) => {
      if (score >= 70) return 'bg-red-100 dark:bg-red-900/30'
      if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/30'
      return 'bg-green-100 dark:bg-green-900/30'
    }

    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          {/* Navigation Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <button
                onClick={() => setCurrentView('home')}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
                Session Information
              </h1>
              <button
                onClick={() => toggleQuickstart('sessions')}
                className="ml-4 p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <InformationCircleIcon className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={fetchSessions}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
            </div>
          )}
          {errorMessage && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
            </div>
          )}

          {/* Quickstart Tip */}
          {showQuickstart['sessions'] && (
            <QuickstartTip
              title="Session Information"
              description="Monitor your login sessions (web and desktop) and review account activity for security purposes."
              steps={[
                "View your current active sessions across all devices",
                "Check session history and login events",
                "Revoke any suspicious or unused sessions",
                "Monitor risk scores for security threats"
              ]}
              onClose={() => toggleQuickstart('sessions')}
            />
          )}

          {/* Session Stats Summary */}
          {sessionStats && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Desktop Sessions</p>
                <p className="text-2xl font-semibold text-gray-800 dark:text-white mt-1">
                  {sessionStats.active_desktop} / {sessionStats.max_allowed_desktop === 999999 ? '∞' : sessionStats.max_allowed_desktop}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">License limited</p>
              </div>
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Web Sessions</p>
                <p className="text-2xl font-semibold text-gray-800 dark:text-white mt-1">{sessionStats.active_web}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Unlimited</p>
              </div>
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</p>
                <p className="text-2xl font-semibold text-gray-800 dark:text-white mt-1">{sessionStats.total}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Inactive/History</p>
                <p className="text-2xl font-semibold text-gray-800 dark:text-white mt-1">{sessionStats.inactive}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Desktop Limit</p>
                <p className={`text-2xl font-semibold mt-1 ${sessionStats.within_desktop_limit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {sessionStats.within_desktop_limit ? 'OK' : 'LIMIT'}
                </p>
              </div>
            </div>
          )}

          {/* Content Panels */}
          <div className="space-y-6">
            {/* Active Desktop Sessions Panel */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                  <ComputerDesktopIcon className="h-5 w-5 mr-2 text-purple-500" />
                  Active Desktop Sessions ({activeDesktopSessions.length})
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Desktop application sessions (limited by your license)
                </p>
              </div>
              <div className="p-6">
                {activeDesktopSessions.length > 0 ? (
                  <div className="space-y-4">
                    {activeDesktopSessions.map((session: any) => (
                      <div
                        key={session.id}
                        className={`border rounded-lg p-4 ${
                          session.is_current
                            ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {/* Session Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <ComputerDesktopIcon className={`h-6 w-6 ${session.is_current ? 'text-green-600 dark:text-green-400' : 'text-purple-600 dark:text-purple-400'}`} />
                            <div>
                              <p className="font-medium text-gray-800 dark:text-white">
                                {session.device_name}
                                {session.is_current && <span className="ml-2 text-xs text-green-600 dark:text-green-400">(Current)</span>}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                💻 Desktop Application
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-xs font-medium">
                              Active
                            </span>
                            {!session.is_current && (
                              <button
                                onClick={() => revokeSession(session.session_id)}
                                disabled={revokingSessionId === session.session_id}
                                className="px-3 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-800 dark:text-red-400 rounded-full text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                {revokingSessionId === session.session_id ? 'Revoking...' : 'Revoke'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Session Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">Started</p>
                            <p className="text-gray-800 dark:text-white font-medium">
                              {new Date(session.started_at).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">Last Activity</p>
                            <p className="text-gray-800 dark:text-white font-medium">
                              {new Date(session.last_activity).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">Duration</p>
                            <p className="text-gray-800 dark:text-white font-medium">
                              {session.duration_formatted}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">Location</p>
                            <p className="text-gray-800 dark:text-white font-medium">
                              {session.location}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">Device</p>
                            <p className="text-gray-800 dark:text-white font-medium">
                              {session.platform || 'Unknown'} {session.os && `(${session.os})`}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">App Version</p>
                            <p className="text-gray-800 dark:text-white font-medium">
                              {session.app_version}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">License Type</p>
                            <p className="text-gray-800 dark:text-white font-medium uppercase">
                              {session.license_type}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">MFA Verified</p>
                            <p className="text-gray-800 dark:text-white font-medium">
                              {session.mfa_verified ? '✅ Yes' : '❌ No'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">Risk Score</p>
                            <p className={`font-medium flex items-center ${getRiskScoreColor(session.risk_score)}`}>
                              <span className={`px-2 py-0.5 rounded text-xs ${getRiskScoreBg(session.risk_score)}`}>
                                {session.risk_score}%
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Session ID (collapsible/small) */}
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-500 dark:text-gray-500">Session ID</summary>
                            <p className="mt-1 font-mono text-gray-600 dark:text-gray-400 break-all">
                              {session.session_id}
                            </p>
                          </details>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ComputerDesktopIcon className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">No active desktop sessions</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Launch the Lyceum desktop app to create a desktop session</p>
                  </div>
                )}
              </div>
            </div>

            {/* Active Web Sessions Panel */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                  <ComputerDesktopIcon className="h-5 w-5 mr-2 text-blue-500" />
                  Active Web Sessions ({activeWebSessions.length})
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Web browser sessions (unlimited, not counted towards license limit)
                </p>
              </div>
              <div className="p-6">
                {activeWebSessions.length > 0 ? (
                  <div className="space-y-4">
                    {activeWebSessions.map((session: any) => (
                      <div
                        key={session.id}
                        className={`border rounded-lg p-4 ${
                          session.is_current
                            ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {/* Session Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">🌐</div>
                            <div>
                              <p className="font-medium text-gray-800 dark:text-white">
                                {session.device_name}
                                {session.is_current && <span className="ml-2 text-xs text-green-600 dark:text-green-400">(Current)</span>}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Web Browser Session
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-xs font-medium">
                              Active
                            </span>
                            {!session.is_current && (
                              <button
                                onClick={() => revokeSession(session.session_id)}
                                disabled={revokingSessionId === session.session_id}
                                className="px-3 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-800 dark:text-red-400 rounded-full text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                {revokingSessionId === session.session_id ? 'Revoking...' : 'Revoke'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Session Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">Started</p>
                            <p className="text-gray-800 dark:text-white font-medium">
                              {new Date(session.started_at).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">Last Activity</p>
                            <p className="text-gray-800 dark:text-white font-medium">
                              {new Date(session.last_activity).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">Duration</p>
                            <p className="text-gray-800 dark:text-white font-medium">
                              {session.duration_formatted}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">Location</p>
                            <p className="text-gray-800 dark:text-white font-medium">
                              {session.location}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">Device</p>
                            <p className="text-gray-800 dark:text-white font-medium">
                              {session.platform || 'Unknown'} {session.os && `(${session.os})`}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">App Version</p>
                            <p className="text-gray-800 dark:text-white font-medium">
                              {session.app_version}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">License Type</p>
                            <p className="text-gray-800 dark:text-white font-medium uppercase">
                              {session.license_type}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">MFA Verified</p>
                            <p className="text-gray-800 dark:text-white font-medium">
                              {session.mfa_verified ? '✅ Yes' : '❌ No'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-500">Risk Score</p>
                            <p className={`font-medium flex items-center ${getRiskScoreColor(session.risk_score)}`}>
                              <span className={`px-2 py-0.5 rounded text-xs ${getRiskScoreBg(session.risk_score)}`}>
                                {session.risk_score}%
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Session ID (collapsible/small) */}
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-500 dark:text-gray-500">Session ID</summary>
                            <p className="mt-1 font-mono text-gray-600 dark:text-gray-400 break-all">
                              {session.session_id}
                            </p>
                          </details>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-6xl text-gray-400 dark:text-gray-600 mx-auto mb-3">🌐</div>
                    <p className="text-gray-600 dark:text-gray-400">No active web sessions</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">This is your current web browser session</p>
                  </div>
                )}
              </div>
            </div>

            {/* Session History Panel */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2 text-blue-500" />
                  Session History ({inactiveSessions.length})
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Recent inactive and revoked sessions (retained for 30 days)
                </p>
              </div>
              <div className="p-6">
                {inactiveSessions.length > 0 ? (
                  <div className="space-y-3">
                    {inactiveSessions.slice(0, 10).map((session: any) => (
                      <div
                        key={session.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="h-2 w-2 bg-gray-400 rounded-full mt-2"></div>
                            <div>
                              <p className="text-sm font-medium text-gray-800 dark:text-white">
                                {session.device_name}
                                {session.is_revoked && <span className="ml-2 text-xs text-red-600 dark:text-red-400">(Revoked)</span>}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {session.session_type === 'web' ? 'Web Browser' : 'Desktop App'} • {session.location}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Started: {new Date(session.started_at).toLocaleString()} • Duration: {session.duration_formatted}
                              </p>
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                            Inactive
                          </span>
                        </div>
                      </div>
                    ))}
                    {inactiveSessions.length > 10 && (
                      <p className="text-sm text-gray-500 dark:text-gray-500 text-center pt-2">
                        Showing 10 of {inactiveSessions.length} inactive sessions
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClockIcon className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">No session history found</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Session history is retained for 30 days</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Clusters View
  if (currentView === 'clusters') {
    const getStatusBadge = (status: string) => {
      const statusColors = {
        active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        offline: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        configuring: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      }

      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || statusColors.inactive}`}>
          {status}
        </span>
      )
    }

    const getHealthBadge = (health: string) => {
      const healthColors = {
        healthy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        degraded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        unhealthy: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        offline: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      }

      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${healthColors[health as keyof typeof healthColors] || healthColors.unknown}`}>
          {health}
        </span>
      )
    }

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    const formatStorage = (gb: number) => {
      if (gb < 1) {
        return `${(gb * 1024).toFixed(0)} MB`
      }
      return `${gb.toFixed(2)} GB`
    }

    const handleViewCluster = (clusterKey: string) => {
      router.push(`/clusters/${clusterKey}`)
    }

    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          {/* Navigation Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <button
                onClick={() => setCurrentView('home')}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
                Clusters
              </h1>
              <button
                onClick={() => toggleQuickstart('clusters')}
                className="ml-4 p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <InformationCircleIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchClusters}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Cluster
              </button>
            </div>
          </div>

          {/* Quickstart Tip */}
          {showQuickstart['clusters'] && (
            <QuickstartTip
              title="Cluster Management"
              description="Manage your local and cloud clusters, connections, and storage infrastructure."
              steps={[
                "View all your connected clusters and their status",
                "Check cluster health and connection status",
                "Click on a cluster to view detailed information"
              ]}
              onClose={() => toggleQuickstart('clusters')}
            />
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CircleStackIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Total Clusters
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                        {clusters.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ComputerDesktopIcon className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Local Clusters
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                        {clusters.filter(c => c.cluster_type === 'local').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CloudIcon className="h-6 w-6 text-purple-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Cloud Clusters
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                        {clusters.filter(c => c.cluster_type === 'cloud').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Active Clusters
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                        {clusters.filter(c => c.status === 'active').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Clusters Table */}
          {clustersLoading ? (
            <div className="flex items-center justify-center py-12 bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading clusters...</span>
            </div>
          ) : clustersError ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">Error loading clusters</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{clustersError}</p>
              <div className="mt-6">
                <button
                  onClick={fetchClusters}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : clusters.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <CircleStackIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No clusters</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by connecting your first cluster.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Add Cluster
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Cluster
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Region
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Health
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Storage
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {clusters.map((cluster) => (
                      <tr
                        key={cluster.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 relative">
                              {cluster.cluster_type === 'local' ? (
                                <ComputerDesktopIcon className="h-6 w-6 text-blue-500" />
                              ) : (
                                <CloudIcon className="h-6 w-6 text-purple-500" />
                              )}
                              {cluster.cluster_type === 'local' && (
                                <span
                                  className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white dark:border-gray-800 ${
                                    cluster.is_connected
                                      ? 'bg-green-500 animate-pulse'
                                      : 'bg-gray-400'
                                  }`}
                                  title={cluster.is_connected ? 'Connected' : 'Offline'}
                                />
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {cluster.name}
                                </span>
                                {cluster.cluster_type === 'local' && (
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      cluster.is_connected
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    {cluster.is_connected ? 'Connected' : 'Offline'}
                                  </span>
                                )}
                              </div>
                              {cluster.cluster_key && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {cluster.cluster_key}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 capitalize">
                            {cluster.cluster_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {cluster.region}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(cluster.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getHealthBadge(cluster.health_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatStorage(cluster.storage_used_gb)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(cluster.updated_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewCluster(cluster.slug)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center"
                            title="View cluster details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Create Cluster Wizard */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-50 overflow-y-auto">
              <div className="w-full min-h-screen py-8">
                <ClusterCreationWizard
                  onComplete={(cluster) => {
                    setShowCreateModal(false)
                    fetchClusters() // Refresh the clusters list
                    router.push(`/clusters/${cluster.slug || cluster.cluster_key}`)
                  }}
                  onCancel={() => setShowCreateModal(false)}
                />
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    )
  }

  // User Groups View (Placeholder)
  if (currentView === 'groups') {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentView('home')}
              className="mr-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
              User Groups
            </h1>
          </div>
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-gray-600 dark:text-gray-400">
              User groups feature is under development.
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return null
}
