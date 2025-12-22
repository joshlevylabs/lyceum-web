'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  CheckCircle,
  X,
  Sparkle,
  Rocket,
  Clock
} from '@phosphor-icons/react'

interface License {
  id: string
  license_key: string
  plugin_type: string
  status: 'active' | 'expired'
  expires_at: string | null
}

export default function APx500SubscribePage() {
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

        console.log('Checking if user has valid APx500 license...')

        // Check if user has a license for this plugin
        const licenseResponse = await fetch('/api/licenses/generate-plugin?plugin_type=apx500', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (licenseResponse.ok) {
          const licenseData = await licenseResponse.json()

          if (licenseData.hasLicense) {
            // User already has a license - redirect to plugin page
            console.log('User already has an APx500 license, redirecting...')
            router.push('/plugins/apx500')
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
        console.log('Starting APx500 FREE TRIAL flow - collecting payment method...')

        // Create Stripe Setup Intent to collect payment method
        const setupResponse = await fetch('/api/stripe/create-trial-setup', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subscription_type: 'trial',
            plugin_type: 'apx500'
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
        console.log('Redirecting to Stripe Checkout for paid APx500 subscription...')

        // Create subscription via plugin API
        const subscriptionResponse = await fetch('/api/subscriptions/plugin', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            plugin_type: 'apx500',
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
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/20 border-t-cyan-500"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Subscribe to APx500 Plugin
          </h1>
          <p className="text-lg text-foreground/60 max-w-3xl mx-auto">
            Unlock advanced APx500 measurements with audio analyzer integration and comprehensive measurement tools.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex">
              <X className="h-5 w-5 text-red-400 mr-3" weight="bold" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Trial Plan */}
          <div className="glass-card overflow-hidden">
            <div className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Sparkle className="h-8 w-8 text-cyan-400" weight="duotone" />
                  <h3 className="ml-3 text-2xl font-bold text-foreground">
                    Free Trial
                  </h3>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Popular
                </span>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-foreground">$0</span>
                  <span className="ml-2 text-foreground/60">for 30 days</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-emerald-400 mr-3 flex-shrink-0" weight="bold" />
                  <span className="text-foreground">
                    Full access to APx500 measurements
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-emerald-400 mr-3 flex-shrink-0" weight="bold" />
                  <span className="text-foreground">
                    Audio analyzer integration
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-emerald-400 mr-3 flex-shrink-0" weight="bold" />
                  <span className="text-foreground">
                    Advanced measurement tools
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-emerald-400 mr-3 flex-shrink-0" weight="bold" />
                  <span className="text-foreground">
                    Data export capabilities
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-emerald-400 mr-3 flex-shrink-0" weight="bold" />
                  <span className="text-foreground">
                    Integration with main app
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-emerald-400 mr-3 flex-shrink-0" weight="bold" />
                  <span className="text-foreground">
                    Community support
                  </span>
                </li>
                <li className="flex items-start">
                  <Clock className="h-6 w-6 text-cyan-400 mr-3 flex-shrink-0" weight="regular" />
                  <span className="text-foreground">
                    30-day trial period
                  </span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe('trial')}
                disabled={processing}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500/20 border-t-cyan-500 mr-3"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkle className="h-5 w-5 mr-2" weight="duotone" />
                    Start Free Trial
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Paid Plan */}
          <div className="bg-gradient-to-br from-cyan-600 to-cyan-800 rounded-2xl shadow-xl overflow-hidden relative glass-card border-cyan-500/20">
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/20 text-emerald-300 backdrop-blur-sm border border-emerald-500/30">
                Best Value
              </span>
            </div>

            <div className="p-8">
              <div className="flex items-center mb-4">
                <Rocket className="h-8 w-8 text-white" weight="duotone" />
                <h3 className="ml-3 text-2xl font-bold text-white">
                  Paid Subscription
                </h3>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-white">$49</span>
                  <span className="ml-2 text-cyan-100">one-time</span>
                </div>
                <p className="mt-1 text-cyan-100">Lifetime access</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-emerald-300 mr-3 flex-shrink-0" weight="bold" />
                  <span className="text-white">
                    Everything in Free Trial
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-emerald-300 mr-3 flex-shrink-0" weight="bold" />
                  <span className="text-white">
                    Priority support
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-emerald-300 mr-3 flex-shrink-0" weight="bold" />
                  <span className="text-white">
                    Advanced measurement features
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-emerald-300 mr-3 flex-shrink-0" weight="bold" />
                  <span className="text-white">
                    Unlimited data exports
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="h-6 w-6 mr-3 flex-shrink-0 flex items-center justify-center">
                    <span className="text-2xl text-cyan-200">∞</span>
                  </div>
                  <span className="text-white">
                    Lifetime updates
                  </span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe('paid')}
                disabled={processing}
                className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-cyan-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500/20 border-t-cyan-500 mr-3"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Rocket className="h-5 w-5 mr-2" weight="duotone" />
                    Subscribe Now
                  </>
                )}
              </button>

              <p className="mt-4 text-sm text-center text-cyan-100">
                One-time payment, lifetime access
              </p>
            </div>
          </div>
        </div>

        {/* Back to Plugins */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/plugins/apx500')}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            ← Back to APx500 Plugin
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
