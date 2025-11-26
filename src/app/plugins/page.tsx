'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import {
  PuzzlePieceIcon,
  MagnifyingGlassIcon,
  StarIcon,
  CreditCardIcon,
  CheckIcon,
  ClockIcon,
  ShoppingCartIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface Plugin {
  id: string
  name: string
  slug: string
  display_name: string
  short_description: string
  full_description?: string
  category: string
  principle?: string
  current_version: string
  base_price: number
  currency: string
  pricing_model: 'one_time' | 'subscription_monthly' | 'subscription_annual' | 'free' | 'enterprise'
  monthly_price?: number
  annual_price?: number
  has_free_trial: boolean
  trial_duration_days: number
  trial_requires_payment: boolean
  features: string[]
  screenshots: Array<{url: string, caption?: string}>
  average_rating: number
  total_reviews: number
  total_downloads: number
  is_featured: boolean
  publisher_name?: string
  tags: string[]
}

interface UserLicense {
  plugin_id: string
  license_type: string
  status: string
  expires_at?: string
  is_trial: boolean
}

export default function PluginsStorePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [userLicenses, setUserLicenses] = useState<UserLicense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterPrinciple, setFilterPrinciple] = useState<string>('all')
  const [filterPricing, setFilterPricing] = useState<string>('all')
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false)
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false)

  // Helper function to get auth headers
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    }
  }

  useEffect(() => {
    if (user) {
      loadPlugins()
      loadUserLicenses()
      checkPaymentMethod()
    }
  }, [user])

  const loadPlugins = async () => {
    try {
      setLoading(true)
      setError(null)

      const headers = await getAuthHeaders()
      const response = await fetch('/api/plugins', { headers })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load plugins')
      }

      if (data.success) {
        setPlugins(data.plugins || [])
      } else {
        throw new Error(data.error || 'Failed to load plugins')
      }
    } catch (err: any) {
      console.error('Error loading plugins:', err)
      setError(err.message || 'Failed to load plugins')
      setPlugins([])
    } finally {
      setLoading(false)
    }
  }

  const loadUserLicenses = async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch('/api/plugins/licenses', { headers })
      const data = await response.json()

      if (response.ok && data.success) {
        setUserLicenses(data.licenses || [])
      }
    } catch (err) {
      console.error('Error loading user licenses:', err)
    }
  }

  const checkPaymentMethod = async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch('/api/payment-methods', { headers })
      const data = await response.json()

      if (response.ok && data.success) {
        setHasPaymentMethod(data.hasPaymentMethod || (data.paymentMethods || []).length > 0)
      }
    } catch (err) {
      console.error('Error checking payment method:', err)
    }
  }

  const getUserLicense = (pluginId: string) => {
    return userLicenses.find(l => l.plugin_id === pluginId && l.status === 'active')
  }

  const hasActiveLicense = (pluginId: string) => {
    return !!getUserLicense(pluginId)
  }

  const handleActivateTrial = async (plugin: Plugin) => {
    try {
      // Create Stripe checkout session for plugin trial
      const headers = await getAuthHeaders()
      const response = await fetch('/api/stripe/create-plugin-trial-checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plugin_slug: plugin.slug,
          plugin_type: plugin.slug === 'klippel-qc' ? 'klippel_qc' : plugin.slug
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect directly to Stripe
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err: any) {
      console.error('Error starting trial:', err)
      alert(err.message || 'Failed to start trial')
    }
  }

  const handlePurchase = async (plugin: Plugin) => {
    if (!hasPaymentMethod) {
      alert('Please add a payment method to your profile before making a purchase.')
      router.push('/settings?tab=billing')
      return
    }

    // TODO: Implement purchase flow with payment processor
    alert(`Purchase flow for ${plugin.display_name} coming soon!`)
  }

  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = !searchTerm ||
      plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.short_description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = filterCategory === 'all' || plugin.category === filterCategory

    const matchesPrinciple = filterPrinciple === 'all' || plugin.principle === filterPrinciple

    const matchesPricing = filterPricing === 'all' || plugin.pricing_model === filterPricing

    const matchesFeatured = !showFeaturedOnly || plugin.is_featured

    return matchesSearch && matchesCategory && matchesPrinciple && matchesPricing && matchesFeatured
  })

  const categories = Array.from(new Set(plugins.map(p => p.category)))
  const principles = Array.from(new Set(plugins.map(p => p.principle).filter(Boolean)))

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price)
  }

  const getPricingLabel = (plugin: Plugin) => {
    if (plugin.pricing_model === 'free') {
      return 'Free'
    } else if (plugin.pricing_model === 'enterprise') {
      return 'Contact Sales'
    } else if (plugin.pricing_model === 'subscription_monthly') {
      return `${formatPrice(plugin.monthly_price || plugin.base_price || 0)}/mo`
    } else if (plugin.pricing_model === 'subscription_annual') {
      return `${formatPrice(plugin.annual_price || plugin.base_price || 0)}/yr`
    } else {
      return formatPrice(plugin.base_price)
    }
  }

  const renderRatingStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<StarIconSolid key={i} className="h-4 w-4 text-yellow-400" />)
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<StarIconSolid key={i} className="h-4 w-4 text-yellow-400 opacity-50" />)
      } else {
        stars.push(<StarIcon key={i} className="h-4 w-4 text-gray-300" />)
      }
    }
    return stars
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            Plugins Store
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Discover and purchase plugins to extend your Lyceum experience
          </p>
        </div>

        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button
            onClick={() => router.push('/plugins/my-licenses')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <PuzzlePieceIcon className="-ml-1 mr-2 h-5 w-5" />
            My Licenses
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat} className="capitalize">{cat}</option>
            ))}
          </select>

          {/* Principle Filter */}
          <select
            value={filterPrinciple}
            onChange={(e) => setFilterPrinciple(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Principles</option>
            {principles.map(principle => (
              <option key={principle} value={principle} className="capitalize">{principle}</option>
            ))}
          </select>

          {/* Featured Toggle */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showFeaturedOnly}
              onChange={(e) => setShowFeaturedOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Featured only</span>
          </label>
        </div>
      </div>

      {/* Plugins Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading plugins...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <PuzzlePieceIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">Error loading plugins</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <div className="mt-6">
            <button
              onClick={loadPlugins}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : filteredPlugins.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <PuzzlePieceIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No plugins found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {filteredPlugins.map((plugin) => {
            const userLicense = getUserLicense(plugin.id)
            const hasLicense = !!userLicense

            return (
              <div
                key={plugin.id}
                onClick={() => router.push(`/plugins/${plugin.slug}`)}
                className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-lg transition-all cursor-pointer relative"
              >
                {/* Featured Badge */}
                {plugin.is_featured && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <SparklesIcon className="h-3 w-3 mr-1" />
                      Featured
                    </span>
                  </div>
                )}

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                        {plugin.display_name || plugin.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {plugin.category}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                    {plugin.short_description}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center mb-4">
                    <div className="flex items-center">
                      {renderRatingStars(plugin.average_rating)}
                    </div>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      {plugin.average_rating.toFixed(1)} ({plugin.total_reviews} reviews)
                    </span>
                  </div>

                  {/* Features */}
                  {plugin.features.length > 0 && (
                    <ul className="space-y-1 mb-4">
                      {plugin.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                          <CheckIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Publisher */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    by Lyceum Audio Labs
                  </p>

                  {/* Downloads */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    {plugin.total_downloads.toLocaleString()} downloads
                  </p>

                  {/* Actions */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">

                    {hasLicense ? (
                      <div className="flex items-center justify-center p-3 bg-green-50 dark:bg-green-900 rounded-md">
                        <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          {userLicense?.is_trial ? 'Trial Active' : 'Licensed'}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {plugin.pricing_model !== 'free' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/plugins/${plugin.slug}`)
                            }}
                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                          >
                            View Details
                          </button>
                        )}

                        {plugin.has_free_trial && plugin.free_trial_days > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleActivateTrial(plugin)
                            }}
                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-blue-600 rounded-md text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 dark:bg-gray-700 dark:text-blue-400 dark:hover:bg-gray-600"
                          >
                            <ClockIcon className="h-5 w-5 mr-2" />
                            {plugin.trial_duration_days || plugin.free_trial_days}-Day Free Trial
                          </button>
                        )}

                        {plugin.pricing_model === 'free' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleActivateTrial(plugin)
                            }}
                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                          >
                            <CheckIcon className="h-5 w-5 mr-2" />
                            Install Free
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>
    </DashboardLayout>
  )
}
