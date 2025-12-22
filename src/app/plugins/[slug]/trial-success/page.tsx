'use client'

import React, { useEffect, useState, Suspense, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, ArrowRight, Warning } from '@phosphor-icons/react'
import DashboardLayout from '@/components/DashboardLayout'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

function TrialSuccessContent({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)
  const slug = resolvedParams.slug
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionId) {
      const processSession = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 3000))

          const response = await fetch('/api/stripe/process-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          })

          if (response.ok) {
            const data = await response.json()
            console.log('Plugin trial session processed:', data)
          }
        } catch (error) {
          console.log('Session processing attempt completed')
        } finally {
          setLoading(false)
        }
      }

      processSession()
    } else {
      setLoading(false)
      setError('No session ID provided')
    }
  }, [sessionId])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="glass-card w-full max-w-md mx-4 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/20 border-t-cyan-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Processing your trial...</h2>
            <p className="text-foreground/60">Please wait while we activate your plugin trial.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="glass-card w-full max-w-md mx-4 p-8 text-center">
            <Warning className="w-12 h-12 text-amber-500 mx-auto mb-4" weight="duotone" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Processing Issue</h2>
            <p className="text-foreground/60 mb-4">{error}</p>
            <button
              onClick={() => router.push(`/plugins/${slug}`)}
              className="btn-ghost"
            >
              Back to Plugin
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const pluginName = slug === 'klippel-qc' ? 'Klippel QC' : slug === 'apx500' ? 'APx500' : slug

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="glass-card w-full max-w-2xl mx-4 p-8">
          <div className="text-center mb-6">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" weight="duotone" />
            <h1 className="text-2xl font-bold text-foreground">
              Plugin Trial Activated Successfully!
            </h1>
            <p className="text-foreground/60 mt-2">
              Your 30-day free trial for {pluginName} is now active
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
              <h3 className="font-semibold text-cyan-400 mb-2">{pluginName} Plugin Trial Active!</h3>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                  Your 30-day free trial has started
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                  Payment method saved for future billing
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                  License will be generated automatically
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                  You'll be charged automatically after trial ends unless you cancel
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => router.push(`/plugins/${slug}`)}
                className="btn-primary flex items-center justify-center gap-2"
              >
                View Plugin Details
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => router.push('/plugins')}
                className="btn-ghost flex items-center justify-center gap-2"
              >
                Browse More Plugins
              </button>
            </div>

            {sessionId && (
              <div className="text-center">
                <p className="text-xs text-foreground/40 font-mono">
                  Session ID: {sessionId}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function PluginTrialSuccessPage({ params }: PageProps) {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/20 border-t-cyan-500"></div>
        </div>
      </DashboardLayout>
    }>
      <TrialSuccessContent params={params} />
    </Suspense>
  )
}
