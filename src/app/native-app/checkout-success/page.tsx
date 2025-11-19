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

    const processCheckout = async () => {
      try {
        const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
        if (!session?.access_token) {
          setError('Authentication required')
          setProcessing(false)
          return
        }

        console.log('✅ Payment successful! Processing checkout:', sessionId)

        // Step 1: Verify the Stripe Checkout session
        const verifyResponse = await fetch('/api/stripe/verify-checkout-session', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ session_id: sessionId })
        })

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json()
          throw new Error(errorData.error || 'Failed to verify payment')
        }

        const verifyData = await verifyResponse.json()
        console.log('Payment verified:', verifyData)

        // Step 2: Create paid subscription
        const subscriptionResponse = await fetch('/api/subscriptions/native-app', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subscription_type: 'paid',
            stripe_session_id: sessionId
          })
        })

        if (!subscriptionResponse.ok) {
          const errorData = await subscriptionResponse.json()
          throw new Error(errorData.error || 'Failed to create subscription')
        }

        console.log('✅ Subscription created')

        // Step 3: Generate paid license
        const licenseResponse = await fetch('/api/licenses/generate-main-app', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ license_type: 'paid' })
        })

        if (!licenseResponse.ok) {
          const errorData = await licenseResponse.json()
          throw new Error(errorData.error || 'Failed to generate license')
        }

        console.log('✅ License generated successfully')

        setSuccess(true)
        setProcessing(false)

        // Redirect to download page after 2 seconds
        setTimeout(() => {
          router.push('/download-app')
        }, 2000)

      } catch (err) {
        console.error('Error processing checkout:', err)
        setError(err instanceof Error ? err.message : 'Failed to process checkout')
        setProcessing(false)
      }
    }

    if (user && sessionId) {
      processCheckout()
    }
  }, [user, loading, sessionId, router])

  if (loading || processing) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Processing Your Payment
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we set up your license...
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
              Payment Processing Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <button
              onClick={() => router.push('/native-app/subscribe')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
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
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your license has been generated. Redirecting to download page...
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
