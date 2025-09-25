'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Check, Star, Zap, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SUBSCRIPTION_PLANS } from '@/lib/stripe-constants'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface UserBilling {
  subscription_status?: string;
  plan_name?: string;
  stripe_customer_id?: string;
  subscription_id?: string;
}

export default function BillingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [userBilling, setUserBilling] = useState<UserBilling>({})
  const [loading, setLoading] = useState(true)
  const [processingCheckout, setProcessingCheckout] = useState<string | null>(null)

  useEffect(() => {
    console.log('Billing page - Auth state:', { 
      authLoading, 
      hasUser: !!user, 
      userId: user?.id,
      userEmail: user?.email 
    })
    
    if (!authLoading) {
      if (!user) {
        console.log('No user found, redirecting to login...')
        router.push('/auth/login')
        return
      }
      console.log('User found, loading billing data...')
      loadUserBilling()
    }
  }, [user, authLoading, router])

  const loadUserBilling = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session?.access_token) {
        console.error('No valid session found:', error)
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/user-billing/status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUserBilling(data)
      } else {
        console.error('Failed to load billing status')
      }
    } catch (error) {
      console.error('Error loading billing status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (planKey: string) => {
    try {
      setProcessingCheckout(planKey)

      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session?.access_token) {
        console.error('No valid session found:', error)
        router.push('/auth/login')
        return
      }

      const plan = SUBSCRIPTION_PLANS[planKey as keyof typeof SUBSCRIPTION_PLANS]
      
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          plan: planKey,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        window.location.href = data.checkoutUrl
      } else {
        const errorData = await response.json()
        alert(`Failed to start checkout: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      alert('Error starting checkout. Please try again.')
    } finally {
      setProcessingCheckout(null)
    }
  }

  const handleManageBilling = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session?.access_token) {
        console.error('No valid session found:', error)
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading billing information...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  const hasActiveSubscription = userBilling.subscription_status === 'active'

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscriptions</h1>
        <p className="text-gray-600">Manage your Lyceum Database Clusters subscription</p>
      </div>

      {/* Current Plan Status */}
      {hasActiveSubscription && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {userBilling.subscription_status?.toUpperCase()}
                  </Badge>
                  <span className="font-semibold">
                    {userBilling.plan_name?.charAt(0).toUpperCase() + userBilling.plan_name?.slice(1) || 'Unknown Plan'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Your subscription is active and ready to use.
                </p>
              </div>
              <Button onClick={handleManageBilling} variant="outline">
                Manage Billing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Plans */}
      <div className="mb-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
          <p className="text-gray-600">Select the perfect plan for your database cluster needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
            <Card key={key} className={`relative ${key === 'professional' ? 'border-blue-500 shadow-lg' : ''}`}>
              {key === 'professional' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  {key === 'starter' && <Users className="w-5 h-5" />}
                  {key === 'professional' && <Zap className="w-5 h-5" />}
                  {key === 'enterprise' && <Shield className="w-5 h-5" />}
                  {key === 'byod' && <CreditCard className="w-5 h-5" />}
                  {plan.name}
                </CardTitle>
                <div className="text-3xl font-bold text-blue-600">
                  ${plan.price}
                  <span className="text-sm font-normal text-gray-500">/month</span>
                </div>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  onClick={() => handleSubscribe(key)}
                  disabled={processingCheckout === key || hasActiveSubscription}
                  className={`w-full ${key === 'professional' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  variant={key === 'professional' ? 'default' : 'outline'}
                >
                  {processingCheckout === key ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </div>
                  ) : hasActiveSubscription ? (
                    'Current Plan'
                  ) : (
                    'Get Started'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Comparison</CardTitle>
          <CardDescription>
            Compare features across all plans to find what works best for you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Feature</th>
                  <th className="text-center py-2">Starter</th>
                  <th className="text-center py-2">Professional</th>
                  <th className="text-center py-2">Enterprise</th>
                  <th className="text-center py-2">BYOD</th>
                </tr>
              </thead>
              <tbody className="space-y-2">
                <tr className="border-b">
                  <td className="py-2 font-medium">Max Users</td>
                  <td className="text-center py-2">5</td>
                  <td className="text-center py-2">25</td>
                  <td className="text-center py-2">Unlimited</td>
                  <td className="text-center py-2">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Max Clusters</td>
                  <td className="text-center py-2">1</td>
                  <td className="text-center py-2">5</td>
                  <td className="text-center py-2">Unlimited</td>
                  <td className="text-center py-2">1</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Data Storage</td>
                  <td className="text-center py-2">10GB</td>
                  <td className="text-center py-2">100GB</td>
                  <td className="text-center py-2">1TB</td>
                  <td className="text-center py-2">Your Own</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Support</td>
                  <td className="text-center py-2">Email</td>
                  <td className="text-center py-2">Priority</td>
                  <td className="text-center py-2">Dedicated</td>
                  <td className="text-center py-2">Email</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">API Access</td>
                  <td className="text-center py-2">-</td>
                  <td className="text-center py-2">✓</td>
                  <td className="text-center py-2">Full</td>
                  <td className="text-center py-2">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
