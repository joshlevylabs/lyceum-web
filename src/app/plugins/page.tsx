'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import {
  PuzzlePiece,
  MagnifyingGlass,
  Star,
  CreditCard,
  Check,
  Clock,
  ShoppingCart,
  Sparkle
} from '@phosphor-icons/react'

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

  // Map slug to plugin_type for subscription management
  const getPluginType = (slug: string): string => {
    const pluginTypeMap: Record<string, string> = {
      'klippel-qc': 'klippel_qc',
      'apx500': 'apx500',
      'preen-psu': 'preen_psu',
      'keysight-daq': 'keysight_daq',
      'kwikwai-k110': 'kwikwai',
      'granite-river-labs-pd': 'grl_pd',
      'sifos-poe': 'sifos_poe',
      'time-machines-grandmaster': 'time_machines'
    }
    return pluginTypeMap[slug] || slug
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
          plugin_type: getPluginType(plugin.slug)
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
        stars.push(<Star key={i} weight="fill" className="h-4 w-4 text-yellow-400" />)
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} weight="fill" className="h-4 w-4 text-yellow-400 opacity-50" />)
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />)
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
          <h1 className="text-2xl font-bold leading-7 text-foreground sm:text-3xl sm:truncate">
            Plugins Store
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Discover and purchase plugins to extend your Lyceum experience
          </p>
        </div>

        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button
            onClick={() => router.push('/plugins/my-licenses')}
            className="btn-ghost inline-flex items-center"
          >
            <PuzzlePiece className="-ml-1 mr-2 h-5 w-5" weight="duotone" />
            My Licenses
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/40 h-5 w-5" weight="regular" />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-foreground placeholder-foreground/40"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-xl glass-input text-foreground"
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
            className="px-3 py-2 rounded-xl glass-input text-foreground"
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
              className="rounded border-cyan-500/30 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="ml-2 text-sm text-foreground">Featured only</span>
          </label>
        </div>
      </div>

      {/* Plugins Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-500"></div>
          <span className="ml-2 text-foreground/60">Loading plugins...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <PuzzlePiece className="mx-auto h-12 w-12 text-red-400" weight="duotone" />
          <h3 className="mt-2 text-sm font-semibold text-foreground">Error loading plugins</h3>
          <p className="mt-1 text-sm text-foreground/60">{error}</p>
          <div className="mt-6">
            <button
              onClick={loadPlugins}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : filteredPlugins.length === 0 ? (
        <div className="text-center py-12 glass-card">
          <PuzzlePiece className="mx-auto h-12 w-12 text-foreground/40" weight="duotone" />
          <h3 className="mt-2 text-sm font-semibold text-foreground">No plugins found</h3>
          <p className="mt-1 text-sm text-foreground/60">
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
                className="glass-card overflow-hidden cursor-pointer relative"
              >
                {/* Featured Badge */}
                {plugin.is_featured && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Sparkle className="h-3 w-3 mr-1" weight="fill" />
                      Featured
                    </span>
                  </div>
                )}

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-foreground hover:text-cyan-400 transition-colors">
                        {plugin.display_name || plugin.name}
                      </h3>
                      <p className="text-sm text-foreground/60 capitalize">
                        {plugin.category}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-foreground/60 mb-4 line-clamp-3">
                    {plugin.short_description}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center mb-4">
                    <div className="flex items-center">
                      {renderRatingStars(plugin.average_rating)}
                    </div>
                    <span className="ml-2 text-sm text-foreground/60">
                      {plugin.average_rating.toFixed(1)} ({plugin.total_reviews} reviews)
                    </span>
                  </div>

                  {/* Features */}
                  {plugin.features.length > 0 && (
                    <ul className="space-y-1 mb-4">
                      {plugin.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm text-foreground/60">
                          <Check className="h-4 w-4 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" weight="bold" />
                          <span className="line-clamp-1">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Publisher */}
                  <p className="text-xs text-foreground/40 mb-4">
                    by Lyceum Audio Labs
                  </p>

                  {/* Downloads */}
                  <p className="text-xs text-foreground/40 mb-4">
                    {plugin.total_downloads.toLocaleString()} downloads
                  </p>

                  {/* Actions */}
                  <div className="pt-4 border-t border-cyan-500/10">

                    {hasLicense ? (
                      <div className="flex items-center justify-center p-3 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                        <Check className="h-5 w-5 text-emerald-400 mr-2" weight="bold" />
                        <span className="text-sm font-medium text-emerald-400">
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
                            className="btn-primary w-full"
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
                            className="btn-ghost w-full"
                          >
                            <Clock className="h-5 w-5 mr-2" weight="regular" />
                            {plugin.trial_duration_days || plugin.free_trial_days}-Day Free Trial
                          </button>
                        )}

                        {plugin.pricing_model === 'free' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleActivateTrial(plugin)
                            }}
                            className="btn-primary w-full"
                          >
                            <Check className="h-5 w-5 mr-2" weight="bold" />
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
