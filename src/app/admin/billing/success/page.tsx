'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, ArrowRight, CreditCard, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SuccessPage() {
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
      console.log('🔄 Processing session:', sessionId)
      
      // Get auth token 
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token
      
      if (!accessToken) {
        throw new Error('No access token found')
      }

      const response = await fetch('/api/stripe/process-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Session processed successfully:', result)
        setProcessedSuccessfully(true)
      } else {
        const error = await response.json()
        console.error('❌ Session processing failed:', error)
        setProcessingError(error.error || 'Failed to process session')
      }
    } catch (error: any) {
      console.error('❌ Error processing session:', error)
      setProcessingError(error.message || 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing your subscription...</h2>
            <p className="text-gray-600">Please wait while we set up your account and save your payment method.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (processingError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="text-center p-8">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Issue</h2>
            <p className="text-gray-600 mb-4">{processingError}</p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-2xl mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-gray-900">
            {processedSuccessfully ? 'Subscription Activated Successfully! 🎉' : 'Payment Completed! 🎉'}
          </CardTitle>
          <CardDescription className="text-lg">
            {processedSuccessfully 
              ? 'Your subscription is now active and payment method is saved' 
              : 'Your payment was successful'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">What's Next?</h3>
            <ul className="space-y-2 text-sm text-green-700">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Your payment method has been securely saved
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Your payment has been processed successfully
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Your cluster access has been activated
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                You can now create and manage database clusters
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={() => router.push('/admin/clusters')}
              className="flex items-center gap-2"
            >
              Go to Clusters
              <ArrowRight className="w-4 h-4" />
            </Button>
            
            <Button 
              onClick={() => router.push('/admin/billing')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Manage Billing
            </Button>
          </div>

          {sessionId && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Session ID: {sessionId}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
