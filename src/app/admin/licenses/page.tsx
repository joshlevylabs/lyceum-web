'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  KeyIcon,
  UserIcon,
  CalendarIcon,
  FunnelIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  CreditCardIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

// Helper function to extract license category from either direct field or license_config
function getLicenseCategory(license: LicenseKey): 'main_application' | 'plugin' {
  return license.license_category || license.license_config?.license_category || 'main_application'
}

// Helper function to generate stable license keys
async function generateStableLicenseKeys(licenses: LicenseKey[]): Promise<LicenseKey[]> {
  // Sort licenses by creation date to ensure consistent ordering
  const sortedLicenses = licenses.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  
  return sortedLicenses.map((license, index) => ({
    ...license,
    license_key: `LIC-${index + 1}`
  }))
}

interface LicenseKey {
  id: string
  key_code: string
  license_type: string
  status: string
  tier?: string
  max_users: number
  max_projects: number
  max_storage_gb: number
  features: string[]
  expires_at?: string
  assigned_to?: {
    id: string
    email: string
    full_name: string
  }
  assigned_at?: string
  created_at: string
  usage_stats: {
    users_count?: number
    projects_count?: number
    storage_used_gb?: number
  }
  license_key?: string // LIC-1, LIC-2, etc.
  plugin_id?: string
  user_id?: string
  license_category?: 'main_application' | 'plugin'
  license_config?: {
    license_category?: 'main_application' | 'plugin'
    [key: string]: any
  }
}

interface Subscription {
  id: string
  user_id: string
  user_email?: string
  subscription_type: 'trial' | 'paid'
  status: 'active' | 'expired' | 'cancelled'
  stripe_session_id?: string
  stripe_customer_id?: string
  amount_paid_cents?: number
  currency?: string
  trial_start_date?: string
  trial_end_date?: string
  cancelled_at?: string
  created_at: string
  updated_at: string
}

interface PluginSubscription {
  id: string
  user_id: string
  user_email?: string
  plugin_type: 'klippel_qc' | 'apx500'
  subscription_type: 'trial' | 'paid'
  status: 'active' | 'expired' | 'cancelled'
  stripe_session_id?: string
  amount_paid_cents?: number
  currency?: string
  trial_start_date?: string
  trial_end_date?: string
  cancelled_at?: string
  created_at: string
  updated_at: string
}

