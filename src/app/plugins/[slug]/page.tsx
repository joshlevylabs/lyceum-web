'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import {
  PuzzlePiece,
  ArrowLeft,
  Check,
  Star,
  ShoppingCart,
  Envelope,
  Clock,
  ChartBar,
  CloudArrowDown,
  X,
  Warning,
  CheckCircle,
  ArrowSquareOut,
  Cpu
} from '@phosphor-icons/react'
import { getPluginHardware, HardwareDevice } from '@/data/plugin-hardware'

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
  pricing_model: 'enterprise' | 'one_time' | 'subscription_monthly' | 'subscription_annual' | 'free'
  monthly_price?: number
  annual_price?: number
  has_free_trial: boolean
  trial_duration_days: number
  trial_requires_payment: boolean
  features: string[]
  screenshots: Array<{url: string, caption?: string}>
  publisher_name?: string
  total_downloads: number
  average_rating: number
  total_reviews: number
  is_featured: boolean
  installation_config?: Record<string, any>
}

interface Review {
  id: string
  rating: number
  title: string
  review_text: string
  is_verified_purchase: boolean
  helpful_count: number
  not_helpful_count: number
  created_at: string
  updated_at: string
  user: {
    full_name?: string
    email?: string
  }
}

export default function PluginDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const slug = params.slug as string

  const [plugin, setPlugin] = useState<Plugin | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userHasLicense, setUserHasLicense] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [newReview, setNewReview] = useState({ rating: 5, title: '', review_text: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [checkingSubscription, setCheckingSubscription] = useState(true)
  const [hasValidLicense, setHasValidLicense] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [generatingLicense, setGeneratingLicense] = useState(false)
  const [hasUsedTrial, setHasUsedTrial] = useState(false)

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [modalData, setModalData] = useState<{
    licenseType?: 'trial' | 'paid'
    licenseKey?: string
    errorMessage?: string
    isExisting?: boolean
  }>({})

  // Helper function to get auth headers
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    }
  }

  // Map of plugin slugs to their plugin_type identifiers for subscription management
  const SUBSCRIPTION_PLUGIN_SLUGS = [
    'klippel-qc', 'apx500', 'preen-psu', 'keysight-daq',
    'kwikwai-k110', 'granite-river-labs-pd', 'sifos-poe', 'time-machines-grandmaster'
  ]

  useEffect(() => {
    if (user && slug) {
      loadPluginDetails().then(() => {
        // Check subscription for all subscription-based plugins
        if (SUBSCRIPTION_PLUGIN_SLUGS.includes(slug as string)) {
          checkPluginSubscription()
        } else {
          setCheckingSubscription(false)
          setHasValidLicense(true)
        }
      })
      checkUserLicense()
      loadReviews()
    }
  }, [user, slug])

  const loadPluginDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const headers = await getAuthHeaders()
      const response = await fetch(`/api/plugins?slug=${slug}`, { headers })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load plugin')
      }

      if (data.success && data.plugins && data.plugins.length > 0) {
        setPlugin(data.plugins[0])
      } else {
        throw new Error('Plugin not found')
      }
    } catch (err: any) {
      console.error('Error loading plugin:', err)
      setError(err.message || 'Failed to load plugin')
    } finally {
      setLoading(false)
    }
  }

  const checkPluginSubscription = async () => {
    try {
      setCheckingSubscription(true)

      // Map slug to plugin_type for subscription management
      const pluginTypeMap: { [key: string]: string } = {
        'klippel-qc': 'klippel_qc',
        'apx500': 'apx500',
        'preen-psu': 'preen_psu',
        'keysight-daq': 'keysight_daq',
        'kwikwai-k110': 'kwikwai',
        'granite-river-labs-pd': 'grl_pd',
        'sifos-poe': 'sifos_poe',
        'time-machines-grandmaster': 'time_machines'
      }

      const plugin_type = pluginTypeMap[slug]
      if (!plugin_type) {
        // Not a subscription-based plugin, skip check
        setCheckingSubscription(false)
        setHasValidLicense(true)
        return
      }

      const headers = await getAuthHeaders()
      const response = await fetch(`/api/subscriptions/plugin?plugin_type=${plugin_type}`, { headers })
      const data = await response.json()

      if (response.ok && data.success) {
        if (data.hasValidLicense) {
          setHasValidLicense(true)
          setSubscription(data.subscription)
          setHasUsedTrial(true) // If they have a valid license, they've used their trial
        } else {
          setHasValidLicense(false)
          setSubscription(data.subscription)
          // Check if they have any previous subscription (including expired trials)
          setHasUsedTrial(!!data.subscription)
          // Don't redirect - let the user see the plugin details page with subscribe buttons
        }
      } else {
        // No subscription found - show the plugin details page with subscribe options
        setHasValidLicense(false)
        setHasUsedTrial(false)
      }
    } catch (err) {
      console.error('Error checking plugin subscription:', err)
      setHasValidLicense(false)
      // Don't redirect on error - show the plugin details page
    } finally {
      setCheckingSubscription(false)
    }
  }

  const checkUserLicense = async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch('/api/plugins/licenses', { headers })
      const data = await response.json()

      if (response.ok && data.success) {
        // Check if user has an active license for this plugin
        const hasLicense = data.licenses?.some((license: any) =>
          license.plugin?.slug === slug &&
          (license.status === 'active' || license.status === 'trial')
        )
        setUserHasLicense(hasLicense)
      }
    } catch (err) {
      console.error('Error checking license:', err)
    }
  }

  const loadReviews = async () => {
    try {
      setReviewsLoading(true)
      const response = await fetch(`/api/plugins/${slug}/reviews`)
      const data = await response.json()

      if (response.ok && data.success) {
        setReviews(data.reviews || [])
      }
    } catch (err) {
      console.error('Error loading reviews:', err)
    } finally {
      setReviewsLoading(false)
    }
  }

  const submitReview = async () => {
    if (!newReview.title.trim() || !newReview.review_text.trim()) {
      alert('Please fill in all fields')
      return
    }

    try {
      setSubmittingReview(true)
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/plugins/${slug}/reviews`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newReview)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review')
      }

      alert('Review submitted successfully!')
      setShowReviewForm(false)
      setNewReview({ rating: 5, title: '', review_text: '' })
      loadReviews() // Reload reviews
    } catch (err: any) {
      console.error('Error submitting review:', err)
      alert(err.message || 'Failed to submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  // Check if user has payment method
  const checkPaymentMethod = async (): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/user-billing/payment-methods?user_id=${user?.id}`, {
        headers
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      return data.paymentMethods && data.paymentMethods.length > 0
    } catch (error) {
      console.error('Error checking payment method:', error)
      return false
    }
  }

  // Generate plugin license (paid or trial)
  const generatePluginLicense = async (licenseType: 'trial' | 'paid') => {
    if (!user || !slug) return

    setGeneratingLicense(true)
    setShowConfirmModal(false)

    try {
      // Check for payment method (required for paid licenses)
      if (licenseType === 'paid') {
        const hasPaymentMethod = await checkPaymentMethod()
        if (!hasPaymentMethod) {
          setModalData({
            errorMessage: 'Please add a payment method before purchasing a paid license. Go to Settings > Payment to add a payment method.'
          })
          setShowErrorModal(true)
          setGeneratingLicense(false)
          return
        }
      }

      // Map slug to plugin_type
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
      const pluginType = pluginTypeMap[slug as string] || slug

      const headers = await getAuthHeaders()
      const response = await fetch('/api/licenses/generate-plugin', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plugin_type: pluginType,
          license_type: licenseType
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate license')
      }

      // Show success modal
      setModalData({
        licenseType,
        licenseKey: data.license.key_code,
        isExisting: !data.is_new
      })
      setShowSuccessModal(true)

      // Update state to reflect new license
      setHasValidLicense(true)
      setUserHasLicense(true)

      // Reload subscription status
      checkPluginSubscription()

    } catch (err: any) {
      console.error('Error generating license:', err)
      setModalData({
        errorMessage: err.message || 'Failed to generate license'
      })
      setShowErrorModal(true)
    } finally {
      setGeneratingLicense(false)
    }
  }

  const handleStartTrial = async () => {
    try {
      // Map slug to plugin_type
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
      const pluginType = pluginTypeMap[slug as string] || slug

      // Create Stripe checkout session for plugin trial
      const headers = await getAuthHeaders()
      const response = await fetch('/api/stripe/create-plugin-trial-checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plugin_slug: slug,
          plugin_type: pluginType
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
      setModalData({
        errorMessage: err.message || 'Failed to start trial'
      })
      setShowErrorModal(true)
    }
  }

  const handleSubscribeNow = async () => {
    try {
      // Redirect to Stripe Customer Portal for subscription management
      const headers = await getAuthHeaders()
      const response = await fetch('/api/stripe/create-billing-portal-session', {
        method: 'POST',
        headers
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create billing portal session')
      }

      // Redirect to Stripe portal
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No portal URL returned')
      }
    } catch (err: any) {
      console.error('Error redirecting to billing portal:', err)
      setModalData({
        errorMessage: err.message || 'Failed to open billing portal'
      })
      setShowErrorModal(true)
    }
  }

  const handleRequestLicense = () => {
    // For enterprise plugins, open email to contact sales
    if (plugin?.pricing_model === 'enterprise') {
      const subject = encodeURIComponent(`License Request: ${plugin.display_name}`)
      const body = encodeURIComponent(`Hello,\n\nI would like to request a license for ${plugin.display_name}.\n\nUser Email: ${user?.email}\nPlugin: ${plugin.display_name} (${plugin.slug})\nVersion: ${plugin.current_version}\n\nPlease provide pricing and licensing information.\n\nThank you!`)
      window.location.href = `mailto:sales@lyceum.com?subject=${subject}&body=${body}`
    } else if (SUBSCRIPTION_PLUGIN_SLUGS.includes(slug as string)) {
      // Redirect to Stripe portal for subscription management
      handleSubscribeNow()
    } else {
      // For other subscription-based plugins, go to subscribe page
      router.push(`/plugins/${slug}/subscribe`)
    }
  }

  const confirmLicenseGeneration = () => {
    if (modalData.licenseType) {
      generatePluginLicense(modalData.licenseType)
    }
  }

  const renderRatingStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} weight="fill" className="h-5 w-5 text-yellow-400" />)
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} weight="fill" className="h-5 w-5 text-yellow-400 opacity-50" />)
      } else {
        stars.push(<Star key={i} weight="regular" className="h-5 w-5 text-foreground/30" />)
      }
    }
    return stars
  }

  const renderSubscriptionBadge = () => {
    if (!subscription || !SUBSCRIPTION_PLUGIN_SLUGS.includes(slug as string)) {
      return null
    }

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }

    const isTrial = subscription.subscription_type === 'trial'
    const isCancelled = subscription.cancel_at_period_end === true
    const isPaid = subscription.subscription_type === 'paid'

    if (isTrial && !isCancelled) {
      return (
        <div className="inline-flex items-center px-4 py-2 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-sm font-medium">
          <Clock className="h-4 w-4 mr-2" weight="regular" />
          Trial Active • Expires {formatDate(subscription.current_period_end)}
        </div>
      )
    }

    if (isTrial && isCancelled) {
      return (
        <div className="inline-flex items-center px-4 py-2 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-sm font-medium">
          <Clock className="h-4 w-4 mr-2" weight="regular" />
          Trial (Cancelled) • Valid until {formatDate(subscription.current_period_end)}
        </div>
      )
    }

    if (isPaid) {
      return (
        <div className="inline-flex items-center px-4 py-2 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium">
          <Check className="h-4 w-4 mr-2" weight="bold" />
          Paid Subscription Active
        </div>
      )
    }

    return null
  }

  const renderPricingInfo = () => {
    if (!plugin) return null

    if (plugin.pricing_model === 'enterprise') {
      return (
        <div className="text-center p-6 glass-card">
          <p className="text-2xl font-bold text-foreground mb-2">
            Enterprise Pricing
          </p>
          <p className="text-sm text-foreground/60">
            Contact sales for custom pricing and licensing options
          </p>
        </div>
      )
    }

    if (plugin.pricing_model === 'free') {
      return (
        <div className="text-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-2xl font-bold text-emerald-400 mb-2">
            Free
          </p>
          <p className="text-sm text-emerald-400/80">
            No payment required
          </p>
        </div>
      )
    }

    if (plugin.pricing_model === 'subscription_monthly') {
      return (
        <div className="text-center p-6 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
          <p className="text-3xl font-bold text-cyan-400 mb-2">
            ${(plugin.monthly_price || plugin.base_price).toFixed(2)}
            <span className="text-lg font-normal">/month</span>
          </p>
          <p className="text-sm text-cyan-400/80">
            per user
          </p>
        </div>
      )
    }

    return (
      <div className="text-center p-6 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
        <p className="text-3xl font-bold text-cyan-400 mb-2">
          ${plugin.base_price.toFixed(2)}
        </p>
        <p className="text-sm text-cyan-400/80">
          {plugin.pricing_model === 'one_time' && 'One-time purchase'}
          {plugin.pricing_model === 'subscription_annual' && plugin.annual_price && '/year'}
        </p>
      </div>
    )
  }

  if (loading || checkingSubscription) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-500"></div>
          <span className="ml-2 text-foreground/60">
            {loading ? 'Loading plugin details...' : 'Checking subscription status...'}
          </span>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !plugin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <PuzzlePiece className="mx-auto h-12 w-12 text-red-400" weight="duotone" />
          <h3 className="mt-2 text-sm font-semibold text-foreground">Plugin not found</h3>
          <p className="mt-1 text-sm text-foreground/60">{error}</p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/plugins')}
              className="btn-primary inline-flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" weight="regular" />
              Back to Plugins Store
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <button
          onClick={() => router.push('/plugins')}
          className="inline-flex items-center text-sm text-foreground/60 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" weight="regular" />
          Back to Plugins Store
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="glass-card p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl font-bold text-foreground mb-3">
                    {plugin.display_name}
                  </h1>
                  <p className="text-lg text-foreground/60 mb-4">
                    {plugin.short_description}
                  </p>

                  {/* Subscription Badge */}
                  <div className="mb-4">
                    {renderSubscriptionBadge()}
                  </div>

                  {/* Metadata with s */}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {/* Rating */}
                    <div className="flex items-center text-foreground">
                      <div className="flex items-center">
                        {renderRatingStars(plugin.average_rating)}
                      </div>
                      <span className="ml-2 font-medium">
                        {plugin.average_rating.toFixed(1)}
                      </span>
                    </div>

                    {/* Reviews */}
                    <div className="flex items-center text-foreground/60">
                      <ChartBar className="h-4 w-4 mr-1.5" weight="regular" />
                      <span className="font-medium">{reviews.length} reviews</span>
                    </div>

                    {/* Downloads */}
                    <div className="flex items-center text-foreground/60">
                      <CloudArrowDown className="h-4 w-4 mr-1.5" weight="regular" />
                      <span className="font-medium">{plugin.total_downloads.toLocaleString()} downloads</span>
                    </div>

                    {/* Category Badge */}
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 capitalize">
                      {plugin.category}
                    </span>

                    {/* Principle Badge */}
                    {plugin.principle && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 capitalize">
                        {plugin.principle}
                      </span>
                    )}

                    {/* Featured Badge */}
                    {plugin.is_featured && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Publisher */}
                  <p className="mt-4 text-sm text-foreground/40">
                    by Lyceum Audio Labs
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                About this plugin
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-foreground/60 whitespace-pre-line">
                  {plugin.full_description || plugin.short_description}
                </p>
              </div>
            </div>

            {/* Features */}
            {plugin.features && plugin.features.length > 0 && (
              <div className="glass-card p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Features
                </h2>
                <ul className="space-y-3">
                  {plugin.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className="h-5 w-5 text-emerald-400 mr-3 mt-0.5 flex-shrink-0" weight="bold" />
                      <span className="text-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Compatible Hardware Section */}
            {(() => {
              const hardwareDevices = getPluginHardware(slug)
              if (hardwareDevices.length === 0) return null

              return (
                <div className="glass-card p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Cpu className="h-6 w-6 text-cyan-400" weight="duotone" />
                    <h2 className="text-xl font-semibold text-foreground">
                      Compatible Hardware
                    </h2>
                  </div>
                  <p className="text-foreground/60 mb-6">
                    This plugin integrates with the following hardware devices for seamless control and data acquisition.
                  </p>
                  <div className="space-y-6">
                    {hardwareDevices.map((device, idx) => (
                      <div
                        key={idx}
                        className="border border-cyan-500/20 rounded-lg overflow-hidden bg-gradient-to-br from-cyan-500/5 to-transparent"
                      >
                        <div className="p-6">
                          <div className="flex flex-col md:flex-row gap-6">
                            {/* Hardware Image Placeholder */}
                            <div className="flex-shrink-0">
                              <div className="w-full md:w-48 h-32 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center border border-gray-700">
                                <Cpu className="h-16 w-16 text-cyan-500/40" weight="duotone" />
                              </div>
                            </div>

                            {/* Hardware Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div>
                                  <h3 className="text-lg font-semibold text-foreground">
                                    {device.name}
                                  </h3>
                                  <p className="text-sm text-cyan-400">
                                    {device.manufacturer} • {device.model}
                                  </p>
                                </div>
                                <a
                                  href={device.websiteUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg transition-colors flex-shrink-0"
                                >
                                  Visit Website
                                  <ArrowSquareOut className="h-4 w-4" weight="regular" />
                                </a>
                              </div>

                              <p className="text-foreground/60 text-sm mb-4">
                                {device.description}
                              </p>

                              {/* Specifications */}
                              {device.specifications && Object.keys(device.specifications).length > 0 && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-medium text-foreground mb-2">Specifications</h4>
                                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                                    {Object.entries(device.specifications).map(([key, value]) => (
                                      <div key={key} className="flex items-baseline gap-2 text-sm">
                                        <span className="text-foreground/50">{key}:</span>
                                        <span className="text-foreground">{value}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Features */}
                              {device.features && device.features.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-foreground mb-2">Key Features</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {device.features.map((feature, featureIdx) => (
                                      <span
                                        key={featureIdx}
                                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                      >
                                        {feature}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Reviews Section */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  Reviews ({reviews.length})
                </h2>
                {!showReviewForm && (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="btn-primary"
                  >
                    Write a Review
                  </button>
                )}
              </div>

              {/* Review Form */}
              {showReviewForm && (
                <div className="mb-6 p-4 border border-cyan-500/20 rounded-lg glass-card">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Write Your Review
                  </h3>

                  {/* Rating */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Rating
                    </label>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => setNewReview({ ...newReview, rating })}
                          className="focus:outline-none"
                        >
                          {rating <= newReview.rating ? (
                            <Star weight="fill" className="h-8 w-8 text-yellow-400" />
                          ) : (
                            <Star weight="regular" className="h-8 w-8 text-foreground/30" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Review Title
                    </label>
                    <input
                      type="text"
                      value={newReview.title}
                      onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                      placeholder="Sum up your experience in one sentence"
                      className="w-full px-3 py-2 rounded-xl glass-input text-foreground placeholder-foreground/40"
                    />
                  </div>

                  {/* Review Text */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Your Review
                    </label>
                    <textarea
                      value={newReview.review_text}
                      onChange={(e) => setNewReview({ ...newReview, review_text: e.target.value })}
                      placeholder="Share your experience with this plugin..."
                      rows={5}
                      className="w-full px-3 py-2 rounded-xl glass-input text-foreground placeholder-foreground/40"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={submitReview}
                      disabled={submittingReview}
                      className="btn-primary disabled:opacity-50"
                    >
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                    <button
                      onClick={() => {
                        setShowReviewForm(false)
                        setNewReview({ rating: 5, title: '', review_text: '' })
                      }}
                      className="btn-ghost"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Reviews List */}
              {reviewsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-500 mx-auto"></div>
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-center text-foreground/60 py-8">
                  No reviews yet. Be the first to review this plugin!
                </p>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="flex items-center">
                              {renderRatingStars(review.rating)}
                            </div>
                            {review.is_verified_purchase && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <Check className="h-3 w-3 mr-1" />
                                Verified Purchase
                              </span>
                            )}
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {review.title}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {review.user.full_name || 'Anonymous User'} • {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {review.review_text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 sticky top-6">
              {renderPricingInfo()}

              <div className="mt-6 space-y-3">
                {userHasLicense ? (
                  <div className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-900 rounded-md">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      You own this plugin
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Show "Subscribe Now" ONLY if user has already used their trial */}
                    {hasUsedTrial && (
                      <button
                        onClick={handleRequestLicense}
                        disabled={generatingLicense}
                        className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingLicense ? (
                          'Generating License...'
                        ) : plugin.pricing_model === 'enterprise' ? (
                          <>
                            <Envelope className="h-5 w-5 mr-2" />
                            Contact Sales
                          </>
                        ) : plugin.pricing_model === 'subscription_monthly' || plugin.pricing_model === 'subscription_annual' ? (
                          <>
                            <ShoppingCart className="h-5 w-5 mr-2" />
                            Subscribe Now
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-5 w-5 mr-2" />
                            Purchase License
                          </>
                        )}
                      </button>
                    )}

                    {/* Show trial button ONLY if user has NOT used their trial yet */}
                    {!hasUsedTrial && plugin.has_free_trial && plugin.trial_duration_days > 0 && (
                      <button
                        onClick={handleStartTrial}
                        disabled={generatingLicense}
                        className="w-full inline-flex items-center justify-center px-6 py-3 border border-blue-600 rounded-md text-base font-medium text-blue-600 bg-white hover:bg-blue-50 dark:bg-gray-700 dark:text-blue-400 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingLicense ? (
                          'Generating License...'
                        ) : (
                          <>
                            <Clock className="h-5 w-5 mr-2" />
                            Start {plugin.trial_duration_days}-Day Free Trial
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Plugin Info */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Version</span>
                  <span className="text-gray-900 dark:text-white font-medium">{plugin.current_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Category</span>
                  <span className="text-gray-900 dark:text-white font-medium capitalize">{plugin.category}</span>
                </div>
                {plugin.principle && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Principle</span>
                    <span className="text-gray-900 dark:text-white font-medium capitalize">{plugin.principle}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Publisher</span>
                  <span className="text-gray-900 dark:text-white font-medium">Lyceum Audio Labs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <Warning className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {modalData.licenseType === 'trial' ? 'Start Free Trial?' : 'Purchase License?'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {modalData.licenseType === 'trial'
                    ? `You are about to start a ${plugin?.trial_duration_days}-day free trial for ${plugin?.display_name}. The trial license will expire after ${plugin?.trial_duration_days} days.`
                    : `You are about to purchase a lifetime license for ${plugin?.display_name} at ${plugin?.base_price ? `$${plugin.base_price.toFixed(2)}` : '$49.00'}. Your payment method will be charged immediately.`
                  }
                </p>
                {modalData.licenseType === 'paid' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    By clicking "Confirm Purchase", you agree to be charged and acknowledge that this is a one-time payment for a lifetime license.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setModalData({})
                }}
                disabled={generatingLicense}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmLicenseGeneration}
                disabled={generatingLicense}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generatingLicense ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  modalData.licenseType === 'trial' ? 'Start Trial' : 'Confirm Purchase'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {modalData.isExisting ? 'License Already Active' : 'License Generated Successfully!'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {modalData.isExisting
                    ? `You already have an active ${modalData.licenseType} license for this plugin.`
                    : `Your ${modalData.licenseType === 'trial' ? 'trial' : 'lifetime'} license has been generated successfully.`
                  }
                </p>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">License Key:</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
                    {modalData.licenseKey}
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  You can view and manage your license in Settings → Licenses tab.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => router.push('/settings?tab=licenses')}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
              >
                View Licenses
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  setModalData({})
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <X className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Unable to Generate License
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {modalData.errorMessage}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              {modalData.errorMessage?.includes('payment method') && (
                <button
                  onClick={() => router.push('/settings?tab=payment')}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Add Payment Method
                </button>
              )}
              <button
                onClick={() => {
                  setShowErrorModal(false)
                  setModalData({})
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
