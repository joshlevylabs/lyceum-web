'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, ArrowRight, CreditCard, Warning } from '@phosphor-icons/react'

export const dynamic = 'force-dynamic'

function SetupSuccessPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)
  const [processedSuccessfully, setProcessedSuccessfully] = useState(false)
  const [processingError, setProcessingError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionId) {
      processSession()
    } else {
      setLoading(false)
      setProcessingError('No session ID provided')
    }
  }, [sessionId])

  const processSession = async () => {
    try {
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        throw new Error('Session expired. Please sign in again.')
      }

      const response = await fetch('/api/stripe/process-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      })

      if (response.ok) {
        setProcessedSuccessfully(true)
      } else {
        const error = await response.json()
        setProcessingError(error.error || 'Failed to process session')
      }
    } catch (error: any) {
      setProcessingError(error.message || 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="glass-card w-full max-w-md mx-4 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/20 border-t-cyan-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Processing your payment method...</h2>
          <p className="text-foreground/60">Please wait while we save your payment information.</p>
        </div>
      </div>
    )
  }

  if (processingError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="glass-card w-full max-w-md mx-4 p-8 text-center">
          <Warning className="w-12 h-12 text-amber-500 mx-auto mb-4" weight="duotone" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Processing Issue</h2>
          <p className="text-foreground/60 mb-4">{processingError}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-ghost"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="glass-card w-full max-w-2xl mx-4 p-8">
        <div className="text-center mb-6">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" weight="duotone" />
          <h1 className="text-2xl font-bold text-foreground">
            {processedSuccessfully ? 'Payment Method Added Successfully!' : 'Payment Method Setup Complete!'}
          </h1>
          <p className="text-foreground/60 mt-2">
            {processedSuccessfully
              ? 'Your payment method has been verified and saved'
              : 'Your payment method has been saved and is ready to use'}
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <h3 className="font-semibold text-emerald-400 mb-2">What's Next?</h3>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                Your payment method has been securely saved
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                You can now subscribe to any of our plans
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                Your clusters will be activated immediately after subscription
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/admin/billing')}
              className="btn-primary flex items-center justify-center gap-2"
            >
              Subscribe to Plan
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => router.back()}
              className="btn-ghost flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" weight="duotone" />
              Back to Profile
            </button>
          </div>

          {sessionId && (
            <div className="text-center">
              <p className="text-xs text-foreground/40 font-mono">
                Setup Session ID: {sessionId}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SetupSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/20 border-t-cyan-500"></div>
      </div>
    }>
      <SetupSuccessPageContent />
    </Suspense>
  )
}
