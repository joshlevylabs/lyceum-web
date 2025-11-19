'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import PaymentMethodSetup from '@/components/billing/PaymentMethodSetup'
import {
  UserIcon,
  KeyIcon,
  ArrowRightOnRectangleIcon,
  CheckIcon,
  XMarkIcon,
  ShieldCheckIcon,
  ClockIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  CircleStackIcon,
  CreditCardIcon,
  PlusIcon,
  UserGroupIcon,
  UsersIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

interface ProfileFormData {
  full_name: string
  username: string
  company: string
}

interface License {
  id: string
  key_code?: string
  key_id?: string
  license_type: string
  status: string
  features: string[]
  max_users?: number
  max_projects?: number
  max_storage_gb?: number
  expires_at?: string
  assigned_at?: string
  created_at: string
  source: string
}

interface Subscription {
  id: string
  // Native app subscription fields
  subscription_type: 'trial' | 'paid'
  status: 'active' | 'expired' | 'cancelled'
  amount_paid_cents?: number
  currency?: string
  trial_start_date?: string
  trial_end_date?: string
  cancelled_at?: string
  created_at: string
  // Legacy payment status fields
  payment_status?: string
  monthly_amount?: number
  billing_cycle?: string
  next_billing_date?: string
  last_payment_date?: string
  payment_failures?: number
}

interface Session {
  id: string
  name?: string
  type: string
  event?: string
  description?: string
  ip_address?: string
  user_agent?: string
  created_at: string
  last_accessed?: string
  status?: string
}

interface EnhancedProfile {
  id: string
  email: string
  username: string
  full_name: string
  company: string
  role: string
  is_active: boolean
  account_status: string
  created_at: string
  updated_at: string
  last_sign_in?: string
  days_since_creation: number
  days_since_last_sign_in?: number
  email_confirmed: boolean
  security_clearance: string
  mfa_enabled: boolean
  resource_usage: {
    storage_used_mb: number
    storage_limit_mb: number
    api_calls_count: number
    api_calls_limit: number
    compute_hours_used: number
    compute_hours_limit: number
  }
  database_clusters: any[]
  statistics: {
    total_clusters: number
    active_clusters: number
    account_age_days: number
    last_activity_days_ago?: number
  }
}

export default function SettingsPage() {
  const { user, userProfile, updateProfile, signOut, loading } = useAuth()
  const { theme, customColors, setTheme, setCustomColors, resetCustomColors } = useTheme()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'licenses' | 'sessions' | 'account' | 'clusters' | 'payment' | 'groups'>('profile')
  const [profileData, setProfileData] = useState<ProfileFormData>({
    full_name: '',
    username: '',
    company: ''
  })
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  
  // Enhanced data state
  const [enhancedProfile, setEnhancedProfile] = useState<EnhancedProfile | null>(null)
  const [licenses, setLicenses] = useState<License[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [sessions, setSessions] = useState<{
    active: Session[]
    inactive: Session[]
    history: Session[]
  }>({ active: [], inactive: [], history: [] })
  const [dataLoading, setDataLoading] = useState(false)
  
  // Clusters state
  const [clusters, setClusters] = useState<any[]>([])
  const [loadingClusters, setLoadingClusters] = useState(false)
  
  // Payment state
  const [paymentInfo, setPaymentInfo] = useState<any>(null)
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [usageData, setUsageData] = useState<any>(null)
  const [loadingUsage, setLoadingUsage] = useState(false)

  // Subscription cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellingSubscription, setCancellingSubscription] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')

  // Plugin subscriptions state
  const [pluginSubscriptions, setPluginSubscriptions] = useState<any[]>([])
  const [loadingPluginSubscriptions, setLoadingPluginSubscriptions] = useState(false)
  const [showCancelPluginModal, setShowCancelPluginModal] = useState(false)
  const [cancellingPluginSubscription, setCancellingPluginSubscription] = useState(false)
  const [pluginCancellationReason, setPluginCancellationReason] = useState('')
  const [selectedPluginForCancellation, setSelectedPluginForCancellation] = useState<any>(null)

  // Groups state
  const [userGroups, setUserGroups] = useState<any[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)

  // Initialize form data
  useEffect(() => {
    if (userProfile) {
      setProfileData({
        full_name: userProfile.full_name || '',
        username: userProfile.username || '',
        company: userProfile.company || ''
      })
    } else if (user) {
      setProfileData({
        full_name: user.user_metadata?.full_name || '',
        username: user.user_metadata?.user_name || user.email?.split('@')[0] || '',
        company: user.user_metadata?.company || ''
      })
    }
  }, [user, userProfile])

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  // Fetch enhanced data when user is available
  useEffect(() => {
    if (user?.id && !loading) {
      fetchEnhancedData()
    }
  }, [user?.id, loading])

  const fetchEnhancedData = async () => {
    if (!user?.id) return
    
    setDataLoading(true)
    try {
      // Fetch enhanced profile
      const enhancedResponse = await fetch(`/api/user-profiles/enhanced?user_id=${user.id}`)
      if (enhancedResponse.ok) {
        const enhancedData = await enhancedResponse.json()
        setEnhancedProfile(enhancedData.data)
      }

      // Fetch licenses and subscription data
      const licensesResponse = await fetch(`/api/user-profiles/licenses?user_id=${user.id}`)
      if (licensesResponse.ok) {
        const licensesData = await licensesResponse.json()
        setLicenses(licensesData.data.licenses || [])
        setSubscription(licensesData.data.subscription)
      }

      // Fetch sessions data
      const sessionsResponse = await fetch(`/api/user-profiles/sessions?user_id=${user.id}`)
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json()
        setSessions({
          active: sessionsData.data.analytics_sessions.active || [],
          inactive: sessionsData.data.analytics_sessions.inactive || [],
          history: sessionsData.data.session_history || []
        })
      }

    } catch (error) {
      console.error('Error fetching enhanced data:', error)
    } finally {
      setDataLoading(false)
    }
  }

  const fetchClusters = async () => {
    if (!user?.id) return
    
    setLoadingClusters(true)
    try {
      const response = await fetch('/api/clusters')
      if (response.ok) {
        const data = await response.json()
        setClusters(data.clusters || [])
      }
    } catch (error) {
      console.error('Error fetching clusters:', error)
    } finally {
      setLoadingClusters(false)
    }
  }

  const fetchPaymentInfo = async () => {
    if (!user?.id) return

    setLoadingPayment(true)
    setLoadingUsage(true)
    try {
      // Get auth session for API calls
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        console.error('No session found for payment info fetch')
        setLoadingPayment(false)
        setLoadingUsage(false)
        return
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }

      // Fetch payment info
      const paymentResponse = await fetch(`/api/billing/payment-info?user_id=${user.id}`, { headers })
      if (paymentResponse.ok) {
        const data = await paymentResponse.json()
        console.log('Payment info loaded:', data)
        setPaymentInfo(data.data)
      } else {
        console.error('Payment info fetch failed:', paymentResponse.status, await paymentResponse.text())
      }

      // Fetch usage and estimated costs
      const usageResponse = await fetch(`/api/billing/usage?user_id=${user.id}&include_estimate=true`, { headers })
      if (usageResponse.ok) {
        const usageDataResult = await usageResponse.json()
        console.log('Usage data loaded:', usageDataResult)
        setUsageData(usageDataResult.data)
      } else {
        console.error('Usage fetch failed:', usageResponse.status, await usageResponse.text())
      }
    } catch (error) {
      console.error('Error fetching payment info:', error)
    } finally {
      setLoadingPayment(false)
      setLoadingUsage(false)
    }
  }

  const fetchPluginSubscriptions = async () => {
    if (!user?.id) return

    setLoadingPluginSubscriptions(true)
    try {
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        console.error('No session found for plugin subscriptions fetch')
        setLoadingPluginSubscriptions(false)
        return
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }

      // Fetch user's plugin subscriptions from user-specific endpoint
      const response = await fetch('/api/subscriptions/plugin/user', { headers })
      if (response.ok) {
        const data = await response.json()
        console.log('Plugin subscriptions loaded:', data.subscriptions)
        setPluginSubscriptions(data.subscriptions || [])
      } else {
        console.error('Plugin subscriptions fetch failed:', response.status)
      }
    } catch (error) {
      console.error('Error fetching plugin subscriptions:', error)
    } finally {
      setLoadingPluginSubscriptions(false)
    }
  }

  const handleCancelPluginSubscription = async () => {
    if (!selectedPluginForCancellation) return

    setCancellingPluginSubscription(true)
    try {
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        alert('No session found. Please log in again.')
        return
      }

      const response = await fetch('/api/subscriptions/plugin/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plugin_type: selectedPluginForCancellation.plugin_type,
          cancellation_reason: pluginCancellationReason || null
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Subscription cancelled successfully. ${data.remainingMessage || ''}`)
        // Refresh plugin subscriptions
        await fetchPluginSubscriptions()
        setShowCancelPluginModal(false)
        setSelectedPluginForCancellation(null)
        setPluginCancellationReason('')
      } else {
        alert(`Failed to cancel subscription: ${data.error}`)
      }
    } catch (error) {
      console.error('Error cancelling plugin subscription:', error)
      alert('An error occurred while cancelling the subscription.')
    } finally {
      setCancellingPluginSubscription(false)
    }
  }

  const fetchUserGroups = async () => {
    if (!user?.id) return
    
    setLoadingGroups(true)
    try {
      // Get auth token from Supabase session
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.warn('No access token found')
        setLoadingGroups(false)
        return
      }

      const response = await fetch('/api/groups', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUserGroups(data.groups || [])
      } else {
        console.error('Error fetching groups:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setLoadingGroups(false)
    }
  }

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setSaveStatus(null)
    
    try {
      const { error } = await updateProfile(profileData)
      
      if (error) {
        console.error('Profile update error:', error)
        setSaveStatus('error')
      } else {
        setSaveStatus('success')
        setIsEditing(false)
        // Clear success message after 3 seconds
        setTimeout(() => setSaveStatus(null), 3000)
      }
    } catch (error) {
      console.error('Profile update exception:', error)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    // Reset form data to original values
    if (userProfile) {
      setProfileData({
        full_name: userProfile.full_name || '',
        username: userProfile.username || '',
        company: userProfile.company || ''
      })
    }
    setIsEditing(false)
    setSaveStatus(null)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut()
      // signOut already handles the redirect to signin
    } catch (error) {
      console.error('Logout error:', error)
      setLoggingOut(false)
    }
  }

  const handlePasswordChange = () => {
    router.push('/auth/set-password')
  }

  const handleCancelSubscription = async () => {
    if (!subscription) return

    // Calculate remaining days
    let remainingDays = 0
    let accessMessage = ''

    if (subscription.subscription_type === 'trial' && subscription.trial_end_date) {
      const now = new Date()
      const trialEnd = new Date(subscription.trial_end_date)
      remainingDays = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

      if (remainingDays > 0) {
        accessMessage = `You will continue to have access to your trial license for the remaining ${remainingDays} day${remainingDays !== 1 ? 's' : ''} of your trial period.`
      }
    } else if (subscription.subscription_type === 'paid') {
      // For paid subscriptions, if they have a next billing date, calculate remaining days
      // For lifetime licenses, they keep access indefinitely
      accessMessage = 'You will continue to have access to your license as it is a lifetime purchase.'
    }

    setCancellingSubscription(true)
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/subscriptions/native-app/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription_id: subscription.id,
          reason: cancellationReason || 'User requested cancellation'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel subscription')
      }

      // Update local state
      setSubscription({
        ...subscription,
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })

      setShowCancelModal(false)
      setCancellationReason('')

      // Show success message with remaining access info
      const successMessage = accessMessage
        ? `Subscription cancelled successfully.\n\n${accessMessage}`
        : 'Subscription cancelled successfully'
      alert(successMessage)

      // Refresh data
      if (user) {
        const licensesResponse = await fetch(`/api/user-profiles/licenses?user_id=${user.id}`)
        if (licensesResponse.ok) {
          const licensesData = await licensesResponse.json()
          setLicenses(licensesData.data.licenses || [])
          setSubscription(licensesData.data.subscription)
        }
      }

    } catch (error) {
      console.error('Error cancelling subscription:', error)
      alert(error instanceof Error ? error.message : 'Failed to cancel subscription')
    } finally {
      setCancellingSubscription(false)
    }
  }

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
          <p>Please sign in to access settings.</p>
        </div>
      </DashboardLayout>
    )
  }

  const profile = userProfile || {
    email: user.email || '',
    full_name: user.user_metadata?.full_name || '',
    username: user.user_metadata?.user_name || '',
    role: user.user_metadata?.role || 'user',
    company: user.user_metadata?.company || ''
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <UserIcon className="h-4 w-4 inline mr-1" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'appearance'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Cog6ToothIcon className="h-4 w-4 inline mr-1" />
              Appearance
            </button>
            <button
              onClick={() => {
                setActiveTab('clusters')
                if (clusters.length === 0) fetchClusters()
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'clusters'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <CircleStackIcon className="h-4 w-4 inline mr-1" />
              Clusters
            </button>
            <button
              onClick={() => {
                setActiveTab('payment')
                if (!paymentInfo) fetchPaymentInfo()
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'payment'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <CreditCardIcon className="h-4 w-4 inline mr-1" />
              Payment
            </button>
            <button
              onClick={() => {
                setActiveTab('licenses')
                if (pluginSubscriptions.length === 0 && !loadingPluginSubscriptions) fetchPluginSubscriptions()
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'licenses'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <ShieldCheckIcon className="h-4 w-4 inline mr-1" />
              Licenses
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'sessions'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <ComputerDesktopIcon className="h-4 w-4 inline mr-1" />
              Sessions
            </button>
            <button
              onClick={() => {
                setActiveTab('groups')
                if (userGroups.length === 0) fetchUserGroups()
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'groups'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <UserGroupIcon className="h-4 w-4 inline mr-1" />
              Groups
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'account'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <KeyIcon className="h-4 w-4 inline mr-1" />
              Account
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Profile Information</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Update your personal information and profile details.
                  </p>
                </div>
                
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    Edit Profile
                  </button>
                )}
              </div>

              {/* Save Status */}
              {saveStatus && (
                <div className={`mb-4 p-3 rounded-md ${
                  saveStatus === 'success' 
                    ? 'bg-green-50 dark:bg-green-900/50 text-green-800 dark:text-green-200' 
                    : 'bg-red-50 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                }`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {saveStatus === 'success' ? (
                        <CheckIcon className="h-5 w-5" />
                      ) : (
                        <XMarkIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm">
                        {saveStatus === 'success' 
                          ? 'Profile updated successfully!' 
                          : 'Failed to update profile. Please try again.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <div className="mt-1">
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Email cannot be changed
                  </p>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={profileData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      disabled={!isEditing}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Username
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      disabled={!isEditing}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
                    />
                  </div>
                </div>

                {/* Company */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Company
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={profileData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      disabled={!isEditing}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
                    />
                  </div>
                </div>

                {/* Role (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role
                  </label>
                  <div className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      profile.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' :
                      profile.role === 'superadmin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                    }`}>
                      {profile.role}
                    </span>
                  </div>
                </div>

                {/* User ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    User ID
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={user?.id || ''}
                      disabled
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Security Clearance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Security Clearance
                  </label>
                  <div className="mt-1">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                      {enhancedProfile?.security_clearance || 'internal'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Enhanced Profile Information */}
              {enhancedProfile && (
                <div className="mt-8">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Account Information</h4>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {/* Account Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Account Status
                      </label>
                      <div className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          enhancedProfile.account_status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                        }`}>
                          {enhancedProfile.account_status}
                        </span>
                      </div>
                    </div>

                    {/* Email Confirmation */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email Confirmed
                      </label>
                      <div className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          enhancedProfile.email_confirmed
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' 
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                        }`}>
                          {enhancedProfile.email_confirmed ? 'Confirmed' : 'Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Account Age */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Account Age
                      </label>
                      <div className="mt-1 text-sm text-gray-900 dark:text-white">
                        {enhancedProfile.days_since_creation} days
                      </div>
                    </div>

                    {/* Last Sign In */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Last Sign In
                      </label>
                      <div className="mt-1 text-sm text-gray-900 dark:text-white">
                        {enhancedProfile.last_sign_in 
                          ? `${enhancedProfile.days_since_last_sign_in || 0} days ago`
                          : 'Never'}
                      </div>
                    </div>

                    {/* Database Clusters */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Database Clusters
                      </label>
                      <div className="mt-1 text-sm text-gray-900 dark:text-white">
                        {enhancedProfile.statistics.total_clusters} total ({enhancedProfile.statistics.active_clusters} active)
                      </div>
                    </div>

                    {/* MFA Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Multi-Factor Authentication
                      </label>
                      <div className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          enhancedProfile.mfa_enabled
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' 
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                        }`}>
                          {enhancedProfile.mfa_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resource Usage */}
                  <div className="mt-6">
                    <h5 className="text-md font-medium text-gray-900 dark:text-white mb-3">Resource Usage</h5>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Storage</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {Math.round(enhancedProfile.resource_usage.storage_used_mb)} MB
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          of {Math.round(enhancedProfile.resource_usage.storage_limit_mb)} MB
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">API Calls</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {enhancedProfile.resource_usage.api_calls_count.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          of {enhancedProfile.resource_usage.api_calls_limit.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Actions */}
              {isEditing && (
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="space-y-6">
            {/* Theme Selection */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Theme Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Choose Theme
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Light Theme */}
                      <button
                        onClick={() => setTheme('light')}
                        className={`relative rounded-lg border-2 p-4 hover:border-blue-500 transition-all ${
                          theme === 'light'
                            ? 'border-blue-600 ring-2 ring-blue-600'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="aspect-video rounded bg-gradient-to-br from-gray-50 to-gray-100 mb-3 flex items-center justify-center">
                          <div className="text-4xl">☀️</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-900 dark:text-white">Light</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Clean and bright
                          </div>
                        </div>
                        {theme === 'light' && (
                          <div className="absolute top-2 right-2">
                            <CheckIcon className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                      </button>

                      {/* Dark Theme */}
                      <button
                        onClick={() => setTheme('dark')}
                        className={`relative rounded-lg border-2 p-4 hover:border-blue-500 transition-all ${
                          theme === 'dark'
                            ? 'border-blue-600 ring-2 ring-blue-600'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="aspect-video rounded bg-gradient-to-br from-gray-800 to-gray-900 mb-3 flex items-center justify-center">
                          <div className="text-4xl">🌙</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-900 dark:text-white">Dark</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Easy on the eyes
                          </div>
                        </div>
                        {theme === 'dark' && (
                          <div className="absolute top-2 right-2">
                            <CheckIcon className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                      </button>

                      {/* Custom Theme */}
                      <button
                        onClick={() => setTheme('custom')}
                        className={`relative rounded-lg border-2 p-4 hover:border-blue-500 transition-all ${
                          theme === 'custom'
                            ? 'border-blue-600 ring-2 ring-blue-600'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="aspect-video rounded bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 mb-3 flex items-center justify-center">
                          <div className="text-4xl">🎨</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-900 dark:text-white">Custom</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Your own colors
                          </div>
                        </div>
                        {theme === 'custom' && (
                          <div className="absolute top-2 right-2">
                            <CheckIcon className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Theme Colors */}
            {theme === 'custom' && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Custom Colors</h3>
                    <button
                      onClick={resetCustomColors}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Reset to Defaults
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Primary Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={customColors.primary}
                          onChange={(e) => setCustomColors({ primary: e.target.value })}
                          className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          defaultValue={customColors.primary}
                          onBlur={(e) => setCustomColors({ primary: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && setCustomColors({ primary: e.currentTarget.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Secondary Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={customColors.secondary}
                          onChange={(e) => setCustomColors({ secondary: e.target.value })}
                          className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          defaultValue={customColors.secondary}
                          onBlur={(e) => setCustomColors({ secondary: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && setCustomColors({ secondary: e.currentTarget.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Background Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={customColors.background}
                          onChange={(e) => setCustomColors({ background: e.target.value })}
                          className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          defaultValue={customColors.background}
                          onBlur={(e) => setCustomColors({ background: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && setCustomColors({ background: e.currentTarget.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Surface Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={customColors.surface}
                          onChange={(e) => setCustomColors({ surface: e.target.value })}
                          className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          defaultValue={customColors.surface}
                          onBlur={(e) => setCustomColors({ surface: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && setCustomColors({ surface: e.currentTarget.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Text Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={customColors.text}
                          onChange={(e) => setCustomColors({ text: e.target.value })}
                          className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          defaultValue={customColors.text}
                          onBlur={(e) => setCustomColors({ text: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && setCustomColors({ text: e.currentTarget.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Secondary Text Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={customColors.textSecondary}
                          onChange={(e) => setCustomColors({ textSecondary: e.target.value })}
                          className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          defaultValue={customColors.textSecondary}
                          onBlur={(e) => setCustomColors({ textSecondary: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && setCustomColors({ textSecondary: e.currentTarget.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Border Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={customColors.border}
                          onChange={(e) => setCustomColors({ border: e.target.value })}
                          className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          defaultValue={customColors.border}
                          onBlur={(e) => setCustomColors({ border: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && setCustomColors({ border: e.currentTarget.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Tip:</strong> Use the color pickers for instant preview. Text inputs update on blur or when you press Enter. Colors apply immediately to the entire application.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'licenses' && (
          <div className="space-y-6">
            {/* Licenses Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Your Licenses</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      View all your assigned licenses and their details.
                    </p>
                  </div>
                  {dataLoading && (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  )}
                </div>

                {licenses.length > 0 ? (
                  <div className="space-y-4">
                    {licenses.map((license, index) => (
                      <div key={license.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
                            <div>
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white capitalize">
                                {license.license_type} License
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {license.key_code || license.key_id || `License ${index + 1}`}
                              </p>
                            </div>
                          </div>
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full capitalize ${
                            license.status === 'active' && subscription?.subscription_type === 'trial'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                              : license.status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                              : license.status === 'expired'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                              : license.status === 'revoked'
                              ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                          }`}>
                            {license.status === 'revoked'
                              ? 'Inactive'
                              : (license.status === 'active' && subscription?.subscription_type === 'trial')
                              ? 'Trial'
                              : license.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Max Users:</span>
                            <span className="ml-1 text-gray-900 dark:text-white">{license.max_users || 'Unlimited'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Max Projects:</span>
                            <span className="ml-1 text-gray-900 dark:text-white">{license.max_projects || 'Unlimited'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Storage:</span>
                            <span className="ml-1 text-gray-900 dark:text-white">{license.max_storage_gb || 'Unlimited'} GB</span>
                          </div>
                        </div>

                        {license.features && license.features.length > 0 && (
                          <div className="mt-3">
                            <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">Features:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {license.features.map((feature, idx) => (
                                <span key={idx} className="inline-flex px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            Assigned: {license.assigned_at ? new Date(license.assigned_at).toLocaleDateString() : 'Unknown'}
                          </span>
                          {license.expires_at && (
                            <span>
                              Expires: {new Date(license.expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No licenses found</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Contact your administrator to get licenses assigned.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Subscription Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Subscription Information</h3>
                
                {subscription ? (
                  <div className="space-y-4">
                    {/* Trial Warning Banner (if applicable) */}
                    {subscription.subscription_type === 'trial' && subscription.trial_end_date && (
                      (() => {
                        const now = new Date()
                        const trialEnd = new Date(subscription.trial_end_date)
                        const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                        const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0

                        return (
                          <div className={`rounded-lg p-4 ${
                            isExpiringSoon
                              ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                              : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                          }`}>
                            <div className="flex items-start">
                              <ClockIcon className={`h-5 w-5 mt-0.5 ${
                                isExpiringSoon ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'
                              }`} />
                              <div className="ml-3">
                                <h4 className={`text-sm font-medium ${
                                  isExpiringSoon ? 'text-yellow-800 dark:text-yellow-300' : 'text-blue-800 dark:text-blue-300'
                                }`}>
                                  {isExpiringSoon ? 'Trial Expiring Soon' : 'Free Trial Active'}
                                </h4>
                                <p className={`text-sm mt-1 ${
                                  isExpiringSoon ? 'text-yellow-700 dark:text-yellow-400' : 'text-blue-700 dark:text-blue-400'
                                }`}>
                                  {daysRemaining > 0
                                    ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining in your trial`
                                    : 'Your trial has expired'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })()
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Subscription Type
                        </label>
                        <div className="mt-1">
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                            subscription.subscription_type === 'trial'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200'
                          } capitalize`}>
                            {subscription.subscription_type === 'trial' ? '30-Day Free Trial' : 'Lifetime License'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Status
                        </label>
                        <div className="mt-1">
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                            subscription.status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                              : subscription.status === 'expired'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
                          } capitalize`}>
                            {subscription.status}
                          </span>
                        </div>
                      </div>

                      {subscription.amount_paid_cents !== undefined && subscription.amount_paid_cents > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Amount Paid
                          </label>
                          <div className="mt-1 text-sm text-gray-900 dark:text-white">
                            ${(subscription.amount_paid_cents / 100).toFixed(2)} {subscription.currency?.toUpperCase() || 'USD'}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Started
                        </label>
                        <div className="mt-1 text-sm text-gray-900 dark:text-white">
                          {new Date(subscription.trial_start_date || subscription.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {subscription.subscription_type === 'trial' && subscription.trial_end_date && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Trial Expires
                          </label>
                          <div className="mt-1 text-sm text-gray-900 dark:text-white">
                            {new Date(subscription.trial_end_date).toLocaleDateString()}
                          </div>
                        </div>
                      )}

                      {subscription.subscription_type === 'paid' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Billing Type
                          </label>
                          <div className="mt-1 text-sm text-gray-900 dark:text-white">
                            One-time payment (Lifetime)
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Legacy subscription fields (if available) */}
                    {subscription.billing_cycle && (
                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Additional Billing Info</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Billing Cycle
                            </label>
                            <div className="mt-1 text-sm text-gray-900 dark:text-white capitalize">
                              {subscription.billing_cycle}
                            </div>
                          </div>

                          {subscription.monthly_amount && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Monthly Amount
                              </label>
                              <div className="mt-1 text-sm text-gray-900 dark:text-white">
                                ${subscription.monthly_amount} {subscription.currency}
                              </div>
                            </div>
                          )}

                          {subscription.next_billing_date && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Next Billing Date
                              </label>
                              <div className="mt-1 text-sm text-gray-900 dark:text-white">
                                {new Date(subscription.next_billing_date).toLocaleDateString()}
                              </div>
                            </div>
                          )}

                          {subscription.last_payment_date && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Last Payment
                              </label>
                              <div className="mt-1 text-sm text-gray-900 dark:text-white">
                                {new Date(subscription.last_payment_date).toLocaleDateString()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cancel Subscription Button */}
                    {subscription.status === 'active' && (
                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              Cancel Subscription
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Cancel your subscription and revoke access to the desktop application.
                            </p>
                          </div>
                          <button
                            onClick={() => setShowCancelModal(true)}
                            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30 transition-colors"
                          >
                            Cancel Subscription
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No subscription information available</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Subscribe to the desktop app to see subscription details here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Plugin Subscriptions Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Plugin Subscriptions</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Manage your plugin subscriptions (Klippel QC and APx500).
                    </p>
                  </div>
                  {loadingPluginSubscriptions && (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  )}
                </div>

                {pluginSubscriptions.length > 0 ? (
                  <div className="space-y-4">
                    {pluginSubscriptions.map((pluginSub) => {
                      const pluginName = pluginSub.plugin_type === 'klippel_qc' ? 'Klippel QC' : 'APx500'
                      const now = new Date()
                      const trialEnd = pluginSub.trial_end_date ? new Date(pluginSub.trial_end_date) : null
                      const daysRemaining = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0

                      return (
                        <div key={pluginSub.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                                {pluginName} Plugin
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {pluginSub.subscription_type === 'trial' ? '30-Day Free Trial' : 'Lifetime License'}
                              </p>
                            </div>
                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full capitalize ${
                              pluginSub.status === 'active' && pluginSub.subscription_type === 'trial'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                                : pluginSub.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                : pluginSub.status === 'cancelled'
                                ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                            }`}>
                              {pluginSub.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {pluginSub.amount_paid_cents !== undefined && pluginSub.amount_paid_cents > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Amount Paid:</span>
                                <span className="ml-1 text-gray-900 dark:text-white">
                                  ${(pluginSub.amount_paid_cents / 100).toFixed(2)} {pluginSub.currency?.toUpperCase() || 'USD'}
                                </span>
                              </div>
                            )}

                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Started:</span>
                              <span className="ml-1 text-gray-900 dark:text-white">
                                {new Date(pluginSub.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            {pluginSub.trial_end_date && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                  {pluginSub.status === 'active' && pluginSub.subscription_type === 'trial' ? 'Trial Expires:' : 'Trial Ended:'}
                                </span>
                                <span className="ml-1 text-gray-900 dark:text-white">
                                  {new Date(pluginSub.trial_end_date).toLocaleDateString()}
                                  {pluginSub.status === 'active' && pluginSub.subscription_type === 'trial' && daysRemaining > 0 && (
                                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                                      ({daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining)
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}

                            {pluginSub.cancelled_at && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Cancelled:</span>
                                <span className="ml-1 text-gray-900 dark:text-white">
                                  {new Date(pluginSub.cancelled_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Cancel Button */}
                          {pluginSub.status === 'active' && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {pluginSub.subscription_type === 'trial'
                                      ? 'Cancel your trial subscription. You will continue to have access until the trial expires.'
                                      : 'Cancel your subscription. You will retain lifetime access to this plugin.'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedPluginForCancellation(pluginSub)
                                    setShowCancelPluginModal(true)
                                  }}
                                  className="ml-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30 transition-colors whitespace-nowrap"
                                >
                                  Cancel Plugin
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No plugin subscriptions</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Subscribe to Klippel QC or APx500 plugins to see them here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-6">
            {/* Active Sessions */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Active Sessions</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Your currently active analytics sessions.
                    </p>
                  </div>
                  {dataLoading && (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  )}
                </div>

                {sessions.active.length > 0 ? (
                  <div className="space-y-4">
                    {sessions.active.map((session) => (
                      <div key={session.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <ComputerDesktopIcon className="h-5 w-5 text-green-600" />
                            <div>
                              <h4 className="text-md font-medium text-gray-900 dark:text-white">
                                {session.name || 'Analytics Session'}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {session.type || 'Unknown Type'}
                              </p>
                            </div>
                          </div>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                            Active
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <span>Started: {new Date(session.created_at).toLocaleString()}</span>
                          {session.last_accessed && (
                            <span className="ml-4">Last accessed: {new Date(session.last_accessed).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ComputerDesktopIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No active sessions</p>
                  </div>
                )}
              </div>
            </div>

            {/* Session History */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Session History</h3>
                
                {sessions.history.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {sessions.history.slice(0, 20).map((session, index) => (
                      <div key={`${session.id}-${index}`} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <div className={`h-2 w-2 rounded-full ${
                            session.event === 'login' || session.event === 'authentication'
                              ? 'bg-green-400'
                              : session.event === 'logout'
                              ? 'bg-red-400'
                              : 'bg-blue-400'
                          }`}></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {session.event || session.type}
                            </div>
                            {session.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {session.description}
                              </div>
                            )}
                            {session.ip_address && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                IP: {session.ip_address}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(session.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No session history available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clusters' && (
          <div className="space-y-6">
            {/* Clusters Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Your Clusters</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Manage all your database clusters including online, optimized, and local Native Lyceum clusters.
                    </p>
                  </div>
                  {loadingClusters ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  ) : (
                    <button
                      onClick={() => {
                        if (!paymentInfo?.has_payment_method && !paymentInfo?.stripe_customer_id) {
                          alert('Please configure payment information first in the Payment tab.')
                          setActiveTab('payment')
                        } else {
                          router.push('/admin/clusters?create=true')
                        }
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create Cluster
                    </button>
                  )}
                </div>

                {clusters.length > 0 ? (
                  <div className="space-y-4">
                    {clusters.map((cluster) => (
                      <div key={cluster.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <CircleStackIcon className="h-5 w-5 text-blue-600" />
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                                {cluster.name}
                              </h4>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                cluster.architecture === 'traditional' 
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200'
                                  : cluster.architecture === 'optimized'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                              }`}>
                                {cluster.architecture}
                              </span>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                cluster.status === 'active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                  : cluster.status === 'creating'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                              }`}>
                                {cluster.status}
                              </span>
                            </div>
                            
                            {cluster.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                {cluster.description}
                              </p>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>
                                <span className="ml-1 text-gray-900 dark:text-white capitalize">{cluster.cluster_type}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Region:</span>
                                <span className="ml-1 text-gray-900 dark:text-white">{cluster.region}</span>
                              </div>
                              {cluster.architecture === 'optimized' && cluster.tier && (
                                <div>
                                  <span className="font-medium text-gray-700 dark:text-gray-300">Tier:</span>
                                  <span className="ml-1 text-gray-900 dark:text-white capitalize">{cluster.tier}</span>
                                </div>
                              )}
                              {cluster.architecture === 'traditional' && cluster.node_count && (
                                <div>
                                  <span className="font-medium text-gray-700 dark:text-gray-300">Nodes:</span>
                                  <span className="ml-1 text-gray-900 dark:text-white">{cluster.node_count}</span>
                                </div>
                              )}
                              {cluster.architecture === 'centcom' && cluster.last_heartbeat_at && (
                                <div>
                                  <span className="font-medium text-gray-700 dark:text-gray-300">Last Seen:</span>
                                  <span className="ml-1 text-gray-900 dark:text-white">
                                    {new Date(cluster.last_heartbeat_at).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              {cluster.estimated_monthly_cost > 0 && (
                                <div>
                                  <span className="font-medium text-gray-700 dark:text-gray-300">Est. Cost:</span>
                                  <span className="ml-1 text-gray-900 dark:text-white">
                                    ${cluster.estimated_monthly_cost.toFixed(2)}/mo
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => router.push(`/admin/clusters/${cluster.cluster_key}`)}
                            className="ml-4 inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                          >
                            Manage
                          </button>
                        </div>

                        {cluster.architecture === 'optimized' && cluster.monthly_curves_limit && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">
                                Monthly Curves Limit: <span className="font-medium text-gray-900 dark:text-white">
                                  {cluster.monthly_curves_limit.toLocaleString()}
                                </span>
                              </span>
                              {cluster.storage_limit && (
                                <span className="text-gray-600 dark:text-gray-400">
                                  Storage: <span className="font-medium text-gray-900 dark:text-white">
                                    {cluster.storage_limit}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CircleStackIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No clusters found</p>
                    <button
                      onClick={() => {
                        if (!paymentInfo?.has_payment_method && !paymentInfo?.stripe_customer_id) {
                          alert('Please configure payment information first in the Payment tab.')
                          setActiveTab('payment')
                        } else {
                          router.push('/admin/clusters?create=true')
                        }
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create Your First Cluster
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payment' && user && (
          <div className="space-y-6">
            {/* Use the full PaymentMethodSetup component for complete payment management */}
            <PaymentMethodSetup 
              userId={user.id}
              onPaymentMethodAdded={() => {
                // Refresh payment info when method is added
                fetchPaymentInfo()
              }}
            />
          </div>
        )}

        {activeTab === 'payment_old' && (
          <div className="space-y-6 hidden">
            {/* Monthly Cost Breakdown */}
            {usageData?.estimated_monthly_cost && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Monthly Cost Breakdown</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        What you're responsible to pay each month
                      </p>
                    </div>
                    {loadingUsage && (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    )}
                  </div>

                  {/* Total Cost Summary */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Estimated Monthly Total</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {usageData.estimated_monthly_cost.summary || 'Based on current usage'}
                        </p>
                      </div>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        ${usageData.estimated_monthly_cost.total_dollars?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  </div>

                  {/* Line Items */}
                  {usageData.estimated_monthly_cost.line_items && usageData.estimated_monthly_cost.line_items.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Cost Details</h4>
                      {usageData.estimated_monthly_cost.line_items.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {item.description}
                            </div>
                            {item.quantity > 0 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Quantity: {item.quantity} × ${item.unit_price_dollars?.toFixed(2) || (item.unitPrice / 100).toFixed(2)}
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white ml-4">
                            ${item.total_price_dollars?.toFixed(2) || (item.totalPrice / 100).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Information Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Payment Information</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Manage your payment methods and billing information.
                    </p>
                  </div>
                  {loadingPayment && (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  )}
                </div>

                {paymentInfo ? (
                  <div className="space-y-6">
                    {/* Stripe Customer Info */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Billing Account</h4>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Stripe Customer ID
                            </label>
                            <div className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                              {paymentInfo.stripe_customer_id || 'Not configured'}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Payment Status
                            </label>
                            <div className="mt-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                paymentInfo.has_payment_method
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                              }`}>
                                {paymentInfo.has_payment_method ? 'Configured' : 'Not Configured'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Methods */}
                    {paymentInfo.payment_methods && paymentInfo.payment_methods.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Payment Methods</h4>
                        <div className="space-y-3">
                          {paymentInfo.payment_methods.map((method: any) => (
                            <div key={method.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <CreditCardIcon className="h-5 w-5 text-gray-600" />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                      {method.card?.brand} •••• {method.card?.last4}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      Expires {method.card?.exp_month}/{method.card?.exp_year}
                                    </div>
                                  </div>
                                </div>
                                {method.is_default && (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                    Default
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add Payment Method Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => router.push('/billing/payment')}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <CreditCardIcon className="h-4 w-4 mr-2" />
                        {paymentInfo.has_payment_method ? 'Manage Payment Methods' : 'Add Payment Method'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      No payment information configured
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Add a payment method to create paid clusters and manage subscriptions.
                    </p>
                    <button
                      onClick={() => router.push('/billing/payment')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <CreditCardIcon className="h-4 w-4 mr-2" />
                      Setup Payment Method
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Invoices Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Invoices</h3>
                  <button
                    onClick={() => router.push('/billing/payment')}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View All
                  </button>
                </div>
                {paymentInfo?.recent_invoices && paymentInfo.recent_invoices.length > 0 ? (
                  <div className="space-y-3">
                    {paymentInfo.recent_invoices.slice(0, 5).map((invoice: any) => (
                      <div key={invoice.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            Invoice #{invoice.invoice_number}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(invoice.created_at).toLocaleDateString()}
                            {invoice.due_date && (
                              <span className="ml-2">
                                Due: {new Date(invoice.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            ${((invoice.total_cents || invoice.total_amount_cents || 0) / 100).toFixed(2)}
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                              : invoice.status === 'sent'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                              : invoice.status === 'overdue'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No invoices yet</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Invoices will appear here once you start using paid services.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="space-y-6">
            {/* Groups Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Your Groups</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Manage your team groups and collaborate on resources.
                    </p>
                  </div>
                  {loadingGroups ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  ) : (
                    <button
                      onClick={() => router.push('/groups')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Manage Groups
                    </button>
                  )}
                </div>

                {userGroups.length > 0 ? (
                  <div className="space-y-4">
                    {userGroups.map((group) => (
                      <div
                        key={group.id}
                        onClick={() => router.push(`/groups/${group.key || group.id}`)}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <UserGroupIcon className="h-6 w-6 text-blue-600" />
                            <div>
                              <h4 className="text-md font-medium text-gray-900 dark:text-white">
                                {group.name}
                              </h4>
                              {group.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {group.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              group.user_role === 'owner'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200'
                                : group.user_role === 'admin'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                : group.user_role === 'editor'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
                            }`}>
                              {group.user_role}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No groups yet</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Create or join a group to collaborate with your team on shared resources.
                    </p>
                    <button
                      onClick={() => router.push('/groups')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Explore Groups
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Groups</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{userGroups.length}</p>
                  </div>
                  <UserGroupIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Owned Groups</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {userGroups.filter(g => g.is_owner).length}
                    </p>
                  </div>
                  <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Member Groups</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {userGroups.filter(g => !g.is_owner).length}
                    </p>
                  </div>
                  <UsersIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* Password Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Password</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Update your password to keep your account secure.
                </p>
                <div className="mt-4">
                  <button
                    onClick={handlePasswordChange}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <KeyIcon className="h-4 w-4 mr-2" />
                    Change Password
                  </button>
                </div>
              </div>
            </div>

            {/* Sign Out Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sign Out</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Sign out of your account on this device.
                </p>
                <div className="mt-4">
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    {loggingOut ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Signing Out...
                      </>
                    ) : (
                      <>
                        <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                        Sign Out
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Cancel Subscription
              </h3>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4">
                <XMarkIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  Are you sure you want to cancel your subscription? This will:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-4">
                  <li>Revoke access to the desktop application</li>
                  <li>Deactivate your license immediately</li>
                  {subscription?.subscription_type === 'trial' && (
                    <li>End your free trial period</li>
                  )}
                  <li>You can resubscribe at any time</li>
                </ul>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for cancellation (optional)
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Help us improve by telling us why you're cancelling..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setCancellationReason('')
                }}
                disabled={cancellingSubscription}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancellingSubscription}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {cancellingSubscription ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Cancelling...
                  </>
                ) : (
                  'Cancel Subscription'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Plugin Subscription Modal */}
      {showCancelPluginModal && selectedPluginForCancellation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Cancel Plugin Subscription
              </h3>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4">
                <XMarkIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  Are you sure you want to cancel your {selectedPluginForCancellation.plugin_type === 'klippel_qc' ? 'Klippel QC' : 'APx500'} plugin subscription?
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-4">
                  {selectedPluginForCancellation.subscription_type === 'trial' ? (
                    <>
                      <li>You will continue to have access until the trial expires</li>
                      <li>Your license will remain valid during the trial period</li>
                      <li>You can resubscribe at any time</li>
                    </>
                  ) : (
                    <>
                      <li>You will retain lifetime access to this plugin</li>
                      <li>This is a one-time purchase, no refunds</li>
                      <li>Your license will remain valid</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for cancellation (optional)
                </label>
                <textarea
                  value={pluginCancellationReason}
                  onChange={(e) => setPluginCancellationReason(e.target.value)}
                  placeholder="Help us improve by telling us why you're cancelling..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCancelPluginModal(false)
                  setSelectedPluginForCancellation(null)
                  setPluginCancellationReason('')
                }}
                disabled={cancellingPluginSubscription}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Keep Plugin
              </button>
              <button
                onClick={handleCancelPluginSubscription}
                disabled={cancellingPluginSubscription}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {cancellingPluginSubscription ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Cancelling...
                  </>
                ) : (
                  'Cancel Plugin Subscription'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
