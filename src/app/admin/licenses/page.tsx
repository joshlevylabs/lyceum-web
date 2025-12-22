'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Plus,
  MagnifyingGlass,
  Key,
  User,
  Calendar,
  Funnel,
  Trash,
  CheckCircle,
  XCircle,
  Clock,
  Warning,
  Eye,
  CreditCard,
  Pencil
} from '@phosphor-icons/react'

// Helper function to extract license category from either direct field or license_config
function getLicenseCategory(license: LicenseKey): 'main_application' | 'plugin' {
  return license.license_category || license.license_config?.license_category || 'main_application'
}

// License keys are now permanent and stored in the database
// The license_key field (LIC-1, LIC-2, etc.) is set once on creation and never changes

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

// Unified Subscription interface (combines native app and plugin subscriptions)
interface Subscription {
  id: string
  subscription_key: string // SUB-1, SUB-2, etc.
  user_id: string
  user_email?: string
  subscription_category: 'native_app' | 'plugin'
  subscription_type: 'trial' | 'paid'
  plugin_type?: 'klippel_qc' | 'apx500' | null
  status: 'active' | 'expired' | 'cancelled'
  stripe_session_id?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  amount_paid_cents?: number
  currency?: string
  trial_start_date?: string
  trial_end_date?: string
  cancelled_at?: string
  created_at: string
  updated_at: string
}

// License-Subscription Relationship interface
interface LicenseSubscriptionRelationship {
  id: string
  license_id: string
  subscription_id: string
  relationship_type: 'standard' | 'trial_conversion' | 'upgrade' | 'addon'
  notes?: string
  created_at: string
  updated_at: string
  license?: {
    id: string
    license_key: string
    key_code: string
    license_type: string
    status: string
    user_id?: string
    user_email?: string
  }
  subscription?: {
    id: string
    subscription_key: string
    subscription_category: string
    subscription_type: string
    plugin_type?: string
    status: string
    user_id: string
    user_email?: string
  }
}

