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
  ClockIcon
} from '@heroicons/react/24/outline'

interface License {
  id: string
  license_key: string
  plugin_type: string
  status: 'active' | 'expired'
  expires_at: string | null
}

export default function KlippelQCSubscribePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [checkingLicense, setCheckingLicense] = useState(true)
  const [hasLicense, setHasLicense] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  // Check existing license
  useEffect(() => {
    const checkLicense = async () => {
      if (!user) return

      try {
        const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
        if (!session?.access_token) {
          setCheckingLicense(false)
          return
        }

        console.log('Checking if user has valid Klippel QC license...')

        // Check if user has a license for this plugin
        const licenseResponse = await fetch('/api/licenses/generate-plugin?plugin_type=klippel_qc', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (licenseResponse.ok) {
          const licenseData = await licenseResponse.json()

          if (licenseData.hasLicense) {
            // User already has a license - redirect to plugin page
            console.log('User already has a Klippel QC license, redirecting...')
            router.push('/plugins/klippel-qc')
          } else {
            // No license - user needs to subscribe (show the page)
            console.log('No license found - user needs to subscribe')
          }
        }
      } catch (err) {
        console.error('Error checking license:', err)
      } finally {
        setCheckingLicense(false)
      }
    }

    if (!loading && user) {
      checkLicense()
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

      // Handle FREE TRIAL - requires payment method (but no charge)
      if (subscriptionType === 'trial') {
        console.log('Starting Klippel QC FREE TRIAL flow - collecting payment method...')

        // Create Stripe Setup Intent to collect payment method
        const setupResponse = await fetch('/api/stripe/create-trial-setup', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subscription_type: 'trial',
            plugin_type: 'klippel_qc'
          })
        })

        if (!setupResponse.ok) {
          const errorData = await setupResponse.json()
          throw new Error(errorData.error || 'Failed to create trial setup')
        }

        const setupData = await setupResponse.json()

        // Redirect to Stripe Checkout in setup mode
        if (setupData.setupUrl) {
          console.log('Redirecting to Stripe to collect payment method for trial...')
          window.location.href = setupData.setupUrl
        } else {
          throw new Error('No setup URL returned')
        }
        return
      }

      // Handle PAID SUBSCRIPTION - redirect to Stripe Checkout
      if (subscriptionType === 'paid') {
        console.log('Redirecting to Stripe Checkout for paid Klippel QC subscription...')

        // Create subscription via plugin API
        const subscriptionResponse = await fetch('/api/subscriptions/plugin', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            plugin_type: 'klippel_qc',
            subscription_type: 'paid',
            amount: 4900, // $49.00 in cents
          })
        })

        if (!subscriptionResponse.ok) {
          const errorData = await subscriptionResponse.json()
          throw new Error(errorData.error || 'Failed to create checkout session')
        }

        const subscriptionData = await subscriptionResponse.json()

        // Redirect to Stripe Checkout
        if (subscriptionData.checkoutUrl) {
          window.location.href = subscriptionData.checkoutUrl
        } else {
          throw new Error('No checkout URL returned')
        }
        return
      }

    } catch (err) {
      console.error('Subscription error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process subscription')
    } finally {
      setProcessing(false)
    }
  }

  if (loading || checkingLicense) {
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Subscribe to Klippel QC Plugin
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Unlock powerful Klippel QC analysis capabilities with quality control reporting and data export features.
          </p>
        </div>

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
                    Full access to Klippel QC analysis
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Quality control reporting
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Data export capabilities
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Integration with main app
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
                    Advanced quality control features
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-300 mr-3 flex-shrink-0" />
                  <span className="text-white">
                    Unlimited data exports
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

        {/* Back to Plugins */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/plugins/klippel-qc')}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Klippel QC Plugin
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
