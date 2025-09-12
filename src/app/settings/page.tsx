'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
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
  GlobeAltIcon
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

export default function SettingsPage() {
  const { user, userProfile, updateProfile, signOut, loading } = useAuth()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<'profile' | 'licenses' | 'sessions' | 'account'>('profile')
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
                    <p className="text-gray-500 dark:text-gray-400">No licenses found</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Subscription Type
                        </label>
                        <div className="mt-1">
                          <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 capitalize">
                            {subscription.subscription_type}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Payment Status
                        </label>
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Monthly Amount
                          </label>
                          <div className="mt-1 text-sm text-gray-900 dark:text-white">
                            ${subscription.monthly_amount} {subscription.currency}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Billing Cycle
                        </label>
                        <div className="mt-1 text-sm text-gray-900 dark:text-white capitalize">
                          {subscription.billing_cycle}
                        </div>
                      </div>

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
                ) : (
                  <div className="text-center py-8">
                    <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No subscription information available</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      You may be on a free plan or trial account.
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
    </DashboardLayout>
  )
}
