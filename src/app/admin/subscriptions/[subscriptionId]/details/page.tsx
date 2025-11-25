'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  CreditCardIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  CurrencyDollarIcon,
  LinkIcon
} from '@heroicons/react/24/outline'

interface SubscriptionDetails {
  id: string
  subscription_key: string
  user_id: string
  user_email?: string
  user_name?: string
  subscription_category: 'native_app' | 'plugin'
  subscription_type: 'trial' | 'paid'
  plugin_type?: 'klippel_qc' | 'apx500' | null
  status: 'active' | 'expired' | 'cancelled'
  stripe_session_id?: string
  stripe_customer_id?: string
  stripe_payment_intent_id?: string
  stripe_setup_intent_id?: string
  stripe_subscription_id?: string
  amount_paid_cents?: number
  currency?: string
  trial_start_date?: string
  trial_end_date?: string
  cancelled_at?: string
  metadata?: any
  created_at: string
  updated_at: string
}

interface Relationship {
  id: string
  license_id: string
  subscription_id: string
  relationship_type: string
  notes?: string
  created_at: string
  license?: {
    license_key: string
    license_type: string
    status: string
  }
}

export default function SubscriptionDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const subscriptionId = params.subscriptionId as string

  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null)
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSubscriptionDetails()
    loadRelationships()
  }, [subscriptionId])

  const loadSubscriptionDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error('Failed to load subscription details')
      }

      const data = await response.json()
      setSubscription(data.subscription)
    } catch (err) {
      console.error('Error loading subscription:', err)
      setError(err instanceof Error ? err.message : 'Failed to load subscription')
    } finally {
      setLoading(false)
    }
  }

  const loadRelationships = async () => {
    try {
      const response = await fetch('/api/admin/license-subscription-relationships', {
        cache: 'no-store'
      })

      if (response.ok) {
        const data = await response.json()
        const subRelationships = data.relationships.filter(
          (rel: Relationship) => rel.subscription_id === subscriptionId
        )
        setRelationships(subRelationships)
      }
    } catch (err) {
      console.error('Error loading relationships:', err)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (cents?: number, currency?: string) => {
    if (!cents) return 'Free'
    return `$${(cents / 100).toFixed(2)} ${(currency || 'USD').toUpperCase()}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'expired': return <ClockIcon className="w-5 h-5 text-red-500" />
      case 'cancelled': return <XCircleIcon className="w-5 h-5 text-yellow-600" />
      default: return <ExclamationTriangleIcon className="w-5 h-5 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !subscription) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-2 text-sm text-red-700">{error || 'Subscription not found'}</p>
              <Link
                href="/admin/licenses"
                className="mt-3 inline-flex items-center text-sm font-medium text-red-600 hover:text-red-500"
              >
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back to Subscriptions
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/licenses"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Subscriptions & Licenses
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <CreditCardIcon className="h-8 w-8 mr-3 text-blue-600" />
              Subscription Details
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage subscription information
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              {subscription.subscription_key}
            </span>
            {getStatusIcon(subscription.status)}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
              {subscription.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Subscription Information
              </h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Subscription Key</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                    {subscription.subscription_key}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Category</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      subscription.subscription_category === 'native_app'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {subscription.subscription_category === 'native_app' ? 'Native App' : subscription.plugin_type || 'Plugin'}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Subscription Type</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      subscription.subscription_type === 'trial'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {subscription.subscription_type}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                      {subscription.status}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(subscription.created_at)}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(subscription.updated_at)}</dd>
                </div>

                {subscription.cancelled_at && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Cancelled At</dt>
                    <dd className="mt-1 text-sm text-red-600">{formatDate(subscription.cancelled_at)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Trial Information */}
          {subscription.trial_start_date && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Trial Information
                </h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Trial Start</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(subscription.trial_start_date)}</dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500">Trial End</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(subscription.trial_end_date)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* Payment Information */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-600" />
                Payment Information
              </h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Amount Paid</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {formatCurrency(subscription.amount_paid_cents, subscription.currency)}
                  </dd>
                </div>

                {subscription.stripe_customer_id && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Stripe Customer ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono text-xs">
                      {subscription.stripe_customer_id}
                    </dd>
                  </div>
                )}

                {subscription.stripe_subscription_id && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Stripe Subscription ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono text-xs">
                      {subscription.stripe_subscription_id}
                    </dd>
                  </div>
                )}

                {subscription.stripe_session_id && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Stripe Session ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono text-xs">
                      {subscription.stripe_session_id}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Associated Licenses */}
          {relationships.length > 0 && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                  <LinkIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Associated Licenses
                </h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="space-y-3">
                  {relationships.map((rel) => (
                    <div
                      key={rel.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <KeyIcon className="h-5 w-5 text-purple-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {rel.license?.license_key || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {rel.license?.license_type} • {rel.relationship_type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/admin/licenses/${rel.license_id}/details`}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View License →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Information */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-gray-600" />
                User Information
              </h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{subscription.user_email || 'Unknown'}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{subscription.user_name || 'Unknown'}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">User ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono text-xs break-all">
                    {subscription.user_id}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Actions
              </h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/admin/users/${subscription.user_id}`)}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  View User Profile
                </button>

                {subscription.stripe_customer_id && (
                  <a
                    href={`https://dashboard.stripe.com/customers/${subscription.stripe_customer_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    View in Stripe
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
