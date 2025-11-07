'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import {
  PuzzlePieceIcon,
  ArrowLeftIcon,
  CheckIcon,
  StarIcon,
  ShoppingCartIcon,
  EnvelopeIcon,
  ClockIcon,
  ChartBarIcon,
  CloudArrowDownIcon
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

  // Helper function to get auth headers
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    }
  }

  useEffect(() => {
    if (user && slug) {
      loadPluginDetails()
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

  const handleRequestLicense = () => {
    // For enterprise plugins, open email to contact sales
    if (plugin?.pricing_model === 'enterprise') {
      const subject = encodeURIComponent(`License Request: ${plugin.display_name}`)
      const body = encodeURIComponent(`Hello,\n\nI would like to request a license for ${plugin.display_name}.\n\nUser Email: ${user?.email}\nPlugin: ${plugin.display_name} (${plugin.slug})\nVersion: ${plugin.current_version}\n\nPlease provide pricing and licensing information.\n\nThank you!`)
      window.location.href = `mailto:sales@lyceum.com?subject=${subject}&body=${body}`
    } else {
      // For other plugins, go to checkout/purchase flow
      router.push(`/plugins/${slug}/purchase`)
    }
  }

  const renderRatingStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<StarIconSolid key={i} className="h-5 w-5 text-yellow-400" />)
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<StarIconSolid key={i} className="h-5 w-5 text-yellow-400 opacity-50" />)
      } else {
        stars.push(<StarIcon key={i} className="h-5 w-5 text-gray-300" />)
      }
    }
    return stars
  }

  const renderPricingInfo = () => {
    if (!plugin) return null

    if (plugin.pricing_model === 'enterprise') {
      return (
        <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Enterprise Pricing
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Contact sales for custom pricing and licensing options
          </p>
        </div>
      )
    }

    if (plugin.pricing_model === 'free') {
      return (
        <div className="text-center p-6 bg-green-50 dark:bg-green-900 rounded-lg">
          <p className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
            Free
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            No payment required
          </p>
        </div>
      )
    }

    if (plugin.pricing_model === 'subscription_monthly') {
      return (
        <div className="text-center p-6 bg-blue-50 dark:bg-blue-900 rounded-lg">
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
            ${(plugin.monthly_price || plugin.base_price).toFixed(2)}
            <span className="text-lg font-normal">/month</span>
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            per user
          </p>
        </div>
      )
    }

    return (
      <div className="text-center p-6 bg-blue-50 dark:bg-blue-900 rounded-lg">
        <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
          ${plugin.base_price.toFixed(2)}
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {plugin.pricing_model === 'one_time' && 'One-time purchase'}
          {plugin.pricing_model === 'subscription_annual' && plugin.annual_price && '/year'}
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading plugin details...</span>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !plugin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <PuzzlePieceIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">Plugin not found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/plugins')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
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
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Plugins Store
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-start space-x-4">
                {plugin.screenshots && plugin.screenshots.length > 0 && (
                  <img
                    src={plugin.screenshots[0].url}
                    alt={plugin.display_name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {plugin.display_name}
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-3">
                    {plugin.short_description}
                  </p>

                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      {renderRatingStars(plugin.average_rating)}
                      <span className="ml-2">
                        {plugin.average_rating.toFixed(1)} ({plugin.total_reviews} reviews)
                      </span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center">
                      <CloudArrowDownIcon className="h-4 w-4 mr-1" />
                      {plugin.total_downloads.toLocaleString()} downloads
                    </div>
                    <span>•</span>
                    <span className="capitalize">{plugin.category}</span>
                  </div>

                  {plugin.publisher_name && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      by {plugin.publisher_name}
                    </p>
                  )}
                </div>

                {plugin.is_featured && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    Featured
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                About this plugin
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                  {plugin.full_description || plugin.short_description}
                </p>
              </div>
            </div>

            {/* Features */}
            {plugin.features && plugin.features.length > 0 && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Features
                </h2>
                <ul className="space-y-3">
                  {plugin.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* License Tiers */}
            {plugin.installation_config?.license_tiers && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  License Tiers
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(plugin.installation_config.license_tiers).map(([tier, config]: [string, any]) => (
                    <div key={tier} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize mb-3">
                        {tier}
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        {Object.entries(config).map(([key, value]) => (
                          <li key={key}>
                            <span className="font-medium">
                              {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}:
                            </span>{' '}
                            {value === null ? 'Unlimited' : Array.isArray(value) ? value.join(', ') : String(value)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Reviews ({reviews.length})
                </h2>
                {!showReviewForm && (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Write a Review
                  </button>
                )}
              </div>

              {/* Review Form */}
              {showReviewForm && (
                <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Write Your Review
                  </h3>

                  {/* Rating */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                            <StarIconSolid className="h-8 w-8 text-yellow-400" />
                          ) : (
                            <StarIcon className="h-8 w-8 text-gray-300" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Review Title
                    </label>
                    <input
                      type="text"
                      value={newReview.title}
                      onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                      placeholder="Sum up your experience in one sentence"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Review Text */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Your Review
                    </label>
                    <textarea
                      value={newReview.review_text}
                      onChange={(e) => setNewReview({ ...newReview, review_text: e.target.value })}
                      placeholder="Share your experience with this plugin..."
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={submitReview}
                      disabled={submittingReview}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                    <button
                      onClick={() => {
                        setShowReviewForm(false)
                        setNewReview({ rating: 5, title: '', review_text: '' })
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Reviews List */}
              {reviewsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
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
                                <CheckIcon className="h-3 w-3 mr-1" />
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
                    <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      You own this plugin
                    </span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleRequestLicense}
                      className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      {plugin.pricing_model === 'enterprise' ? (
                        <>
                          <EnvelopeIcon className="h-5 w-5 mr-2" />
                          Contact Sales
                        </>
                      ) : plugin.pricing_model === 'subscription_monthly' || plugin.pricing_model === 'subscription_annual' ? (
                        <>
                          <ShoppingCartIcon className="h-5 w-5 mr-2" />
                          Subscribe Now
                        </>
                      ) : (
                        <>
                          <ShoppingCartIcon className="h-5 w-5 mr-2" />
                          Purchase License
                        </>
                      )}
                    </button>

                    {plugin.has_free_trial && plugin.trial_duration_days > 0 && (
                      <button
                        className="w-full inline-flex items-center justify-center px-6 py-3 border border-blue-600 rounded-md text-base font-medium text-blue-600 bg-white hover:bg-blue-50 dark:bg-gray-700 dark:text-blue-400 dark:hover:bg-gray-600"
                      >
                        <ClockIcon className="h-5 w-5 mr-2" />
                        {plugin.trial_duration_days}-Day Free Trial
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
                {plugin.publisher_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Publisher</span>
                    <span className="text-gray-900 dark:text-white font-medium">{plugin.publisher_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
