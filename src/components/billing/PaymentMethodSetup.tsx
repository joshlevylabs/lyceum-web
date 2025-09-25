'use client'

import React, { useState, useEffect } from 'react'
import { CreditCard, Plus, Trash2, CheckCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase'

interface PaymentMethod {
  id: string
  type: string
  last4: string
  exp_month: number
  exp_year: number
  brand: string
  is_default: boolean
}

interface PaymentMethodSetupProps {
  userId: string
  onPaymentMethodAdded?: () => void
}

export default function PaymentMethodSetup({ userId, onPaymentMethodAdded }: PaymentMethodSetupProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [addingMethod, setAddingMethod] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('')

  useEffect(() => {
    loadPaymentMethods()
  }, [userId])

  const loadPaymentMethods = async () => {
    try {
      console.log('💳 PaymentMethodSetup - Loading payment methods for userId:', userId)
      
      if (!userId) {
        console.log('💳 PaymentMethodSetup - No userId provided, skipping load')
        setLoading(false)
        return
      }

      const supabase = createClient()
      console.log('💳 PaymentMethodSetup - Getting Supabase session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      console.log('💳 PaymentMethodSetup - Session result:', { 
        sessionExists: !!session,
        hasAccessToken: !!session?.access_token,
        sessionError: sessionError?.message,
        userEmail: session?.user?.email
      })
      
      if (sessionError || !session?.access_token) {
        console.error('💳 PaymentMethodSetup - Authentication error:', sessionError)
        setLoading(false)
        return
      }

      console.log('💳 PaymentMethodSetup - Making API call with userId:', userId)
      
      let response;
      try {
        response = await fetch(`/api/user-billing/payment-methods?userId=${userId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })
        console.log('💳 PaymentMethodSetup - API response status:', response.status)
      } catch (fetchError) {
        console.error('💳 PaymentMethodSetup - Fetch error:', fetchError)
        setLoading(false)
        return
      }
      
      if (response.ok) {
        try {
          const data = await response.json()
          console.log('💳 PaymentMethodSetup - API response data:', data)
          console.log('💳 PaymentMethodSetup - Payment methods count:', data.paymentMethods?.length || 0)
          setPaymentMethods(data.paymentMethods || [])
          setSubscriptionStatus(data.subscriptionStatus || '')
        } catch (jsonError) {
          console.error('💳 PaymentMethodSetup - JSON parse error:', jsonError)
        }
      } else {
        try {
          const errorData = await response.json()
          console.error('💳 PaymentMethodSetup - API error response:', response.status, errorData)
        } catch (jsonError) {
          console.error('💳 PaymentMethodSetup - Failed to parse error response:', response.status, jsonError)
        }
      }
    } catch (error) {
      console.error('Error loading payment methods:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPaymentMethod = async () => {
    try {
      setAddingMethod(true)

      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        console.error('Authentication error:', sessionError)
        return
      }

      const response = await fetch('/api/stripe/setup-intent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Redirect to Stripe's hosted setup page
        window.location.href = data.setupUrl
      } else {
        const errorData = await response.json()
        alert(`Failed to setup payment method: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error setting up payment method:', error)
      alert('Error setting up payment method. Please try again.')
    } finally {
      setAddingMethod(false)
    }
  }

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return

    try {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        console.error('Authentication error:', sessionError)
        return
      }

      const response = await fetch('/api/stripe/delete-payment-method', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId }),
      })

      if (response.ok) {
        loadPaymentMethods() // Reload to get updated list
        onPaymentMethodAdded?.()
      } else {
        const errorData = await response.json()
        alert(`Failed to delete payment method: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error deleting payment method:', error)
      alert('Error deleting payment method. Please try again.')
    }
  }

  const handleManageBilling = async () => {
    try {
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token

      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        window.location.href = data.portalUrl
      } else {
        alert('Failed to access billing portal')
      }
    } catch (error) {
      console.error('Error accessing billing portal:', error)
      alert('Error accessing billing portal. Please try again.')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    )
  }

  const hasActiveSubscription = subscriptionStatus === 'active'

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      {hasActiveSubscription && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              Active Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-green-700">Your subscription is active and ready to use.</p>
              <Button onClick={handleManageBilling} variant="outline">
                Manage Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Methods
              </CardTitle>
              <CardDescription>
                Manage your payment methods for subscriptions
              </CardDescription>
            </div>
            <Button
              onClick={handleAddPaymentMethod}
              disabled={addingMethod}
              className="flex items-center gap-2"
            >
              {addingMethod ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Setting up...
                </div>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Payment Method
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment methods</h3>
              <p className="text-gray-600 mb-4">
                Add a payment method to subscribe to our services
              </p>
              <Button onClick={handleAddPaymentMethod} disabled={addingMethod}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Payment Method
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          •••• •••• •••• {method.last4}
                        </span>
                        <span className="text-sm text-gray-500 uppercase">
                          {method.brand}
                        </span>
                        {method.is_default && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Expires {method.exp_month.toString().padStart(2, '0')}/{method.exp_year}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDeletePaymentMethod(method.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={() => window.open('/admin/billing', '_blank')} 
            className="w-full justify-start"
            variant="outline"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            View Available Plans
          </Button>
          
          {hasActiveSubscription && (
            <Button 
              onClick={handleManageBilling} 
              className="w-full justify-start"
              variant="outline"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Manage Billing & Subscription
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
