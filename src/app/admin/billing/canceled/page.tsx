'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { XCircle, ArrowLeft, CreditCard } from '@phosphor-icons/react'

export default function CanceledPage() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="glass-card w-full max-w-2xl mx-4 p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4">
            <XCircle className="w-16 h-16 text-amber-500 mx-auto" weight="duotone" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Subscription Canceled
          </h1>
          <p className="text-foreground/60 mt-2">
            No worries! You can start your subscription anytime.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <h3 className="font-semibold text-amber-400 mb-2">What happened?</h3>
            <p className="text-sm text-foreground/70">
              Your subscription setup was canceled. No charges were made to your account.
            </p>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
            <h3 className="font-semibold text-cyan-400 mb-2">Ready to try again?</h3>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                Choose from our flexible pricing plans
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                Start with a 14-day free trial
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                Cancel anytime, no long-term commitments
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/admin/billing')}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" weight="duotone" />
              Try Again
            </button>

            <button
              onClick={() => router.push('/admin')}
              className="btn-ghost flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