export default function LicenseManagement() {
  // Tab state - subscriptions are now unified
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'licenses' | 'relationships'>('subscriptions')

  // License states
  const [licenses, setLicenses] = useState<LicenseKey[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'active' | 'expired' | 'revoked' | 'inactive'>('all')
  const [filterLicenseType, setFilterLicenseType] = useState<'all' | 'trial' | 'standard' | 'professional' | 'enterprise'>('all')
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null)
  const [showRevokeModal, setShowRevokeModal] = useState<string | null>(null)

  // Unified Subscription states (includes both native app and plugin subscriptions)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false)
  const [subscriptionSearchTerm, setSubscriptionSearchTerm] = useState('')
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<'all' | 'active' | 'cancelled' | 'expired'>('all')
  const [subscriptionTypeFilter, setSubscriptionTypeFilter] = useState<'all' | 'trial' | 'paid'>('all')
  const [subscriptionCategoryFilter, setSubscriptionCategoryFilter] = useState<'all' | 'native_app' | 'plugin'>('all')
  const [subscriptionPluginFilter, setSubscriptionPluginFilter] = useState<'all' | 'klippel_qc' | 'apx500'>('all')

  // Relationship states
  const [relationships, setRelationships] = useState<LicenseSubscriptionRelationship[]>([])
  const [standaloneLicenses, setStandaloneLicenses] = useState<LicenseKey[]>([])
  const [relationshipsLoading, setRelationshipsLoading] = useState(false)
  const [showCreateRelationshipModal, setShowCreateRelationshipModal] = useState(false)
  const [editRelationship, setEditRelationship] = useState<LicenseSubscriptionRelationship | null>(null)

  useEffect(() => {
    loadLicenses()
  }, [filterType, filterLicenseType, searchTerm])

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      loadSubscriptions()
    } else if (activeTab === 'relationships') {
      loadRelationships()
    }
  }, [activeTab, subscriptionSearchTerm, subscriptionStatusFilter, subscriptionTypeFilter, subscriptionCategoryFilter, subscriptionPluginFilter])

  const loadLicenses = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/admin/licenses/list', { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load licenses')
      }

      let data: LicenseKey[] = result.licenses || []

      // License keys are now permanent and come from the database
      // No need to generate them dynamically

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
      case 'active': return <CheckCircle className="w-5 h-5 text-emerald-400" />
      case 'trial': return <Clock className="w-5 h-5 text-cyan-400" />
      case 'expired': return <Clock className="w-5 h-5 text-red-400" />
      case 'revoked': return <XCircle className="w-5 h-5 text-red-400" />
      case 'suspended': return <Warning className="w-5 h-5 text-amber-400" />
      default: return <Clock className="w-5 h-5 text-foreground/40" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'trial': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
      case 'expired': return 'bg-red-500/10 text-red-400 border border-red-500/20'
      case 'revoked': return 'bg-red-500/10 text-red-400 border border-red-500/20'
      case 'suspended': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      default: return 'bg-foreground/10 text-foreground/60 border border-foreground/20'
    }
  }

  const getLicenseTypeColor = (type: string) => {
    switch (type) {
      case 'enterprise': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
      case 'professional': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
      case 'standard': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'basic': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'trial': return 'bg-foreground/10 text-foreground/60 border border-foreground/20'
      default: return 'bg-foreground/10 text-foreground/60 border border-foreground/20'
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

  // Unified Subscription Management Functions
  const loadSubscriptions = async () => {
    try {
      setSubscriptionsLoading(true)

      // Build query parameters with all filters
      const params = new URLSearchParams()
      if (subscriptionStatusFilter !== 'all') params.append('status', subscriptionStatusFilter)
      if (subscriptionTypeFilter !== 'all') params.append('subscription_type', subscriptionTypeFilter)
      if (subscriptionCategoryFilter !== 'all') params.append('subscription_category', subscriptionCategoryFilter)
      if (subscriptionPluginFilter !== 'all') params.append('plugin_type', subscriptionPluginFilter)
      if (subscriptionSearchTerm) params.append('search', subscriptionSearchTerm)

      const response = await fetch(`/api/admin/subscriptions?${params.toString()}`, {
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions')
      }

      const data = await response.json()
      setSubscriptions(data.subscriptions || [])
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
      const response = await fetch('/api/admin/subscriptions', {
        method: 'DELETE',
        headers: {
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

  // Relationship Management Functions
  const loadRelationships = async () => {
    try {
      setRelationshipsLoading(true)

      // Fetch relationships
      const response = await fetch('/api/admin/license-subscription-relationships', {
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch relationships')
      }

      const data = await response.json()
      setRelationships(data.relationships || [])

      // Fetch standalone licenses (licenses without relationships)
      const licensesResponse = await fetch('/api/admin/licenses/list', { cache: 'no-store' })
      const licensesResult = await licensesResponse.json()

      if (licensesResponse.ok && licensesResult.success) {
        const allLicenses = licensesResult.licenses || []
        const relationshipLicenseIds = new Set((data.relationships || []).map((r: LicenseSubscriptionRelationship) => r.license_id))

        // Filter licenses that don't have any relationships
        const standalone = allLicenses.filter((lic: LicenseKey) => !relationshipLicenseIds.has(lic.id))
        setStandaloneLicenses(standalone)
      } else {
        setStandaloneLicenses([])
      }
    } catch (error) {
      console.error('Error loading relationships:', error)
      setRelationships([])
      setStandaloneLicenses([])
    } finally {
      setRelationshipsLoading(false)
    }
  }

  const handleDeleteRelationship = async (relationshipId: string) => {
    if (!confirm('Are you sure you want to delete this relationship?')) return

    try {
      const response = await fetch('/api/admin/license-subscription-relationships', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ relationship_id: relationshipId })
      })

      if (response.ok) {
        alert('Relationship deleted successfully')
        loadRelationships()
      } else {
        const data = await response.json()
        alert(`Failed to delete relationship: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting relationship:', error)
      alert('Failed to delete relationship')
    }
  }

  const getRelationshipTypeColor = (type: string) => {
    switch (type) {
      case 'standard': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
      case 'trial_conversion': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'upgrade': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
      case 'addon': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      default: return 'bg-foreground/10 text-foreground/60 border border-foreground/20'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-foreground sm:text-3xl sm:truncate">
            Subscriptions & License Keys
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Manage user subscriptions and license keys for your platform
          </p>
        </div>

        {activeTab === 'licenses' && (
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Link
              href="/admin/licenses/create-enhanced"
              className="btn-primary inline-flex items-center"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Create License
            </Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-cyan-500/10">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`${
              activeTab === 'subscriptions'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-foreground/60 hover:text-foreground hover:border-cyan-500/40'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Subscriptions
          </button>
          <button
            onClick={() => setActiveTab('licenses')}
            className={`${
              activeTab === 'licenses'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-foreground/60 hover:text-foreground hover:border-cyan-500/40'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
          >
            <Key className="h-5 w-5 mr-2" />
            License Keys
          </button>
          <button
            onClick={() => setActiveTab('relationships')}
            className={`${
              activeTab === 'relationships'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-foreground/60 hover:text-foreground hover:border-cyan-500/40'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Relationships
          </button>
        </nav>
      </div>

      {/* Subscriptions Tab Content */}
      {activeTab === 'subscriptions' && (
        <>
          {/* Subscription Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-wrap gap-4">
              <select
                value={subscriptionStatusFilter}
                onChange={(e) => setSubscriptionStatusFilter(e.target.value as any)}
                className="glass-input pl-3 pr-10 py-2 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>

              <select
                value={subscriptionTypeFilter}
                onChange={(e) => setSubscriptionTypeFilter(e.target.value as any)}
                className="glass-input pl-3 pr-10 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="trial">Trial</option>
                <option value="paid">Paid</option>
              </select>

              <select
                value={subscriptionCategoryFilter}
                onChange={(e) => setSubscriptionCategoryFilter(e.target.value as any)}
                className="glass-input pl-3 pr-10 py-2 text-sm"
              >
                <option value="all">All Categories</option>
                <option value="native_app">Native App</option>
                <option value="plugin">Plugin</option>
              </select>

              <select
                value={subscriptionPluginFilter}
                onChange={(e) => setSubscriptionPluginFilter(e.target.value as any)}
                className="glass-input pl-3 pr-10 py-2 text-sm"
              >
                <option value="all">All Plugins</option>
                <option value="klippel_qc">Klippel QC</option>
                <option value="apx500">APX500</option>
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlass className="h-5 w-5 text-foreground/40" />
              </div>
              <input
                type="text"
                placeholder="Search by email or user ID..."
                value={subscriptionSearchTerm}
                onChange={(e) => setSubscriptionSearchTerm(e.target.value)}
                className="glass-input w-full pl-10 pr-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="glass-card overflow-hidden">
            {subscriptionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-500"></div>
                <span className="ml-2 text-foreground/60">Loading subscriptions...</span>
              </div>
            ) : subscriptions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-cyan-500/10">
                  <thead className="bg-cyan-500/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Key
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Trial Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        View
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-500/10">
                    {subscriptions.map((subscription) => (
                      <tr key={subscription.id} className="hover:bg-cyan-500/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded">
                            {subscription.subscription_key}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">
                            {subscription.user_email || 'No email'}
                          </div>
                          <div className="text-xs text-foreground/50 font-mono">
                            {subscription.user_id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subscription.subscription_category === 'native_app'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}>
                            {subscription.subscription_category === 'native_app' ? 'Native App' : subscription.plugin_type || 'Plugin'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subscription.subscription_type === 'trial'
                              ? 'bg-foreground/10 text-foreground/60 border border-foreground/20'
                              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          }`}>
                            {subscription.subscription_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subscription.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : subscription.status === 'cancelled'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {subscription.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/60">
                          {subscription.amount_paid_cents
                            ? `$${(subscription.amount_paid_cents / 100).toFixed(2)} ${subscription.currency?.toUpperCase()}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/60">
                          {subscription.trial_start_date ? (
                            <div>
                              <div>{formatDate(subscription.trial_start_date)}</div>
                              {subscription.trial_end_date && (
                                <div className="text-xs text-foreground/40">
                                  to {formatDate(subscription.trial_end_date)}
                                </div>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/60">
                          {formatDate(subscription.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <Link
                            href={`/admin/subscriptions/${subscription.id}/details`}
                            className="text-cyan-400 hover:text-cyan-300 transition-colors"
                            title="View subscription details"
                          >
                            <Eye className="h-5 w-5 inline" />
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex justify-center space-x-3">
                            <button
                              onClick={() => handleDeleteSubscription(subscription.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Delete subscription"
                            >
                              <Trash className="h-4 w-4" />
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
                <CreditCard className="mx-auto h-12 w-12 text-foreground/40" />
                <h3 className="mt-2 text-sm font-semibold text-foreground">No subscriptions found</h3>
                <p className="mt-1 text-sm text-foreground/60">
                  {subscriptionSearchTerm ? 'No subscriptions match your search criteria.' : 'No subscriptions have been created yet.'}
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
                className="glass-input pl-3 pr-10 py-2 text-sm"
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
                className="glass-input pl-3 pr-10 py-2 text-sm"
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
                <MagnifyingGlass className="h-5 w-5 text-foreground/40" />
              </div>
              <input
                type="text"
                placeholder="Search licenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input w-full pl-10 pr-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* License Keys Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-500"></div>
            <span className="ml-2 text-foreground/60">Loading licenses...</span>
          </div>
        ) : licenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-cyan-500/10">
              <thead className="bg-cyan-500/5">
                <tr>
                  <th className="px-6 py-3 text-center text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    View
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    License Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/10">
                {licenses.map((license) => (
                  <tr key={license.id} className="hover:bg-cyan-500/5 transition-colors">
                    {/* View License */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Link
                        href={`/admin/licenses/${license.id}/details`}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                        title="View license details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                    {/* License Key */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-mono font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded">
                          {license.license_key}
                        </span>
                      </div>
                    </td>

                    {/* License Code */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Key className="h-5 w-5 text-cyan-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            <code className="bg-foreground/10 px-2 py-1 rounded text-xs">
                              {license.key_code.length > 20 ?
                                `${license.key_code.substring(0, 20)}...` :
                                license.key_code
                              }
                            </code>
                          </div>
                          {isExpiringSoon(license.expires_at) && (
                            <div className="text-xs text-amber-400 flex items-center mt-1">
                              <Warning className="h-3 w-3 mr-1" />
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
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
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
                        className="w-full text-left hover:bg-cyan-500/5 rounded p-1 transition-colors"
                        title="Click to assign/reassign license"
                      >
                        {license.assigned_to ? (
                          <div className="text-sm">
                            <div className="font-medium text-foreground">{license.assigned_to.full_name}</div>
                            <div className="text-foreground/60">{license.assigned_to.email}</div>
                          </div>
                        ) : (
                          <div className="flex items-center text-sm text-foreground/40">
                            <User className="h-4 w-4 mr-1" />
                            <span className="text-cyan-400 hover:text-cyan-300">Click to assign</span>
                          </div>
                        )}
                      </button>
                    </td>

                    {/* Created */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/60">
                      {formatDate(license.created_at)}
                    </td>

                    {/* Expires */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/60">
                      {license.expires_at ? (
                        <div className={isExpiringSoon(license.expires_at) ? 'text-amber-400' : ''}>
                          {formatDate(license.expires_at)}
                        </div>
                      ) : (
                        <span className="text-foreground/40">Never</span>
                      )}
                    </td>

                    {/* Usage */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {license.usage_stats ? (
                        <div className="space-y-1">
                          <div className="text-xs text-foreground/60">
                            Users: {license.usage_stats.users_count || 0}/{license.max_users}
                          </div>
                          <div className="w-full bg-cyan-500/10 rounded-full h-1.5">
                            <div
                              className="bg-cyan-500 h-1.5 rounded-full"
                              style={{ width: `${getUsagePercentage(license.usage_stats.users_count || 0, license.max_users)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-foreground/50">
                            {getUsagePercentage(license.usage_stats.users_count || 0, license.max_users)}%
                          </div>
                        </div>
                      ) : (
                        <span className="text-foreground/40">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-2">
                        {!license.assigned_to ? (
                          <button
                            onClick={() => setShowAssignModal(license.id)}
                            className="text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors"
                            title="Assign license"
                          >
                            Assign
                          </button>
                        ) : (
                          <button
                            onClick={() => unassignLicense(license.id)}
                            className="text-amber-400 hover:text-amber-300 text-xs font-medium transition-colors"
                            title="Unassign license"
                          >
                            Unassign
                          </button>
                        )}
                        {license.status === 'active' && (
                          <button
                            onClick={() => revokeLicense(license.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Revoke license"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteLicense(license.id, license.key_code || license.license_key || license.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete license"
                        >
                          <Trash className="h-4 w-4" />
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
            <Key className="mx-auto h-12 w-12 text-foreground/40" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">No license keys found</h3>
            <p className="mt-1 text-sm text-foreground/60">
              {searchTerm ? 'No licenses match your search criteria.' : 'Get started by creating your first license key.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link
                  href="/admin/licenses/create-enhanced"
                  className="btn-primary inline-flex items-center"
                >
                  <Plus className="-ml-1 mr-2 h-5 w-5" />
                  Create License
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}

      {/* Relationships Tab Content */}
      {activeTab === 'relationships' && (
        <>
          {/* Create Relationship Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowCreateRelationshipModal(true)}
              className="btn-primary inline-flex items-center"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Create Relationship
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            {relationshipsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-500"></div>
                <span className="ml-2 text-foreground/60">Loading relationships...</span>
              </div>
            ) : relationships.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-cyan-500/10">
                  <thead className="bg-cyan-500/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        License Key
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        License Details
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Subscription Key
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Subscription Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Relationship Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-500/10">
                    {relationships.map((rel) => (
                      <tr key={rel.id} className="hover:bg-cyan-500/5 transition-colors">
                        {/* License Key */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded">
                            {rel.license?.license_key || 'N/A'}
                          </span>
                        </td>

                        {/* License Details */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="font-medium text-foreground">
                              {rel.license?.license_type || 'Unknown'}
                            </div>
                            <div className="text-xs text-foreground/60">
                              Status: <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rel.license?.status || 'unknown')}`}>
                                {rel.license?.status || 'unknown'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Arrow/Link Icon */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mx-auto text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </td>

                        {/* Subscription Key */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded">
                            {rel.subscription?.subscription_key || 'N/A'}
                          </span>
                        </td>

                        {/* Subscription Details */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="font-medium text-foreground">
                              {rel.subscription?.subscription_category === 'native_app' ? 'Native App' : rel.subscription?.plugin_type || 'Plugin'}
                            </div>
                            <div className="text-xs text-foreground/60">
                              {rel.subscription?.subscription_type} - <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rel.subscription?.status || 'unknown')}`}>
                                {rel.subscription?.status || 'unknown'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* User */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="font-medium text-foreground">
                              {rel.license?.user_email || rel.subscription?.user_email || 'Unknown'}
                            </div>
                          </div>
                        </td>

                        {/* Relationship Type */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRelationshipTypeColor(rel.relationship_type)}`}>
                            {rel.relationship_type.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Created Date */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/60">
                          {formatDate(rel.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex justify-center space-x-3">
                            <button
                              onClick={() => setEditRelationship(rel)}
                              className="text-cyan-400 hover:text-cyan-300 transition-colors"
                              title="Edit relationship"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRelationship(rel.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Delete relationship"
                            >
                              <Trash className="h-4 w-4" />
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
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <h3 className="mt-2 text-sm font-semibold text-foreground">No relationships found</h3>
                <p className="mt-1 text-sm text-foreground/60">
                  No license-subscription relationships have been created yet.
                </p>
              </div>
            )}
          </div>

          {/* Standalone Licenses Section */}
          {!relationshipsLoading && standaloneLicenses.length > 0 && (
            <div className="glass-card overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-cyan-500/10 bg-amber-500/5">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <Key className="h-5 w-5 mr-2 text-amber-400" />
                  Standalone Licenses ({standaloneLicenses.length})
                </h3>
                <p className="text-sm text-foreground/60 mt-1">
                  Licenses that are not currently associated with any subscription
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-cyan-500/10">
                  <thead className="bg-cyan-500/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        License Key
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Assigned To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                        Expires
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-500/10">
                    {standaloneLicenses.map((license) => (
                      <tr key={license.id} className="hover:bg-cyan-500/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/admin/licenses/${license.id}/details`}
                            className="text-sm font-mono font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded transition-colors"
                          >
                            {license.key_code || license.license_key || 'N/A'}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-foreground">
                            {license.license_type || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(license.status)}`}>
                            {license.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {license.assigned_to ? (
                            <div className="text-sm">
                              <div className="font-medium text-foreground">{license.assigned_to.full_name || license.assigned_to.email}</div>
                              <div className="text-foreground/60">{license.assigned_to.email}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-foreground/40">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/60">
                          {formatDate(license.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/60">
                          {license.expires_at ? (
                            <span className={isExpiringSoon(license.expires_at) ? 'text-amber-400 font-semibold' : ''}>
                              {formatDate(license.expires_at)}
                            </span>
                          ) : (
                            <span className="text-foreground/40">Never</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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

      {/* Create Relationship Modal */}
      {showCreateRelationshipModal && (
        <CreateRelationshipModal
          onClose={() => setShowCreateRelationshipModal(false)}
          onCreated={() => {
            setShowCreateRelationshipModal(false)
            loadRelationships()
          }}
        />
      )}

      {/* Edit Relationship Modal */}
      {editRelationship && (
        <EditRelationshipModal
          relationship={editRelationship}
          onClose={() => setEditRelationship(null)}
          onUpdated={() => {
            setEditRelationship(null)
            loadRelationships()
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
                        <User className={`h-4 w-4 ${
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
                  <Warning className="h-5 w-5 text-yellow-400" />
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

// Create Relationship Modal Component
interface CreateRelationshipModalProps {
  onClose: () => void
  onCreated: () => void
}

function CreateRelationshipModal({ onClose, onCreated }: CreateRelationshipModalProps) {
  const [loading, setLoading] = useState(false)
  const [licenses, setLicenses] = useState<LicenseKey[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [formData, setFormData] = useState({
    license_id: '',
    subscription_id: '',
    relationship_type: 'standard' as 'standard' | 'trial_conversion' | 'upgrade' | 'addon',
    notes: ''
  })

  useEffect(() => {
    loadLicensesAndSubscriptions()
  }, [])

  const loadLicensesAndSubscriptions = async () => {
    try {
      setLoading(true)

      // Fetch all licenses
      const licensesRes = await fetch('/api/admin/licenses/list', { cache: 'no-store' })
      const licensesData = await licensesRes.json()
      if (licensesData.success) {
        setLicenses(licensesData.licenses || [])
      }

      // Fetch all subscriptions
      const subscriptionsRes = await fetch('/api/admin/subscriptions', { cache: 'no-store' })
      const subscriptionsData = await subscriptionsRes.json()
      if (subscriptionsData.success) {
        setSubscriptions(subscriptionsData.subscriptions || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.license_id || !formData.subscription_id) {
      alert('Please select both a license and a subscription')
      return
    }

    try {
      const response = await fetch('/api/admin/license-subscription-relationships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        alert('Relationship created successfully')
        onCreated()
      } else {
        const data = await response.json()
        alert(`Failed to create relationship: ${data.error}`)
      }
    } catch (error) {
      console.error('Error creating relationship:', error)
      alert('Failed to create relationship')
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-[600px] shadow-lg rounded-md bg-white">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Create License-Subscription Relationship</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* License Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.license_id}
                  onChange={(e) => setFormData({ ...formData, license_id: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a license...</option>
                  {licenses.map((license) => (
                    <option key={license.id} value={license.id}>
                      {license.license_key} - {license.key_code.substring(0, 20)}... ({license.license_type}) - {license.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subscription Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.subscription_id}
                  onChange={(e) => setFormData({ ...formData, subscription_id: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a subscription...</option>
                  {subscriptions.map((subscription) => (
                    <option key={subscription.id} value={subscription.id}>
                      {subscription.subscription_key} - {subscription.user_email} - {subscription.subscription_category === 'native_app' ? 'Native App' : subscription.plugin_type} ({subscription.subscription_type}) - {subscription.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Relationship Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship Type
                </label>
                <select
                  value={formData.relationship_type}
                  onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value as any })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="trial_conversion">Trial Conversion</option>
                  <option value="upgrade">Upgrade</option>
                  <option value="addon">Add-on</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Standard: Regular subscription-license pairing | Trial Conversion: User converted from trial to paid | Upgrade: Subscription tier upgrade | Add-on: Additional plugin or feature
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Add any notes about this relationship..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!formData.license_id || !formData.subscription_id}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Create Relationship
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Edit Relationship Modal Component
interface EditRelationshipModalProps {
  relationship: LicenseSubscriptionRelationship
  onClose: () => void
  onUpdated: () => void
}

function EditRelationshipModal({ relationship, onClose, onUpdated }: EditRelationshipModalProps) {
  const [formData, setFormData] = useState({
    relationship_type: relationship.relationship_type,
    notes: relationship.notes || ''
  })

  const handleUpdate = async () => {
    try {
      const response = await fetch('/api/admin/license-subscription-relationships', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          relationship_id: relationship.id,
          relationship_type: formData.relationship_type,
          notes: formData.notes
        })
      })

      if (response.ok) {
        alert('Relationship updated successfully')
        onUpdated()
      } else {
        const data = await response.json()
        alert(`Failed to update relationship: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating relationship:', error)
      alert('Failed to update relationship')
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-[600px] shadow-lg rounded-md bg-white">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Edit Relationship</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="bg-gray-50 p-3 rounded-md mb-4">
            <div className="text-sm">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-mono font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
                  {relationship.license?.license_key || 'N/A'}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <span className="font-mono font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {relationship.subscription?.subscription_key || 'N/A'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                License: {relationship.license?.license_type} | Subscription: {relationship.subscription?.subscription_category === 'native_app' ? 'Native App' : relationship.subscription?.plugin_type}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Relationship Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relationship Type
              </label>
              <select
                value={formData.relationship_type}
                onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value as any })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="standard">Standard</option>
                <option value="trial_conversion">Trial Conversion</option>
                <option value="upgrade">Upgrade</option>
                <option value="addon">Add-on</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Standard: Regular subscription-license pairing | Trial Conversion: User converted from trial to paid | Upgrade: Subscription tier upgrade | Add-on: Additional plugin or feature
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Add any notes about this relationship..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Update Relationship
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