export default function LicenseManagement() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'plugin_subscriptions' | 'licenses'>('subscriptions')

  // License states
  const [licenses, setLicenses] = useState<LicenseKey[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'active' | 'expired' | 'revoked' | 'inactive'>('all')
  const [filterLicenseType, setFilterLicenseType] = useState<'all' | 'trial' | 'standard' | 'professional' | 'enterprise'>('all')
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null)
  const [showRevokeModal, setShowRevokeModal] = useState<string | null>(null)

  // Subscription states
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false)
  const [subscriptionSearchTerm, setSubscriptionSearchTerm] = useState('')
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<'all' | 'active' | 'cancelled' | 'expired'>('all')
  const [subscriptionTypeFilter, setSubscriptionTypeFilter] = useState<'all' | 'trial' | 'paid'>('all')

  // Plugin Subscription states
  const [pluginSubscriptions, setPluginSubscriptions] = useState<PluginSubscription[]>([])
  const [pluginSubscriptionsLoading, setPluginSubscriptionsLoading] = useState(false)
  const [pluginSubscriptionSearchTerm, setPluginSubscriptionSearchTerm] = useState('')
  const [pluginSubscriptionStatusFilter, setPluginSubscriptionStatusFilter] = useState<'all' | 'active' | 'cancelled' | 'expired'>('all')
  const [pluginSubscriptionTypeFilter, setPluginSubscriptionTypeFilter] = useState<'all' | 'trial' | 'paid'>('all')
  const [pluginSubscriptionPluginFilter, setPluginSubscriptionPluginFilter] = useState<'all' | 'klippel_qc' | 'apx500'>('all')

  useEffect(() => {
    loadLicenses()
  }, [filterType, filterLicenseType, searchTerm])

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      loadSubscriptions()
    }
  }, [activeTab, subscriptionSearchTerm, subscriptionStatusFilter, subscriptionTypeFilter])

  useEffect(() => {
    if (activeTab === 'plugin_subscriptions') {
      loadPluginSubscriptions()
    }
  }, [activeTab, pluginSubscriptionSearchTerm, pluginSubscriptionStatusFilter, pluginSubscriptionTypeFilter, pluginSubscriptionPluginFilter])

  const loadLicenses = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/admin/licenses/list', { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load licenses')
      }

      let data: LicenseKey[] = result.licenses || []

      // Generate stable license keys based on creation order
      data = await generateStableLicenseKeys(data)

      // Apply filters
      if (filterType !== 'all') {
        // Handle both revoked and inactive status for backward compatibility
        if (filterType === 'revoked') {
          data = data.filter(l => l.status === 'revoked' || l.status === 'inactive')
        } else {
          data = data.filter(l => l.status === filterType)
        }
      }
      if (filterLicenseType !== 'all') {
        data = data.filter(l => l.license_type === filterLicenseType)
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        data = data.filter(l =>
          l.key_code?.toLowerCase().includes(term)
          || l.license_key?.toLowerCase().includes(term)
          || (l as any).assigned_email?.toLowerCase?.().includes(term)
          || (l as any).assigned_name?.toLowerCase?.().includes(term)
          || l.plugin_id?.toLowerCase().includes(term)
        )
      }

      setLicenses(data)
    } catch (error) {
      console.error('Failed to load licenses:', error)
      setLicenses([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'trial': return <ClockIcon className="w-5 h-5 text-blue-500" />
      case 'expired': return <ClockIcon className="w-5 h-5 text-red-500" />
      case 'revoked': return <XCircleIcon className="w-5 h-5 text-red-600" />
      case 'suspended': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
      default: return <ClockIcon className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'trial': return 'bg-blue-100 text-blue-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'revoked': return 'bg-red-100 text-red-800'
      case 'suspended': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getLicenseTypeColor = (type: string) => {
    switch (type) {
      case 'enterprise': return 'bg-purple-100 text-purple-800'
      case 'professional': return 'bg-blue-100 text-blue-800'
      case 'standard': return 'bg-green-100 text-green-800'
      case 'basic': return 'bg-green-100 text-green-800'
      case 'trial': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false
    const expiryDate = new Date(expiresAt)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date()
  }

  const getUsagePercentage = (used: number, total: number) => {
    return total > 0 ? Math.round((used / total) * 100) : 0
  }

  const revokeLicense = async (licenseId: string) => {
    if (!confirm('Are you sure you want to revoke this license?')) return
    
    try {
      const res = await fetch('/api/admin/licenses/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_id: licenseId })
      })
      
      const result = await res.json()
      
      if (res.ok && result.success) {
        loadLicenses()
        alert(result.message || 'License revoked successfully')
      } else {
        alert(`Failed to revoke license: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Revoke license error:', error)
      alert('Failed to revoke license')
    }
  }

  const unassignLicense = async (licenseId: string) => {
    if (!confirm('Are you sure you want to unassign this license from the current user?')) return
    
    try {
      const res = await fetch('/api/admin/licenses/unassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_id: licenseId })
      })
      
      const result = await res.json()
      
      if (res.ok && result.success) {
        loadLicenses()
        alert(result.message || 'License unassigned successfully')
      } else {
        alert(`Failed to unassign license: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Unassign license error:', error)
      alert('Failed to unassign license')
    }
  }

  const deleteLicense = async (licenseId: string, licenseKey: string) => {
    if (!confirm(`Are you sure you want to permanently delete license ${licenseKey}? This action cannot be undone.`)) return

    try {
      const res = await fetch('/api/admin/licenses/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_id: licenseId })
      })

      const result = await res.json()

      if (res.ok && result.success) {
        loadLicenses()
        alert(result.message || 'License deleted successfully')
      } else {
        alert(`Failed to delete license: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Delete license error:', error)
      alert('Failed to delete license')
    }
  }

  // Subscription Management Functions
  const loadSubscriptions = async () => {
    try {
      setSubscriptionsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        console.error('No auth session')
        return
      }

      const response = await fetch('/api/admin/subscriptions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions')
      }

      const data = await response.json()
      let subs = data.subscriptions || []

      // Apply filters
      if (subscriptionStatusFilter !== 'all') {
        subs = subs.filter((s: Subscription) => s.status === subscriptionStatusFilter)
      }
      if (subscriptionTypeFilter !== 'all') {
        subs = subs.filter((s: Subscription) => s.subscription_type === subscriptionTypeFilter)
      }
      if (subscriptionSearchTerm) {
        const term = subscriptionSearchTerm.toLowerCase()
        subs = subs.filter((s: Subscription) =>
          s.user_email?.toLowerCase().includes(term) ||
          s.user_id.toLowerCase().includes(term)
        )
      }

      setSubscriptions(subs)
    } catch (error) {
      console.error('Error loading subscriptions:', error)
      setSubscriptions([])
    } finally {
      setSubscriptionsLoading(false)
    }
  }

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to delete this subscription? This will allow the user to use the trial again.')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        alert('Authentication required')
        return
      }

      const response = await fetch('/api/admin/subscriptions/delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscription_id: subscriptionId })
      })

      if (response.ok) {
        alert('Subscription deleted successfully')
        loadSubscriptions()
      } else {
        const data = await response.json()
        alert(`Failed to delete subscription: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting subscription:', error)
      alert('Failed to delete subscription')
    }
  }

  const handleResetTrial = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to reset the trial for ${userEmail}? This will delete all their trial subscriptions.`)) return

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        alert('Authentication required')
        return
      }

      const response = await fetch('/api/admin/subscriptions/reset-trial', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Trial reset successfully. Deleted ${data.deleted_subscriptions} subscription(s).`)
        loadSubscriptions()
      } else {
        const data = await response.json()
        alert(`Failed to reset trial: ${data.error}`)
      }
    } catch (error) {
      console.error('Error resetting trial:', error)
      alert('Failed to reset trial')
    }
  }

  // Plugin Subscription Management Functions
  const loadPluginSubscriptions = async () => {
    try {
      setPluginSubscriptionsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        console.error('No auth session')
        return
      }

      const response = await fetch('/api/admin/plugin-subscriptions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch plugin subscriptions')
      }

      const data = await response.json()
      let subs = data.subscriptions || []

      // Apply filters
      if (pluginSubscriptionStatusFilter !== 'all') {
        subs = subs.filter((s: PluginSubscription) => s.status === pluginSubscriptionStatusFilter)
      }
      if (pluginSubscriptionTypeFilter !== 'all') {
        subs = subs.filter((s: PluginSubscription) => s.subscription_type === pluginSubscriptionTypeFilter)
      }
      if (pluginSubscriptionPluginFilter !== 'all') {
        subs = subs.filter((s: PluginSubscription) => s.plugin_type === pluginSubscriptionPluginFilter)
      }
      if (pluginSubscriptionSearchTerm) {
        const term = pluginSubscriptionSearchTerm.toLowerCase()
        subs = subs.filter((s: PluginSubscription) =>
          s.user_email?.toLowerCase().includes(term) ||
          s.user_id.toLowerCase().includes(term)
        )
      }

      setPluginSubscriptions(subs)
    } catch (error) {
      console.error('Error loading plugin subscriptions:', error)
      setPluginSubscriptions([])
    } finally {
      setPluginSubscriptionsLoading(false)
    }
  }

  const handleDeletePluginSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to delete this plugin subscription? This will allow the user to use the trial again.')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        alert('Authentication required')
        return
      }

      const response = await fetch('/api/admin/plugin-subscriptions/delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscription_id: subscriptionId })
      })

      if (response.ok) {
        alert('Plugin subscription deleted successfully')
        loadPluginSubscriptions()
      } else {
        const data = await response.json()
        alert(`Failed to delete plugin subscription: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting plugin subscription:', error)
      alert('Failed to delete plugin subscription')
    }
  }

  const handleResetPluginTrial = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to reset the plugin trial for ${userEmail}? This will delete all their plugin trial subscriptions.`)) return

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        alert('Authentication required')
        return
      }

      const response = await fetch('/api/admin/plugin-subscriptions/reset-trial', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Plugin trial reset successfully. Deleted ${data.deleted_subscriptions} subscription(s).`)
        loadPluginSubscriptions()
      } else {
        const data = await response.json()
        alert(`Failed to reset plugin trial: ${data.error}`)
      }
    } catch (error) {
      console.error('Error resetting plugin trial:', error)
      alert('Failed to reset plugin trial')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Subscriptions & License Keys
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage user subscriptions and license keys for your platform
          </p>
        </div>

        {activeTab === 'licenses' && (
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Link
              href="/admin/licenses/create-enhanced"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Create License
            </Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`${
              activeTab === 'subscriptions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <CreditCardIcon className="h-5 w-5 mr-2" />
            Subscriptions
          </button>
          <button
            onClick={() => setActiveTab('plugin_subscriptions')}
            className={`${
              activeTab === 'plugin_subscriptions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <CreditCardIcon className="h-5 w-5 mr-2" />
            Plugin Subscriptions
          </button>
          <button
            onClick={() => setActiveTab('licenses')}
            className={`${
              activeTab === 'licenses'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <KeyIcon className="h-5 w-5 mr-2" />
            License Keys
          </button>
        </nav>
      </div>

      {/* Subscriptions Tab Content */}
      {activeTab === 'subscriptions' && (
        <>
          {/* Subscription Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex space-x-4">
              <select
                value={subscriptionStatusFilter}
                onChange={(e) => setSubscriptionStatusFilter(e.target.value as any)}
                className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>

              <select
                value={subscriptionTypeFilter}
                onChange={(e) => setSubscriptionTypeFilter(e.target.value as any)}
                className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Types</option>
                <option value="trial">Trial</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by email or user ID..."
                value={subscriptionSearchTerm}
                onChange={(e) => setSubscriptionSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {subscriptionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading subscriptions...</span>
              </div>
            ) : subscriptions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trial Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptions.map((subscription) => (
                      <tr key={subscription.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {subscription.user_email || 'No email'}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {subscription.user_id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subscription.subscription_type === 'trial'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {subscription.subscription_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subscription.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : subscription.status === 'cancelled'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {subscription.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {subscription.amount_paid_cents
                            ? `$${(subscription.amount_paid_cents / 100).toFixed(2)} ${subscription.currency?.toUpperCase()}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {subscription.trial_start_date ? (
                            <div>
                              <div>{formatDate(subscription.trial_start_date)}</div>
                              {subscription.trial_end_date && (
                                <div className="text-xs text-gray-400">
                                  to {formatDate(subscription.trial_end_date)}
                                </div>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(subscription.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex justify-center space-x-3">
                            <button
                              onClick={() => handleResetTrial(subscription.user_id, subscription.user_email || 'this user')}
                              className="text-blue-600 hover:text-blue-900"
                              title="Reset trial for user"
                            >
                              <ArrowPathIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubscription(subscription.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete subscription"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No subscriptions found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {subscriptionSearchTerm ? 'No subscriptions match your search criteria.' : 'No subscriptions have been created yet.'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Plugin Subscriptions Tab Content */}
      {activeTab === 'plugin_subscriptions' && (
        <>
          {/* Plugin Subscription Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex space-x-4">
              <select
                value={pluginSubscriptionStatusFilter}
                onChange={(e) => setPluginSubscriptionStatusFilter(e.target.value as any)}
                className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>

              <select
                value={pluginSubscriptionTypeFilter}
                onChange={(e) => setPluginSubscriptionTypeFilter(e.target.value as any)}
                className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Types</option>
                <option value="trial">Trial</option>
                <option value="paid">Paid</option>
              </select>

              <select
                value={pluginSubscriptionPluginFilter}
                onChange={(e) => setPluginSubscriptionPluginFilter(e.target.value as any)}
                className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Plugins</option>
                <option value="klippel_qc">Klippel QC</option>
                <option value="apx500">APX500</option>
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by email or user ID..."
                value={pluginSubscriptionSearchTerm}
                onChange={(e) => setPluginSubscriptionSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Plugin Subscriptions Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {pluginSubscriptionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading plugin subscriptions...</span>
              </div>
            ) : pluginSubscriptions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plugin Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subscription Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trial Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pluginSubscriptions.map((subscription) => (
                      <tr key={subscription.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {subscription.user_email || 'No email'}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {subscription.user_id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subscription.plugin_type === 'klippel_qc'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {subscription.plugin_type === 'klippel_qc' ? 'Klippel QC' : 'APX500'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subscription.subscription_type === 'trial'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {subscription.subscription_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subscription.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : subscription.status === 'cancelled'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {subscription.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {subscription.amount_paid_cents
                            ? `$${(subscription.amount_paid_cents / 100).toFixed(2)} ${subscription.currency?.toUpperCase()}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {subscription.trial_start_date ? (
                            <div>
                              <div>{formatDate(subscription.trial_start_date)}</div>
                              {subscription.trial_end_date && (
                                <div className="text-xs text-gray-400">
                                  to {formatDate(subscription.trial_end_date)}
                                </div>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(subscription.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex justify-center space-x-3">
                            <button
                              onClick={() => handleResetPluginTrial(subscription.user_id, subscription.user_email || 'this user')}
                              className="text-blue-600 hover:text-blue-900"
                              title="Reset plugin trial for user"
                            >
                              <ArrowPathIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePluginSubscription(subscription.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete plugin subscription"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No plugin subscriptions found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {pluginSubscriptionSearchTerm ? 'No plugin subscriptions match your search criteria.' : 'No plugin subscriptions have been created yet.'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* License Keys Tab Content */}
      {activeTab === 'licenses' && (
        <>
          {/* License Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex space-x-4">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked/Inactive</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={filterLicenseType}
                onChange={(e) => setFilterLicenseType(e.target.value as any)}
                className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All License Types</option>
                <option value="trial">Trial</option>
                <option value="standard">Standard</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search licenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* License Keys Table - Jira Style */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading licenses...</span>
          </div>
        ) : licenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    View
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {licenses.map((license) => (
                  <tr key={license.id} className="hover:bg-gray-50">
                    {/* View License */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Link
                        href={`/admin/licenses/${license.id}/details`}
                        className="text-blue-600 hover:text-blue-900"
                        title="View license details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                    </td>
                    {/* License Key */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-mono font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
                          {license.license_key}
                        </span>
                      </div>
                    </td>

                    {/* License Code */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <KeyIcon className="h-5 w-5 text-blue-500 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {license.key_code.length > 20 ? 
                                `${license.key_code.substring(0, 20)}...` : 
                                license.key_code
                              }
                            </code>
                          </div>
                          {isExpiringSoon(license.expires_at) && (
                            <div className="text-xs text-yellow-600 flex items-center mt-1">
                              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                              Expires soon
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getLicenseCategory(license) === 'main_application' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {getLicenseCategory(license) === 'main_application' ? 'CentCom App' : 'Plugin'}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLicenseTypeColor(license.tier || license.license_type)}`}>
                        {license.tier ? license.tier.charAt(0).toUpperCase() + license.tier.slice(1) : license.license_type}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(license.status)}`}>
                        <span className="mr-1">{getStatusIcon(license.status)}</span>
                        {license.status.charAt(0).toUpperCase() + license.status.slice(1)}
                      </span>
                    </td>

                    {/* Assigned To */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setShowAssignModal(license.id)}
                        className="w-full text-left hover:bg-gray-50 rounded p-1 transition-colors"
                        title="Click to assign/reassign license"
                      >
                        {license.assigned_to ? (
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{license.assigned_to.full_name}</div>
                            <div className="text-gray-500">{license.assigned_to.email}</div>
                          </div>
                        ) : (
                          <div className="flex items-center text-sm text-gray-400">
                            <UserIcon className="h-4 w-4 mr-1" />
                            <span className="text-blue-600 hover:text-blue-800">Click to assign</span>
                          </div>
                        )}
                      </button>
                    </td>

                    {/* Created */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(license.created_at)}
                    </td>

                    {/* Expires */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {license.expires_at ? (
                        <div className={isExpiringSoon(license.expires_at) ? 'text-yellow-600' : ''}>
                          {formatDate(license.expires_at)}
                        </div>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </td>

                    {/* Usage */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {license.usage_stats ? (
                        <div className="space-y-1">
                          <div className="text-xs text-gray-600">
                            Users: {license.usage_stats.users_count || 0}/{license.max_users}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full" 
                              style={{ width: `${getUsagePercentage(license.usage_stats.users_count || 0, license.max_users)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {getUsagePercentage(license.usage_stats.users_count || 0, license.max_users)}%
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-2">
                        {!license.assigned_to ? (
                          <button
                            onClick={() => setShowAssignModal(license.id)}
                            className="text-green-600 hover:text-green-900 text-xs font-medium"
                            title="Assign license"
                          >
                            Assign
                          </button>
                        ) : (
                          <button
                            onClick={() => unassignLicense(license.id)}
                            className="text-orange-600 hover:text-orange-900 text-xs font-medium"
                            title="Unassign license"
                          >
                            Unassign
                          </button>
                        )}
                        {license.status === 'active' && (
                          <button
                            onClick={() => revokeLicense(license.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Revoke license"
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteLicense(license.id, license.key_code || license.license_key || license.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete license"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No license keys found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No licenses match your search criteria.' : 'Get started by creating your first license key.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link
                  href="/admin/licenses/create-enhanced"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Create License
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <AssignLicenseModal 
          licenseId={showAssignModal}
          onClose={() => setShowAssignModal(null)}
          onAssign={() => {
            setShowAssignModal(null)
            loadLicenses()
          }}
        />
      )}
    </div>
  )
}

// Enhanced Assign License Modal Component
interface AssignLicenseModalProps {
  licenseId: string
  onClose: () => void
  onAssign: () => void
}

function AssignLicenseModal({ licenseId, onClose, onAssign }: AssignLicenseModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [assignMode, setAssignMode] = useState<'single' | 'multiple'>('single')
  const [currentLicense, setCurrentLicense] = useState<any>(null)

  useEffect(() => {
    loadUsers()
    // Only load license details if we need them, but don't block the modal
    if (licenseId) {
      loadLicenseDetails()
    }
  }, [licenseId])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/users/list')
      const json = await res.json()
      if (res.ok && !json.error) {
        // Filter out users who already have active licenses for this type
        setUsers(json.users || [])
      } else {
        console.error('Failed to load users:', json.error || 'Unknown error')
        setUsers([])
      }
    } catch (error) {
      console.error('Failed to load users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const loadLicenseDetails = async () => {
    try {
      const res = await fetch(`/api/admin/licenses/details?license_id=${licenseId}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setCurrentLicense(json.license)
          return
        }
      }
      
      // Fallback: try to find the license in the main list
      console.warn('License details API failed, trying fallback...')
      const listRes = await fetch('/api/admin/licenses/list')
      if (listRes.ok) {
        const listJson = await listRes.json()
        if (listJson.success) {
          const foundLicense = listJson.licenses.find((l: any) => 
            l.id === licenseId || 
            l.key_id === licenseId ||
            l.key_code === licenseId
          )
          if (foundLicense) {
            setCurrentLicense(foundLicense)
          } else {
            console.warn('License not found in list either')
          }
        }
      }
    } catch (error) {
      console.error('Failed to load license details:', error)
      // Don't block the modal, just continue without license details
    }
  }

  const handleUserSelect = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      if (assignMode === 'single') {
        newSelected.clear()
      }
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleAssign = async () => {
    if (selectedUsers.size === 0) return

    try {
      const userIds = Array.from(selectedUsers)
      
      if (assignMode === 'single') {
        // Single user assignment
        const res = await fetch('/api/admin/licenses/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            key_id: licenseId,
            user_id: userIds[0]
          })
        })

        if (res.ok) {
          onAssign()
          alert('License assigned successfully')
        } else {
          const json = await res.json()
          alert(`Failed to assign license: ${json.error}`)
        }
      } else {
        // Multiple user assignment - create copies of the license
        const res = await fetch('/api/admin/licenses/assign-multiple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            key_id: licenseId,
            user_ids: userIds
          })
        })

        if (res.ok) {
          onAssign()
          alert(`License assigned to ${userIds.length} users successfully`)
        } else {
          const json = await res.json()
          alert(`Failed to assign license: ${json.error}`)
        }
      }
    } catch (error) {
      alert('Failed to assign license')
    }
  }

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-[700px] shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Assign License</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md mb-4">
            <h4 className="font-medium text-blue-900">License Assignment</h4>
            <p className="text-sm text-blue-700">
              <span className="font-mono bg-blue-100 px-2 py-1 rounded">
                License ID: {licenseId}
              </span>
            </p>
            {currentLicense && (
              <p className="text-sm text-blue-600 mt-1">
                Type: <span className="font-medium">{currentLicense.license_type || 'Unknown'}</span>
                {currentLicense.plugin_id && (
                  <> | Plugin: <span className="font-medium">{currentLicense.plugin_id}</span></>
                )}
              </p>
            )}
          </div>

          {/* Assignment Mode Toggle */}
          <div className="flex space-x-4 mb-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="assignMode"
                value="single"
                checked={assignMode === 'single'}
                onChange={(e) => {
                  setAssignMode('single')
                  setSelectedUsers(new Set())
                }}
              />
              <span className="ml-2 text-sm text-gray-700">Assign to one user</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="assignMode"
                value="multiple"
                checked={assignMode === 'multiple'}
                onChange={(e) => {
                  setAssignMode('multiple')
                  setSelectedUsers(new Set())
                }}
              />
              <span className="ml-2 text-sm text-gray-700">Create copies for multiple users</span>
            </label>
          </div>

          {/* Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or username..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* User Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select User{assignMode === 'multiple' ? 's' : ''} 
              {selectedUsers.size > 0 && (
                <span className="text-blue-600"> ({selectedUsers.size} selected)</span>
              )}
            </label>
            
            <div className="border border-gray-300 rounded-md max-h-60 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading users...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No users match your search' : 'No users available'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <div
                      key={`license-user-${user.id}`}
                      className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer ${
                        selectedUsers.has(user.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => handleUserSelect(user.id)}
                    >
                      <input
                        type={assignMode === 'single' ? 'radio' : 'checkbox'}
                        className="mr-3"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleUserSelect(user.id)}
                      />
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                        user.is_active ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <UserIcon className={`h-4 w-4 ${
                          user.is_active ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{user.full_name}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            user.role === 'admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'engineer' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'analyst' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                          {!user.is_active && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email} • {user.username}
                        </div>
                        {user.company && (
                          <div className="text-xs text-gray-400">{user.company}</div>
                        )}
                      </div>
                      {user.all_licenses && user.all_licenses.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {user.all_licenses.length} license{user.all_licenses.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {assignMode === 'multiple' && selectedUsers.size > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Multiple Assignment Notice
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>This will create {selectedUsers.size} separate license copies, one for each selected user.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={selectedUsers.size === 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
            >
              {assignMode === 'single' ? 
                'Assign License' : 
                `Create ${selectedUsers.size} License${selectedUsers.size !== 1 ? 's' : ''}`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Edit License Modal Component
interface EditLicenseModalProps {
  license: LicenseKey
  onClose: () => void
  onSave: () => void
}

function EditLicenseModal({ license, onClose, onSave }: EditLicenseModalProps) {
  const [formData, setFormData] = useState({
    license_type: license.license_type,
    status: license.status,
    expires_at: license.expires_at ? license.expires_at.split('T')[0] : '',
    max_users: license.max_users,
    max_projects: license.max_projects,
    max_storage_gb: license.max_storage_gb
  })

  const handleSave = async () => {
    try {
      const res = await fetch('/api/admin/licenses/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_id: license.id,
          ...formData,
          expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
        })
      })

      if (res.ok) {
        onSave()
        alert('License updated successfully')
      } else {
        const json = await res.json()
        alert(`Failed to update license: ${json.error}`)
      }
    } catch (error) {
      alert('Failed to update license')
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Edit License</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">License Type</label>
                <select
                  value={formData.license_type}
                  onChange={(e) => setFormData({...formData, license_type: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="trial">Trial</option>
                  <option value="standard">Standard</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="expired">Expired</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
              <input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Users</label>
                <input
                  type="number"
                  value={formData.max_users}
                  onChange={(e) => setFormData({...formData, max_users: parseInt(e.target.value) || 0})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Max Projects</label>
                <input
                  type="number"
                  value={formData.max_projects}
                  onChange={(e) => setFormData({...formData, max_projects: parseInt(e.target.value) || 0})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Max Storage (GB)</label>
                <input
                  type="number"
                  value={formData.max_storage_gb}
                  onChange={(e) => setFormData({...formData, max_storage_gb: parseInt(e.target.value) || 0})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
