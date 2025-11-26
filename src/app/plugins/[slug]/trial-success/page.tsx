'use client'

import React, { useEffect, useState, Suspense, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, ArrowRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      // Process the session to ensure subscription and license are created
      // This acts as a fallback in case the webhook doesn't fire
      const processSession = async () => {
        try {
          console.log('🔄 Processing plugin trial session:', sessionId)

          // Wait 3 seconds to give webhook a chance to process first
          await new Promise(resolve => setTimeout(resolve, 3000))

          const response = await fetch('/api/stripe/process-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          })

          if (response.ok) {
            const data = await response.json()
            console.log('✅ Plugin trial session processed successfully:', data)
          } else {
            const errorData = await response.json()
            console.log('⏳ Manual processing skipped (webhook likely processed already):', errorData.error)
          }
        } catch (error) {
          console.log('⏳ Session processing attempt completed (webhook may have processed already)')
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
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="text-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Processing your trial...</h2>
              <p className="text-gray-600 dark:text-gray-300">Please wait while we activate your plugin trial.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="text-center p-8">
              <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Processing Issue</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
              <Button
                onClick={() => router.push(`/plugins/${slug}`)}
                variant="outline"
              >
                Back to Plugin
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  const pluginName = slug === 'klippel-qc' ? 'Klippel QC' : slug === 'apx500' ? 'APx500' : slug

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-2xl mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-gray-900 dark:text-white">
              Plugin Trial Activated Successfully! 🎉
            </CardTitle>
            <CardDescription className="text-lg">
              Your 30-day free trial for {pluginName} is now active
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">{pluginName} Plugin Trial Active!</h3>
              <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Your 30-day free trial has started
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Payment method saved for future billing
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  License will be generated automatically
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  You'll be charged automatically after trial ends unless you cancel
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => router.push(`/plugins/${slug}`)}
                className="flex items-center gap-2"
              >
                View Plugin Details
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => router.push('/plugins')}
                variant="outline"
                className="flex items-center gap-2"
              >
                Browse More Plugins
              </Button>
            </div>

            {sessionId && (
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Session ID: {sessionId}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default function PluginTrialSuccessPage({ params }: PageProps) {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    }>
      <TrialSuccessContent params={params} />
    </Suspense>
  )
}
