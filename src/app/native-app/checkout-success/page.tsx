'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

function CheckoutSuccessContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [processing, setProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
      return
    }

    if (!sessionId) {
      setError('Invalid checkout session')
      setProcessing(false)
      return
    }

    const checkSubscriptionStatus = async () => {
      try {
        const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
        if (!session?.access_token) {
          setError('Authentication required')
          setProcessing(false)
          return
        }

        console.log('✅ Payment successful! Processing subscription:', sessionId)

        // Poll for subscription creation (webhook should create it)
        // After 5 seconds with no webhook, manually trigger processing
        let attempts = 0
        const maxAttempts = 30 // 30 attempts = 30 seconds total
        const pollInterval = 1000 // 1 second
        const manualProcessThreshold = 5 // After 5 seconds, try manual processing
        let manualProcessingTriggered = false

        const checkInterval = setInterval(async () => {
          attempts++

          try {
            // Check if subscription exists
            const { createClient } = await import('@/lib/supabase')
            const supabase = createClient()

            const { data: subscription, error: subError } = await supabase
              .from('subscriptions')
              .select('*, license_subscription_relationships(license_id, license_keys(key_code, status, expires_at))')
              .eq('user_id', user!.id)
              .eq('subscription_category', 'native_app')
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (subError && subError.code !== 'PGRST116') {
              console.error('Error checking subscription:', subError)
            }

            if (subscription) {
              console.log('✅ Subscription found:', subscription)
              clearInterval(checkInterval)
              setSubscriptionDetails(subscription)
              setSuccess(true)
              setProcessing(false)

              // Redirect to download page after 2 seconds
              setTimeout(() => {
                router.push('/download-app')
              }, 2000)
            } else if (attempts >= manualProcessThreshold && !manualProcessingTriggered) {
              // Webhook hasn't fired yet, manually trigger processing
              manualProcessingTriggered = true
              console.log('⚠️ Webhook delay detected, manually processing subscription...')

              try {
                const processResponse = await fetch('/api/stripe/process-session', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ sessionId })
                })

                if (processResponse.ok) {
                  console.log('✅ Manual processing successful, checking for subscription...')
                } else {
                  // Silently ignore - webhook usually processes first
                  console.log('⏳ Manual processing skipped (webhook likely processed already)')
                }
              } catch (processErr) {
                // Silently ignore - webhook usually processes first
                console.log('⏳ Manual processing not needed (webhook likely processed already)')
              }
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval)
              setError('Subscription creation is taking longer than expected. Please check your account or contact support.')
              setProcessing(false)
            } else {
              console.log(`⏳ Waiting for subscription... (attempt ${attempts}/${maxAttempts})`)
            }
          } catch (err) {
            console.error('Error polling subscription:', err)
            if (attempts >= maxAttempts) {
              clearInterval(checkInterval)
              setError('Failed to verify subscription creation')
              setProcessing(false)
            }
          }
        }, pollInterval)

        // Cleanup interval on unmount
        return () => clearInterval(checkInterval)

      } catch (err) {
        console.error('Error checking subscription status:', err)
        setError(err instanceof Error ? err.message : 'Failed to process checkout')
        setProcessing(false)
      }
    }

    if (user && sessionId) {
      checkSubscriptionStatus()
    }
  }, [user, loading, sessionId, router])

  if (loading || processing) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Processing Your Payment
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we set up your subscription and generate your license...
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
              This usually takes 5-10 seconds
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
            <XMarkIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Payment Processing Issue
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (success) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md w-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Payment Successful!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your subscription has been activated and your license has been generated.
            </p>
            {subscriptionDetails?.license_subscription_relationships?.[0]?.license_keys?.key_code && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">License Key:</p>
                <p className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                  {subscriptionDetails.license_subscription_relationships[0].license_keys.key_code}
                </p>
              </div>
            )}
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Redirecting to download page...
            </p>
            <div className="animate-pulse text-blue-600 dark:text-blue-400">
              Redirecting...
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return null
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
