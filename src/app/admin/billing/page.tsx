'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Check, Star, Lightning, ShieldCheck, UsersThree } from '@phosphor-icons/react'
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
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/20 border-t-cyan-500 mx-auto"></div>
          <p className="mt-4 text-foreground/60">Loading billing information...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-foreground/60">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  const hasActiveSubscription = userBilling.subscription_status === 'active'

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Billing & Subscriptions</h1>
        <p className="text-foreground/60">Manage your Lyceum Database Clusters subscription</p>
      </div>

      {/* Current Plan Status */}
      {hasActiveSubscription && (
        <div className="glass-card mb-8 p-6">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            Current Subscription
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  {userBilling.subscription_status?.toUpperCase()}
                </Badge>
                <span className="font-semibold text-foreground">
                  {userBilling.plan_name ? userBilling.plan_name.charAt(0).toUpperCase() + userBilling.plan_name.slice(1) : 'Unknown Plan'}
                </span>
              </div>
              <p className="text-sm text-foreground/60">
                Your subscription is active and ready to use.
              </p>
            </div>
            <button onClick={handleManageBilling} className="btn-ghost">
              Manage Billing
            </button>
          </div>
        </div>
      )}

      {/* Pricing Plans */}
      <div className="mb-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Choose Your Plan</h2>
          <p className="text-foreground/60">Select the perfect plan for your database cluster needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
            <div key={key} className={`glass-card relative p-6 ${key === 'professional' ? 'border-cyan-500/20 shadow-lg shadow-cyan-500/10' : ''}`}>
              {key === 'professional' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                    <Star className="w-3 h-3 mr-1" weight="fill" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                  {key === 'starter' && <UsersThree className="w-5 h-5 text-cyan-400" weight="duotone" />}
                  {key === 'professional' && <Lightning className="w-5 h-5 text-cyan-400" weight="duotone" />}
                  {key === 'enterprise' && <ShieldCheck className="w-5 h-5 text-cyan-400" weight="duotone" />}
                  {key === 'byod' && <CreditCard className="w-5 h-5 text-cyan-400" weight="duotone" />}
                  <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                </div>
                <div className="text-3xl font-bold text-cyan-400">
                  ${plan.price}
                  <span className="text-sm font-normal text-foreground/60">/month</span>
                </div>
              </div>

              <div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-foreground/60">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" weight="bold" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(key)}
                  disabled={processingCheckout === key || hasActiveSubscription}
                  className={`w-full ${key === 'professional' ? 'btn-primary' : 'btn-ghost'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {processingCheckout === key ? (
                    <div className="flex items-center gap-2 justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-500/20 border-t-cyan-500"></div>
                      Processing...
                    </div>
                  ) : hasActiveSubscription ? (
                    'Current Plan'
                  ) : (
                    'Get Started'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Comparison */}
      <div className="glass-card p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">Plan Comparison</h2>
          <p className="text-sm text-foreground/60">
            Compare features across all plans to find what works best for you
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cyan-500/20">
                <th className="text-left py-2 text-foreground">Feature</th>
                <th className="text-center py-2 text-foreground">Starter</th>
                <th className="text-center py-2 text-foreground">Professional</th>
                <th className="text-center py-2 text-foreground">Enterprise</th>
                <th className="text-center py-2 text-foreground">BYOD</th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              <tr className="border-b border-cyan-500/20">
                <td className="py-2 font-medium text-foreground">Max Users</td>
                <td className="text-center py-2 text-foreground/60">5</td>
                <td className="text-center py-2 text-foreground/60">25</td>
                <td className="text-center py-2 text-foreground/60">Unlimited</td>
                <td className="text-center py-2 text-foreground/60">Unlimited</td>
              </tr>
              <tr className="border-b border-cyan-500/20">
                <td className="py-2 font-medium text-foreground">Max Clusters</td>
                <td className="text-center py-2 text-foreground/60">1</td>
                <td className="text-center py-2 text-foreground/60">5</td>
                <td className="text-center py-2 text-foreground/60">Unlimited</td>
                <td className="text-center py-2 text-foreground/60">1</td>
              </tr>
              <tr className="border-b border-cyan-500/20">
                <td className="py-2 font-medium text-foreground">Data Storage</td>
                <td className="text-center py-2 text-foreground/60">10GB</td>
                <td className="text-center py-2 text-foreground/60">100GB</td>
                <td className="text-center py-2 text-foreground/60">1TB</td>
                <td className="text-center py-2 text-foreground/60">Your Own</td>
              </tr>
              <tr className="border-b border-cyan-500/20">
                <td className="py-2 font-medium text-foreground">Support</td>
                <td className="text-center py-2 text-foreground/60">Email</td>
                <td className="text-center py-2 text-foreground/60">Priority</td>
                <td className="text-center py-2 text-foreground/60">Dedicated</td>
                <td className="text-center py-2 text-foreground/60">Email</td>
              </tr>
              <tr>
                <td className="py-2 font-medium text-foreground">API Access</td>
                <td className="text-center py-2 text-foreground/60">-</td>
                <td className="text-center py-2 text-foreground/60">✓</td>
                <td className="text-center py-2 text-foreground/60">Full</td>
                <td className="text-center py-2 text-foreground/60">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
