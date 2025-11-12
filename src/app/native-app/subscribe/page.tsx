'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  CheckCircleIcon,
  XMarkIcon,
  SparklesIcon,
  RocketLaunchIcon,
  ClockIcon,
  InfinitySymbol
} from '@heroicons/react/24/outline'

interface Subscription {
  id: string
  subscription_type: 'trial' | 'paid'
  status: 'active' | 'expired' | 'cancelled'
  expires_at: string | null
}

export default function NativeAppSubscribePage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  const [checkingSubscription, setCheckingSubscription] = useState(true)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const getUserBrandType = (): 'centcom' | 'lyceum' => {
    if (!userProfile?.company) return 'lyceum'

    const centcomCompanies = [
      'centcom',
      'sonance',
      'blaze',
      'iport',
      'danainnovations',
      'dana innovations',
      'james',
      'trufig'
    ]

    const companyLower = userProfile.company.toLowerCase()
    const isCentcom = centcomCompanies.some(name => companyLower.includes(name))

    return isCentcom ? 'centcom' : 'lyceum'
  }

  const brandName = getUserBrandType() === 'centcom' ? 'Centcom' : 'Lyceum Native'

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  // Check existing subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return

      try {
        const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
        if (!session?.access_token) {
          setCheckingSubscription(false)
          return
        }

        const response = await fetch('/api/subscriptions/native-app', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          setHasSubscription(data.hasSubscription)
          setSubscription(data.subscription)

          // If user already has subscription, redirect to download page
          if (data.hasSubscription) {
            router.push('/download-app')
          }
        }
      } catch (err) {
        console.error('Error checking subscription:', err)
      } finally {
        setCheckingSubscription(false)
      }
    }

    if (!loading && user) {
      checkSubscription()
    }
  }, [user, loading, router])

  const handleSubscribe = async (subscriptionType: 'trial' | 'paid') => {
    setError(null)
    setProcessing(true)

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Authentication required')
        setProcessing(false)
        return
      }

      // Check if user already has payment method on file
      console.log('Checking for existing payment methods...')
      const paymentCheckResponse = await fetch('/api/payment/check', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Payment check response status:', paymentCheckResponse.status)

      if (paymentCheckResponse.ok) {
        const paymentData = await paymentCheckResponse.json()
        console.log('Payment data:', paymentData)

        if (paymentData.hasPaymentMethod) {
          // User has payment on file, process subscription directly
          console.log('Payment method on file, processing subscription directly!')

          // Since user has payment method, always create a PAID subscription
          // (even if they clicked "Start Free Trial")
          const finalSubscriptionType = 'paid'
          console.log(`Creating ${finalSubscriptionType} subscription (user has payment method on file)`)

          // Create subscription
          const subscriptionResponse = await fetch('/api/subscriptions/native-app', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ subscription_type: finalSubscriptionType })
          })

          if (!subscriptionResponse.ok) {
            const errorData = await subscriptionResponse.json()
            throw new Error(errorData.error || 'Failed to create subscription')
          }

          // Generate license
          const licenseResponse = await fetch('/api/licenses/generate-main-app', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          })

          if (!licenseResponse.ok) {
            const errorData = await licenseResponse.json()
            throw new Error(errorData.error || 'Failed to generate license')
          }

          // Success! Redirect to download page
          router.push('/download-app')
          return
        } else {
          console.log('No payment method on file, redirecting to payment page')
        }
      } else {
        console.error('Payment check failed:', await paymentCheckResponse.text())
      }

      // No payment method on file, redirect to payment page
      console.log(`Redirecting to payment page: /native-app/payment?type=${subscriptionType}`)
      router.push(`/native-app/payment?type=${subscriptionType}`)

    } catch (err) {
      console.error('Subscription error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process subscription')
    } finally {
      setProcessing(false)
    }
  }

  if (loading || checkingSubscription) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <XMarkIcon className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Trial Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <SparklesIcon className="h-8 w-8 text-yellow-500" />
                  <h3 className="ml-3 text-2xl font-bold text-gray-900 dark:text-white">
                    Free Trial
                  </h3>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                  Popular
                </span>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-gray-900 dark:text-white">$0</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">for 30 days</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Full access to all features
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Connect to local clusters
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Access to all plugins
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Community support
                  </span>
                </li>
                <li className="flex items-start">
                  <ClockIcon className="h-6 w-6 text-yellow-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    30-day trial period
                  </span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe('trial')}
                disabled={processing}
                className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    Start Free Trial
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Paid Plan */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-xl overflow-hidden relative">
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white backdrop-blur-sm">
                Best Value
              </span>
            </div>

            <div className="p-8">
              <div className="flex items-center mb-4">
                <RocketLaunchIcon className="h-8 w-8 text-white" />
                <h3 className="ml-3 text-2xl font-bold text-white">
                  Paid Subscription
                </h3>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-white">$49</span>
                  <span className="ml-2 text-blue-100">one-time</span>
                </div>
                <p className="mt-1 text-blue-100">Lifetime access</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-300 mr-3 flex-shrink-0" />
                  <span className="text-white">
                    Everything in Free Trial
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-300 mr-3 flex-shrink-0" />
                  <span className="text-white">
                    Priority support
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-300 mr-3 flex-shrink-0" />
                  <span className="text-white">
                    Early access to new features
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-300 mr-3 flex-shrink-0" />
                  <span className="text-white">
                    Advanced analytics
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="h-6 w-6 mr-3 flex-shrink-0 flex items-center justify-center">
                    <span className="text-2xl">∞</span>
                  </div>
                  <span className="text-white">
                    Lifetime updates
                  </span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe('paid')}
                disabled={processing}
                className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-blue-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <RocketLaunchIcon className="h-5 w-5 mr-2" />
                    Subscribe Now
                  </>
                )}
              </button>

              <p className="mt-4 text-sm text-center text-blue-100">
                One-time payment, lifetime access
              </p>
            </div>
          </div>
        </div>

        {/* Features Showcase Section */}
        <div className="mt-20 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features at Your Fingertips
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Experience the full power of {brandName} with our native desktop application.
              Built for performance, designed for professionals.
            </p>
          </div>

          {/* Video Demo Section */}
          <div className="mb-16">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-2xl">
              <div className="aspect-video bg-gray-700 rounded-lg overflow-hidden relative group">
                {/* Placeholder for video - replace with actual video */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-600 mb-4 group-hover:bg-blue-700 transition-colors cursor-pointer">
                      <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <p className="text-white text-lg font-medium">Watch {brandName} in Action</p>
                    <p className="text-gray-400 text-sm mt-2">2 minute overview</p>
                  </div>
                </div>
                {/* TODO: Add actual video element */}
                {/* <video controls className="w-full h-full object-cover">
                  <source src="/videos/demo.mp4" type="video/mp4" />
                </video> */}
              </div>
            </div>
          </div>

          {/* Feature Grid with Screenshots */}
          <div className="space-y-20">
            {/* Feature 1: Local Cluster Management */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm font-medium mb-4">
                  Cluster Management
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Seamless Local Cluster Integration
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Connect and manage your local clusters with ease. Real-time synchronization ensures your data is always up-to-date across all your devices.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">
                      One-click cluster registration with automatic discovery
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Real-time health monitoring and status updates
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Secure token-based authentication
                    </span>
                  </li>
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                  {/* Placeholder for screenshot */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cluster Management Screenshot</p>
                    </div>
                  </div>
                  {/* TODO: Add actual screenshot */}
                  {/* <img src="/screenshots/cluster-management.png" alt="Cluster Management" className="w-full h-full object-cover" /> */}
                </div>
              </div>
            </div>

            {/* Feature 2: Test Data Projects */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 relative">
                <div className="aspect-video bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-purple-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Test Data Projects Screenshot</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-sm font-medium mb-4">
                  Data Management
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Powerful Test Data Projects
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Create, manage, and organize your test data projects with an intuitive interface. Import, export, and sync data across your entire workflow.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Drag-and-drop project management
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Bulk import/export with multiple formats
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Advanced filtering and search capabilities
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 3: Plugin Ecosystem */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm font-medium mb-4">
                  Extensions
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Rich Plugin Ecosystem
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Extend functionality with our growing library of plugins. From data visualization to advanced analytics, there's a plugin for every need.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Browse and install plugins with one click
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Automatic updates for installed plugins
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Create and share your own custom plugins
                    </span>
                  </li>
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-video bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                      </svg>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Plugin Ecosystem Screenshot</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4: Real-time Sync */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 relative">
                <div className="aspect-video bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-orange-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Real-time Sync Screenshot</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 text-sm font-medium mb-4">
                  Synchronization
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Real-time Cloud Synchronization
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Stay in sync across all your devices. Changes made on one device are instantly reflected everywhere, ensuring you always have the latest data.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Instant synchronization across all devices
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Conflict resolution with merge capabilities
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Offline mode with automatic sync when online
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Additional Features Grid */}
          <div className="mt-20 grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Lightning Fast Performance
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Native performance optimized for your operating system. No lag, no waiting.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Enterprise-Grade Security
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your data stays on your machine. We never access or store your sensitive information.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Highly Customizable
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Customize every aspect of the interface to match your workflow and preferences.
              </p>
            </div>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
