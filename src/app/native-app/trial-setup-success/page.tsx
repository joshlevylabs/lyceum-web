'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import { CheckCircle, X } from '@phosphor-icons/react'

function TrialSetupSuccessContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [processing, setProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Prevent duplicate setup processes (React StrictMode runs effects twice)
  const setupInProgress = useRef(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
      return
    }

    if (!sessionId) {
      setError('Invalid setup session')
      setProcessing(false)
      return
    }

    const processTrialSetup = async () => {
      // Prevent duplicate executions
      if (setupInProgress.current) {
        console.log('⚠️ Setup already in progress, skipping duplicate call')
        return
      }

      setupInProgress.current = true
      console.log('🔒 Starting trial setup (locked to prevent duplicates)')

      try {
        const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
        if (!session?.access_token) {
          setError('Authentication required')
          setProcessing(false)
          return
        }

        console.log('✅ Payment method added! Processing trial setup:', sessionId)

        // Step 1: Verify the Stripe Setup session
        const verifyResponse = await fetch('/api/stripe/verify-setup-session', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ session_id: sessionId })
        })

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json()
          throw new Error(errorData.error || 'Failed to verify payment method')
        }

        const verifyData = await verifyResponse.json()
        console.log('Payment method verified:', verifyData)

        // Step 2: Create trial subscription
        const subscriptionResponse = await fetch('/api/subscriptions/native-app', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subscription_type: 'trial',
            stripe_session_id: sessionId
          })
        })

        if (!subscriptionResponse.ok) {
          const errorData = await subscriptionResponse.json()

          // Handle "trial already used" error specially
          if (errorData.error?.includes('already used your trial') || errorData.can_use_trial === false) {
            setError('You have already used your free trial. Please purchase a paid subscription to continue.')
            setProcessing(false)

            // Redirect to paid subscription page after 3 seconds
            setTimeout(() => {
              router.push('/native-app/subscribe?plan=paid')
            }, 3000)
            return
          }

          throw new Error(errorData.error || 'Failed to create trial subscription')
        }

        console.log('✅ Trial subscription created')

        // Step 3: Generate TRIAL license
        const licenseResponse = await fetch('/api/licenses/generate-main-app', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ license_type: 'trial' })
        })

        if (!licenseResponse.ok) {
          const errorData = await licenseResponse.json()
          throw new Error(errorData.error || 'Failed to generate trial license')
        }

        console.log('✅ Trial license generated successfully')

        setSuccess(true)
        setProcessing(false)

        // Redirect to download page after 2 seconds
        setTimeout(() => {
          router.push('/download-app')
        }, 2000)

      } catch (err) {
        console.error('Error processing trial setup:', err)
        setError(err instanceof Error ? err.message : 'Failed to process trial setup')
        setProcessing(false)
      }
    }

    if (user && sessionId) {
      processTrialSetup()
    }
  }, [user, loading, sessionId, router])

  if (loading || processing) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-2 border-cyan-500/20 border-t-cyan-500 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Setting Up Your Free Trial
            </h2>
            <p className="text-foreground/60">
              Please wait while we activate your 30-day trial...
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="max-w-md w-full glass-card p-8 text-center border border-red-500/20">
            <X className="h-16 w-16 text-red-400 mx-auto mb-4" weight="duotone" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Trial Setup Failed
            </h2>
            <p className="text-foreground/60 mb-6">
              {error}
            </p>
            <button
              onClick={() => router.push('/native-app/subscribe')}
              className="px-6 py-3 btn-primary"
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
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="max-w-md w-full glass-card p-8 text-center border border-emerald-500/20">
            <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-4" weight="duotone" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Free Trial Activated!
            </h2>
            <p className="text-foreground/60 mb-2">
              Your 30-day trial license has been generated.
            </p>
            <p className="text-sm text-foreground/40 mb-6">
              Your card will only be charged if you don't cancel before the trial ends.
            </p>
            <div className="animate-pulse text-cyan-400">
              Redirecting to download page...
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return null
}

export default function TrialSetupSuccessPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/20 border-t-cyan-500"></div>
        </div>
      </DashboardLayout>
    }>
      <TrialSetupSuccessContent />
    </Suspense>
  )
}
