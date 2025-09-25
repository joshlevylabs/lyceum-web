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

// Non-admin billing page - accessible to all authenticated users
export default function BillingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [userBilling, setUserBilling] = useState<UserBilling>({})
  const [loading, setLoading] = useState(true)
  const [processingCheckout, setProcessingCheckout] = useState<string | null>(null)

  useEffect(() => {
    console.log('Non-admin Billing page - Auth state:', { 
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
      setLoading(true)
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

      const plan = SUBSCRIPTION_PLANS[planKey]
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
        const { checkoutUrl } = await response.json()
        window.location.href = checkoutUrl
      } else {
        console.error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
    } finally {
      setProcessingCheckout(null)
    }
  }

  const handleBillingPortal = async () => {
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
        const { portalUrl } = await response.json()
        window.location.href = portalUrl
      } else {
        console.error('Failed to create billing portal session')
      }
    } catch (error) {
      console.error('Error creating billing portal session:', error)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading billing information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Database Cluster Plans</h1>
          <p className="text-xl text-gray-600 mb-2">Choose the perfect plan for your data analytics needs</p>
          <Badge className="bg-green-100 text-green-800">✅ Authentication Working</Badge>
        </div>

        {/* Current Subscription Status */}
        {userBilling.subscription_status && (
          <Card className="mb-8 border-blue-200">
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Plan: {userBilling.plan_name || 'Unknown'}</p>
                  <p className="text-sm text-gray-600">Status: {userBilling.subscription_status}</p>
                </div>
                <Button onClick={handleBillingPortal} variant="outline">
                  Manage Billing
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Starter Plan */}
          <Card className="border-2 hover:border-blue-300 transition-all duration-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Starter</CardTitle>
                <Zap className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">$29</span>
                <span className="text-gray-500">/month</span>
              </div>
              <CardDescription>Perfect for small teams and testing</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>1 Database Cluster</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Up to 5 Users</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>10GB Storage</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Basic Analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Email Support</span>
                </li>
              </ul>
              <Button 
                className="w-full"
                onClick={() => handleSubscribe('starter')}
                disabled={processingCheckout === 'starter'}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {processingCheckout === 'starter' ? 'Processing...' : 'Get Started'}
              </Button>
            </CardContent>
          </Card>

          {/* Professional Plan */}
          <Card className="border-2 border-blue-500 shadow-lg relative transform hover:scale-105 transition-all duration-200">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-blue-500 text-white px-4 py-1 text-sm font-medium">
                <Star className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Professional</CardTitle>
                <Zap className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">$99</span>
                <span className="text-gray-500">/month</span>
              </div>
              <CardDescription>For growing teams and production workloads</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>5 Database Clusters</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Up to 25 Users</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>100GB Storage</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Advanced Analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Priority Support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>API Access</span>
                </li>
              </ul>
              <Button 
                className="w-full bg-blue-500 hover:bg-blue-600"
                onClick={() => handleSubscribe('professional')}
                disabled={processingCheckout === 'professional'}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {processingCheckout === 'professional' ? 'Processing...' : 'Upgrade Now'}
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className="border-2 hover:border-purple-300 transition-all duration-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <Zap className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">$299</span>
                <span className="text-gray-500">/month</span>
              </div>
              <CardDescription>For large organizations</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Unlimited Clusters</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Unlimited Users</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>1TB Storage</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Custom Analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>24/7 Support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>SSO Integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Dedicated Account Manager</span>
                </li>
              </ul>
              <Button 
                className="w-full bg-purple-500 hover:bg-purple-600"
                onClick={() => handleSubscribe('enterprise')}
                disabled={processingCheckout === 'enterprise'}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {processingCheckout === 'enterprise' ? 'Processing...' : 'Contact Sales'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12 space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">All plans include:</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>30-day free trial</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>99.9% uptime SLA</span>
              </div>
            </div>
          </div>
          
          <p className="text-gray-600">
            Need help choosing? {' '}
            <a href="mailto:support@lyceum.com" className="text-blue-500 hover:underline font-medium">
              Contact our team
            </a>
          </p>
        </div>

        {/* Navigation */}
        <div className="text-center mt-8 space-x-4">
          <a href="/dashboard" className="text-blue-500 hover:underline">← Back to Dashboard</a>
          <a href="/billing-test" className="text-blue-500 hover:underline">🔧 Auth Test Page</a>
        </div>
      </div>
    </div>
  )
}
