'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  UserIcon,
  ShieldCheckIcon,
  ComputerDesktopIcon,
  KeyIcon,
  ArrowLeftIcon,
  ClockIcon,
  CurrencyDollarIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'

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
  payment_status: string
  subscription_type: string
  monthly_amount?: number
  currency: string
  billing_cycle: string
  next_billing_date?: string
  last_payment_date?: string
  payment_failures: number
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

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser, loading: authLoading } = useAuth()
  
  const userId = params.userId as string
  const [activeTab, setActiveTab] = useState<'profile' | 'licenses' | 'sessions' | 'payment' | 'account'>('profile')
  
  // Data state
  const [enhancedProfile, setEnhancedProfile] = useState<EnhancedProfile | null>(null)
  const [licenses, setLicenses] = useState<any>({ license_categories: { main_applications: [], plugins: [], other: [] } })
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [sessions, setSessions] = useState<{
    active: Session[]
    inactive: Session[]
    history: Session[]
    login_sessions?: {
      centcom: Session[]
      web: Session[]
      all: Session[]
    }
  }>({ active: [], inactive: [], history: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false)
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    company: '',
    role: 'viewer'
  })
  const [isSaving, setIsSaving] = useState(false)

  // Check admin permissions - more comprehensive check
  const isAdmin = currentUser && (
    (currentUser.user_metadata?.role === 'admin' || currentUser.user_metadata?.role === 'superadmin') ||
    // Also check userProfile if available (from AuthContext)
    (currentUser as any).userProfile?.role === 'admin' || (currentUser as any).userProfile?.role === 'superadmin'
  )

  useEffect(() => {
    if (!authLoading && (!currentUser || !isAdmin)) {
      console.log('Admin profile access denied - user:', currentUser?.email, 'isAdmin:', isAdmin)
      router.push('/dashboard')
    }
  }, [currentUser, isAdmin, authLoading, router])

  // Fetch user data
  useEffect(() => {
    if (userId && currentUser && isAdmin && !authLoading) {
      console.log('Fetching user data for userId:', userId)
      fetchUserData()
    }
  }, [userId, currentUser, isAdmin, authLoading])

  const fetchUserData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('Starting to fetch user data for userId:', userId)

      // Fetch enhanced profile
      console.log('Fetching enhanced profile...')
      const enhancedResponse = await fetch(`/api/user-profiles/enhanced?user_id=${userId}`)
      console.log('Enhanced profile response status:', enhancedResponse.status)
      
      if (enhancedResponse.ok) {
        const enhancedData = await enhancedResponse.json()
        console.log('Enhanced profile data received:', !!enhancedData.data)
        setEnhancedProfile(enhancedData.data)
      } else {
        const errorText = await enhancedResponse.text()
        console.error('Enhanced profile fetch failed:', enhancedResponse.status, errorText)
        throw new Error(`Failed to fetch user profile (${enhancedResponse.status})`)
      }

      // Fetch licenses and subscription data
      console.log('Fetching licenses...')
      const licensesResponse = await fetch(`/api/user-profiles/licenses?user_id=${userId}`)
      console.log('Licenses response status:', licensesResponse.status)
      
      if (licensesResponse.ok) {
        const licensesData = await licensesResponse.json()
        console.log('Licenses data received:', licensesData.data?.licenses?.length || 0, 'licenses')
        setLicenses({
          licenses: licensesData.data.licenses || [],
          license_categories: licensesData.data.license_categories || { main_applications: [], plugins: [], other: [] },
          statistics: licensesData.data.statistics || {}
        })
        setSubscription(licensesData.data.subscription)
        setInvoices(licensesData.data.transactions || [])
        setTransactions(licensesData.data.transactions || [])
      } else {
        console.warn('Failed to fetch licenses:', licensesResponse.status)
      }

      // Fetch sessions data
      console.log('Fetching sessions...')
      const sessionsResponse = await fetch(`/api/user-profiles/sessions?user_id=${userId}`)
      console.log('Sessions response status:', sessionsResponse.status)
      
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json()
        console.log('Sessions data received:', sessionsData.data?.session_history?.length || 0, 'history items')
        setSessions({
          active: sessionsData.data.analytics_sessions.active || [],
          inactive: sessionsData.data.analytics_sessions.inactive || [],
          history: sessionsData.data.session_history || [],
          login_sessions: sessionsData.data.login_sessions || { centcom: [], web: [], all: [] }
        })
      } else {
        console.warn('Failed to fetch sessions:', sessionsResponse.status)
      }

      console.log('All user data fetched successfully')

    } catch (error: any) {
      console.error('Error fetching user data:', error)
      setError(error.message || 'Failed to load user data')
    } finally {
      setLoading(false)
    }
  }

  // Initialize form data when profile loads
  useEffect(() => {
    if (enhancedProfile && !isEditMode) {
      setEditFormData({
        full_name: enhancedProfile.full_name || '',
        username: enhancedProfile.username || '',
        email: enhancedProfile.email || '',
        company: enhancedProfile.company || '',
        role: enhancedProfile.role || 'viewer'
      })
    }
  }, [enhancedProfile])

  // Handle edit mode toggle
  const handleEditToggle = () => {
    if (isEditMode) {
      // Reset form data to original values if cancelling
      if (enhancedProfile) {
        setEditFormData({
          full_name: enhancedProfile.full_name || '',
          username: enhancedProfile.username || '',
          email: enhancedProfile.email || '',
          company: enhancedProfile.company || '',
          role: enhancedProfile.role || 'viewer'
        })
      }
    }
    setIsEditMode(!isEditMode)
  }

  // Handle form field changes
  const handleFormChange = (field: string, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!enhancedProfile) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          ...editFormData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update user profile')
      }

      // Refresh user data after successful update
      await fetchUserData()
      setIsEditMode(false)
    } catch (error: any) {
      console.error('Error updating profile:', error)
      setError(error.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              {authLoading ? 'Checking authentication...' : 'Loading user data...'}
            </p>
            {/* Debug info */}
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              <p>User ID: {userId}</p>
              <p>Current User: {currentUser?.email || 'None'}</p>
              <p>Auth Loading: {authLoading.toString()}</p>
              <p>Is Admin: {isAdmin?.toString()}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/admin/users')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to User Management
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin/users')}
                className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Users
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  User Profile: {enhancedProfile?.full_name || enhancedProfile?.username || 'Unknown User'}
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Viewing detailed profile information and account data
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <UserIcon className="h-4 w-4 inline mr-1" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('licenses')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
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
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sessions'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <ComputerDesktopIcon className="h-4 w-4 inline mr-1" />
                Sessions
              </button>
              <button
                onClick={() => setActiveTab('payment')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'payment'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <CurrencyDollarIcon className="h-4 w-4 inline mr-1" />
                Payment
              </button>
              <button
                onClick={() => setActiveTab('account')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
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
          {activeTab === 'profile' && enhancedProfile && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Profile Information</h3>
                  <div className="space-x-3">
                    {isEditMode ? (
                      <>
                        <button
                          onClick={handleSaveProfile}
                          disabled={isSaving}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </button>
                        <button
                          onClick={handleEditToggle}
                          disabled={isSaving}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleEditToggle}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    {isEditMode ? (
                      <input
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => handleFormChange('email', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    ) : (
                      <div className="mt-1 text-sm text-gray-900 dark:text-white">{enhancedProfile.email}</div>
                    )}
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={editFormData.full_name}
                        onChange={(e) => handleFormChange('full_name', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    ) : (
                      <div className="mt-1 text-sm text-gray-900 dark:text-white">{enhancedProfile.full_name || 'Not provided'}</div>
                    )}
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={editFormData.username}
                        onChange={(e) => handleFormChange('username', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    ) : (
                      <div className="mt-1 text-sm text-gray-900 dark:text-white">{enhancedProfile.username}</div>
                    )}
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={editFormData.company}
                        onChange={(e) => handleFormChange('company', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Company name"
                      />
                    ) : (
                      <div className="mt-1 text-sm text-gray-900 dark:text-white">{enhancedProfile.company || 'Not provided'}</div>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                    {isEditMode ? (
                      <select
                        value={editFormData.role}
                        onChange={(e) => handleFormChange('role', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="analyst">Analyst</option>
                        <option value="engineer">Engineer</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    ) : (
                      <div className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          enhancedProfile.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' :
                          enhancedProfile.role === 'superadmin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                        }`}>
                          {enhancedProfile.role}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* User ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User ID</label>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono break-all">{enhancedProfile.id}</div>
                  </div>

                  {/* Security Clearance */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Security Clearance</label>
                    <div className="mt-1">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                        {enhancedProfile.security_clearance}
                      </span>
                    </div>
                  </div>

                  {/* Account Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Status</label>
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Confirmed</label>
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Age</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">{enhancedProfile.days_since_creation} days</div>
                  </div>

                  {/* Last Sign In */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Sign In</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {enhancedProfile.last_sign_in ? (
                        <div>
                          <div className="font-medium">
                            {enhancedProfile.days_since_last_sign_in !== null
                              ? `${enhancedProfile.days_since_last_sign_in || 0} days ago`
                              : new Date(enhancedProfile.last_sign_in).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                            {enhancedProfile.login_source === 'centcom' ? (
                              <>
                                <ComputerDesktopIcon className="h-3 w-3 text-blue-500" />
                                <span>CentCom Login</span>
                              </>
                            ) : (
                              <>
                                <GlobeAltIcon className="h-3 w-3 text-green-500" />
                                <span>Web Login</span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        'Never'
                      )}
                    </div>
                  </div>

                  {/* Database Clusters */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Database Clusters</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {enhancedProfile.statistics.total_clusters} total ({enhancedProfile.statistics.active_clusters} active)
                    </div>
                  </div>
                </div>

                {/* Resource Usage */}
                <div className="mt-8">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Resource Usage</h4>
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
            </div>
          )}

          {activeTab === 'licenses' && (
            <div className="space-y-6">
              {/* Licenses Section */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Assigned Licenses</h3>

                  {(licenses.license_categories?.main_applications?.length > 0 || 
                    licenses.license_categories?.plugins?.length > 0 || 
                    licenses.license_categories?.other?.length > 0) ? (
                    <div className="space-y-4">
                      {/* Show categorized licenses */}
                      {licenses.licenses?.map((license, index) => (
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
                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                              license.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                : license.status === 'expired'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                            }`}>
                              {license.status}
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
                      <p className="text-gray-500 dark:text-gray-400">No licenses assigned</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Subscription Section */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Subscription Information</h3>
                  
                  {subscription ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subscription Type</label>
                        <div className="mt-1">
                          <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 capitalize">
                            {subscription.subscription_type}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Status</label>
                        <div className="mt-1">
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                            subscription.payment_status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                              : subscription.payment_status === 'overdue'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                          } capitalize`}>
                            {subscription.payment_status}
                          </span>
                        </div>
                      </div>

                      {subscription.monthly_amount && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Amount</label>
                          <div className="mt-1 text-sm text-gray-900 dark:text-white">
                            ${subscription.monthly_amount} {subscription.currency}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Billing Cycle</label>
                        <div className="mt-1 text-sm text-gray-900 dark:text-white capitalize">
                          {subscription.billing_cycle}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No subscription information available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-6">
              {/* Last Login Summary */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Login Summary</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <ComputerDesktopIcon className="h-8 w-8 text-blue-600" />
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Last CentCom Login</h4>
                          <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                            {sessions.login_sessions?.centcom?.length > 0
                              ? new Date(sessions.login_sessions.centcom[0].created_at).toLocaleString()
                              : 'Never'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Total CentCom logins: {sessions.login_sessions?.centcom?.length || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <GlobeAltIcon className="h-8 w-8 text-green-600" />
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Last Web Login</h4>
                          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                            {sessions.login_sessions?.web?.length > 0
                              ? new Date(sessions.login_sessions.web[0].created_at).toLocaleString()
                              : 'Never'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Total web logins: {sessions.login_sessions?.web?.length || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Sessions */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Active Analytics Sessions</h3>

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
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Session & Activity History</h3>
                  
                  {sessions.history.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {sessions.history.slice(0, 30).map((session, index) => (
                        <div key={`${session.id}-${index}`} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              {/* Session Type Icon */}
                              {session.type === 'centcom_login' ? (
                                <ComputerDesktopIcon className="h-4 w-4 text-blue-600" />
                              ) : session.type === 'web_login' ? (
                                <GlobeAltIcon className="h-4 w-4 text-green-600" />
                              ) : (
                                <div className={`h-2 w-2 rounded-full ${
                                  session.event === 'login' || session.event === 'authentication'
                                    ? 'bg-green-400'
                                    : session.event === 'logout'
                                    ? 'bg-red-400'
                                    : 'bg-blue-400'
                                }`}></div>
                              )}
                              
                              {/* Session Type Badge */}
                              {(session.type === 'centcom_login' || session.type === 'web_login') && (
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                  session.type === 'centcom_login'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                }`}>
                                  {session.application_type || (session.type === 'centcom_login' ? 'CentCom' : 'Web')}
                                </span>
                              )}
                            </div>
                            
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {session.type === 'centcom_login' ? 'CentCom Login' :
                                 session.type === 'web_login' ? 'Web Login' :
                                 session.event || session.type}
                              </div>
                              {session.description && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {session.description}
                                </div>
                              )}
                              <div className="flex space-x-4 text-xs text-gray-500 dark:text-gray-400">
                                {session.ip_address && (
                                  <span>IP: {session.ip_address}</span>
                                )}
                                {session.user_agent && session.user_agent !== 'Unknown' && (
                                  <span title={session.user_agent}>
                                    {session.user_agent.includes('Chrome') ? '🌐 Chrome' :
                                     session.user_agent.includes('Firefox') ? '🦊 Firefox' :
                                     session.user_agent.includes('Safari') ? '🧭 Safari' :
                                     session.user_agent.includes('CentCom') ? '💻 CentCom' :
                                     '📱 Other'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                            <div>{new Date(session.created_at).toLocaleDateString()}</div>
                            <div>{new Date(session.created_at).toLocaleTimeString()}</div>
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

          {activeTab === 'payment' && (
            <div className="space-y-6">
              {/* Payment Information */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Payment Information</h3>

                  {subscription ? (
                    <div className="space-y-6">
                      {/* Subscription Overview */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
                            <div>
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white">Current Subscription</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                {subscription.subscription_type} Plan
                              </p>
                            </div>
                          </div>
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                            subscription.payment_status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                              : subscription.payment_status === 'overdue'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                          } capitalize`}>
                            {subscription.payment_status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Monthly Amount:</span>
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              ${subscription.monthly_amount || 0} {subscription.currency || 'USD'}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Billing Cycle:</span>
                            <div className="text-gray-900 dark:text-white capitalize">
                              {subscription.billing_cycle}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Next Billing:</span>
                            <div className="text-gray-900 dark:text-white">
                              {subscription.next_billing_date 
                                ? new Date(subscription.next_billing_date).toLocaleDateString()
                                : 'N/A'
                              }
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Payment Failures:</span>
                            <div className={`font-medium ${
                              subscription.payment_failures > 0 
                                ? 'text-red-600 dark:text-red-400' 
                                : 'text-green-600 dark:text-green-400'
                            }`}>
                              {subscription.payment_failures || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No active subscription found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction History */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Transaction History</h3>

                  {transactions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Transaction
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {transactions.slice(0, 10).map((transaction, index) => (
                            <tr key={transaction.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {transaction.description || transaction.invoice_number || `Transaction #${index + 1}`}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white capitalize">
                                  {transaction.transaction_type || 'payment'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  ${transaction.amount || transaction.total_amount || 0} {transaction.currency || 'USD'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  transaction.status === 'completed' || transaction.status === 'paid'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                    : transaction.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                                    : transaction.status === 'failed'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
                                } capitalize`}>
                                  {transaction.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {new Date(transaction.processed_at || transaction.paid_date || transaction.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No transaction history available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Invoices Section */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Recent Invoices</h3>

                  {invoices.length > 0 ? (
                    <div className="space-y-3">
                      {invoices.slice(0, 5).map((invoice, index) => (
                        <div key={invoice.id || index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                <span className="text-gray-600 dark:text-gray-400 font-bold text-sm">📄</span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {invoice.invoice_number || `Invoice #${index + 1}`}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  ${invoice.total_amount || invoice.amount || 0} {invoice.currency || 'USD'}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                invoice.status === 'paid'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                  : invoice.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                                  : invoice.status === 'overdue'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
                              } capitalize`}>
                                {invoice.status}
                              </span>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {new Date(invoice.due_date || invoice.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <span className="text-4xl mb-4 block">📄</span>
                      <p className="text-gray-500 dark:text-gray-400">No invoices available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && enhancedProfile && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Account Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Created</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {new Date(enhancedProfile.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Updated</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {new Date(enhancedProfile.updated_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">MFA Status</label>
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Sessions</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {sessions.active.length + sessions.inactive.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
