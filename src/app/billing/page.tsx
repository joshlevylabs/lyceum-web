'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CreditCard,
  Check,
  Star,
  ShieldCheck,
  DownloadSimple,
  Cloud,
  Desktop,
  PuzzlePiece,
  ArrowLeft,
  Lightning,
  UsersThree,
  Lock,
  TrendUp,
  Database,
  Code,
  ChartLine,
  Gauge,
  PlayCircle
} from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  const [activeTab, setActiveTab] = useState('desktop')

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login')
        return
      }
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
      }
    } catch (error) {
      console.error('Error creating billing portal session:', error)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-500 mx-auto mb-4"></div>
          <p className="text-foreground/60">Loading billing information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
          <div className="flex lg:flex-1">
            <Link href="/dashboard" className="flex items-center text-sm font-semibold text-foreground hover:text-cyan-400">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
          <div className="flex lg:flex-1 lg:justify-end">
            <div className="flex items-center">
              <div className="h-8 w-8 flex items-center justify-center rounded bg-gradient-to-br from-cyan-500 to-cyan-600">
                <span className="text-lg font-bold text-black">L</span>
              </div>
              <span className="ml-3 text-xl font-bold text-foreground">Lyceum</span>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero section with gradient background */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>

        <div className="mx-auto max-w-4xl py-16 sm:py-20 lg:py-24">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Choose Your Plan
            </h1>
            <p className="mt-4 text-base leading-7 text-foreground/60">
              Select the perfect combination of products for your needs. All plans include a 30-day free trial.
            </p>
          </div>
        </div>
      </div>

      {/* Current Subscription Status */}
      {userBilling.subscription_status && (
        <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-12">
          <div className="mx-auto max-w-2xl glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Current Subscription</h3>
                <p className="mt-1 text-sm text-foreground/60">
                  Plan: <span className="font-medium text-foreground">{userBilling.plan_name || 'Unknown'}</span>
                </p>
                <p className="text-sm text-foreground/60">
                  Status: <span className="font-medium text-emerald-400">{userBilling.subscription_status}</span>
                </p>
              </div>
              <button
                onClick={handleBillingPortal}
                className="btn-primary"
              >
                Manage Billing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Categories */}
      <div className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="flex justify-center mb-12">
              <TabsList className="inline-flex items-center justify-center rounded-lg glass-card p-1 relative z-10">
                <TabsTrigger
                  value="desktop"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-foreground/60 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 data-[state=active]:shadow-sm"
                >
                  <DownloadSimple className="w-4 h-4 mr-2 inline" />
                  Desktop App
                </TabsTrigger>
                <TabsTrigger
                  value="clusters"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-foreground/60 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 data-[state=active]:shadow-sm"
                >
                  <Desktop className="w-4 h-4 mr-2 inline" />
                  Cloud Clusters
                </TabsTrigger>
                <TabsTrigger
                  value="plugins"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-foreground/60 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 data-[state=active]:shadow-sm"
                >
                  <PuzzlePiece className="w-4 h-4 mr-2 inline" />
                  Plugins
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Desktop Application Plans */}
            <TabsContent value="desktop" className="space-y-12">
              {/* Product Overview */}
              <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-base font-semibold leading-7 text-cyan-400">Desktop Application</h2>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Professional-grade analytics platform for your desktop
                </p>
                <p className="mt-4 text-base leading-7 text-foreground/60">
                  Native Lyceum brings enterprise-level measurement analysis, data visualization, and collaboration tools directly to your Windows, Mac, or Linux machine. Built for engineers, analysts, and teams who demand precision and performance.
                </p>
              </div>

              {/* Key Features Grid */}
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                <div className="text-center p-6">
                  <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <ChartLine className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">Advanced Visualization</h3>
                  <p className="mt-2 text-sm text-foreground/60">
                    Interactive charts with real-time data updates, measurement flagging, and statistical analysis
                  </p>
                </div>
                <div className="text-center p-6">
                  <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <Lightning className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">Lightning Fast</h3>
                  <p className="mt-2 text-sm text-foreground/60">
                    Native performance for handling large datasets with millions of data points
                  </p>
                </div>
                <div className="text-center p-6">
                  <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <Lock className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">Secure & Private</h3>
                  <p className="mt-2 text-sm text-foreground/60">
                    Your data stays on your machine. No cloud upload required for offline analysis
                  </p>
                </div>
              </div>

              {/* Screenshot/Video Placeholder */}
              <div className="relative rounded-xl overflow-hidden shadow-2xl bg-background max-w-5xl mx-auto">
                <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                  <div className="text-center">
                    <PlayCircle className="h-20 w-20 text-foreground/80 mx-auto mb-4" />
                    <p className="text-foreground/80 text-lg font-medium">Product Demo Video</p>
                    <p className="text-foreground/60 text-sm mt-2">See the desktop app in action</p>
                  </div>
                </div>
              </div>

              {/* Customer Testimonials */}
              <div className="glass-card p-8 max-w-5xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" weight="fill" />
                      ))}
                    </div>
                    <p className="text-foreground italic mb-4">
                      "Lyceum has transformed how we analyze test data. The speed and precision are unmatched. Our team's productivity increased by 40%."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-black font-semibold">
                        JD
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">John Davidson</p>
                        <p className="text-xs text-foreground/60">Lead Engineer, TechCorp Industries</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" weight="fill" />
                      ))}
                    </div>
                    <p className="text-foreground italic mb-4">
                      "The most intuitive analytics platform we've used. Setup took minutes, not days. The ROI was immediate."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        SM
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Sarah Martinez</p>
                        <p className="text-xs text-foreground/60">Director of QA, Aerospace Solutions</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="text-center pt-8">
                <h3 className="text-xl font-bold text-foreground">Choose Your Plan</h3>
                <p className="mt-2 text-sm text-foreground/60">
                  Select the plan that fits your team size and requirements
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mt-8">
                {/* Basic Plan */}
                <div className="relative glass-card p-8">
                  <Badge className="absolute top-6 right-6 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">30-Day Trial</Badge>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600">
                      <DownloadSimple className="h-6 w-6 text-black" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Basic</h3>
                  <p className="mt-2 text-sm text-foreground/60">Perfect for individuals and small teams</p>
                  <p className="mt-6">
                    <span className="text-4xl font-bold tracking-tight text-foreground">$49</span>
                    <span className="text-sm font-semibold leading-6 text-foreground/60">/month</span>
                  </p>
                  <ul className="mt-8 space-y-3 text-sm leading-6 text-foreground/60">
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-cyan-400" />
                      1 Desktop License
                    </li>
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-cyan-400" />
                      Advanced Analytics
                    </li>
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-cyan-400" />
                      Email Support
                    </li>
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-cyan-400" />
                      Auto-updates
                    </li>
                  </ul>
                  <button
                    onClick={() => handleSubscribe('starter')}
                    disabled={processingCheckout === 'starter'}
                    className="mt-8 w-full btn-primary"
                  >
                    {processingCheckout === 'starter' ? 'Processing...' : 'Start Free Trial'}
                  </button>
                </div>

                {/* Professional Plan */}
                <div className="relative glass-card p-8 border-2 border-cyan-500/20">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-black px-4 py-1 text-sm font-medium shadow-md flex items-center">
                      <Star className="w-3 h-3 mr-1" weight="fill" />
                      Most Popular
                    </Badge>
                  </div>
                  <Badge className="absolute top-6 right-6 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">30-Day Trial</Badge>
                  <div className="flex items-center justify-between mb-6 pt-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600">
                      <DownloadSimple className="h-6 w-6 text-black" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Professional</h3>
                  <p className="mt-2 text-sm text-foreground/60">For growing teams and power users</p>
                  <p className="mt-6">
                    <span className="text-4xl font-bold tracking-tight text-foreground">$149</span>
                    <span className="text-sm font-semibold leading-6 text-foreground/60">/month</span>
                  </p>
                  <ul className="mt-8 space-y-3 text-sm leading-6 text-foreground/60">
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-cyan-400" />
                      <span className="font-medium">Everything in Basic, plus:</span>
                    </li>
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-cyan-400" />
                      5 Desktop Licenses (total)
                    </li>
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-cyan-400" />
                      Priority Support
                    </li>
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-cyan-400" />
                      API Access
                    </li>
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-cyan-400" />
                      Ticket Support
                    </li>
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-cyan-400" />
                      Onboarding Sessions
                    </li>
                  </ul>
                  <button
                    onClick={() => handleSubscribe('professional')}
                    disabled={processingCheckout === 'professional'}
                    className="mt-8 w-full btn-primary"
                  >
                    {processingCheckout === 'professional' ? 'Processing...' : 'Start Free Trial'}
                  </button>
                </div>

                {/* Enterprise Plan */}
                <div className="relative glass-card p-8">
                  <Badge className="absolute top-6 right-6 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">30-Day Trial</Badge>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                      <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Enterprise</h3>
                  <p className="mt-2 text-sm text-foreground/60">For large organizations</p>
                  <p className="mt-6">
                    <span className="text-4xl font-bold tracking-tight text-foreground">$399</span>
                    <span className="text-sm font-semibold leading-6 text-foreground/60">/month</span>
                  </p>
                  <ul className="mt-8 space-y-3 text-sm leading-6 text-foreground/60">
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-cyan-400" />
                      <span className="font-medium">Everything in Professional, plus:</span>
                    </li>
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-cyan-400" />
                      Unlimited Desktop Licenses
                    </li>
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-cyan-400" />
                      Advanced Security Features
                    </li>
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-cyan-400" />
                      SSO Integration
                    </li>
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-cyan-400" />
                      24/7 Dedicated Support
                    </li>
                    <li className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-cyan-400" />
                      Custom Integrations
                    </li>
                  </ul>
                  <button
                    onClick={() => handleSubscribe('enterprise')}
                    disabled={processingCheckout === 'enterprise'}
                    className="mt-8 w-full btn-primary"
                  >
                    {processingCheckout === 'enterprise' ? 'Processing...' : 'Start Free Trial'}
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* Cloud Clusters - Coming Soon */}
            <TabsContent value="clusters" className="space-y-12">
              {/* Product Overview */}
              <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-base font-semibold leading-7 text-cyan-400">Cloud Database Clusters</h2>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Scalable cloud infrastructure for team collaboration
                </p>
                <p className="mt-4 text-base leading-7 text-foreground/60">
                  Deploy managed PostgreSQL clusters optimized for analytics workloads. Share data across your organization, enable real-time collaboration, and scale seamlessly from small teams to enterprise deployments.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-sm font-medium">
                  <TrendUp className="h-4 w-4" />
                  Coming Q2 2025
                </div>
              </div>

              {/* Key Features Grid */}
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                <div className="text-center p-6">
                  <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <Gauge className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">Auto-Scaling</h3>
                  <p className="mt-2 text-sm text-foreground/60">
                    Automatically scales compute and storage based on your team's needs
                  </p>
                </div>
                <div className="text-center p-6">
                  <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <UsersThree className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">Real-Time Collaboration</h3>
                  <p className="mt-2 text-sm text-foreground/60">
                    Multiple users can work on the same datasets simultaneously
                  </p>
                </div>
                <div className="text-center p-6">
                  <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <Database className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">Managed Backups</h3>
                  <p className="mt-2 text-sm text-foreground/60">
                    Automated daily backups with point-in-time recovery
                  </p>
                </div>
              </div>

              {/* Screenshot Placeholder */}
              <div className="relative rounded-xl overflow-hidden shadow-2xl bg-background max-w-5xl mx-auto">
                <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
                  <div className="text-center">
                    <Desktop className="h-20 w-20 text-foreground/80 mx-auto mb-4" />
                    <p className="text-foreground/80 text-lg font-medium">Cluster Management Dashboard</p>
                    <p className="text-foreground/60 text-sm mt-2">Preview coming soon</p>
                  </div>
                </div>
              </div>

              {/* Early Access Banner */}
              <div className="bg-gradient-to-r from-cyan-600 to-purple-600 rounded-2xl p-8 max-w-5xl mx-auto text-center">
                <h3 className="text-2xl font-bold text-white mb-3">Be among the first to experience Cloud Clusters</h3>
                <p className="text-cyan-100 mb-6 max-w-2xl mx-auto">
                  Join our early access program and get 3 months free when we launch in Q2 2025. Limited spots available.
                </p>
                <button className="bg-white text-cyan-600 hover:bg-cyan-50 font-semibold px-8 py-2.5 rounded-lg transition-colors">
                  Request Early Access
                </button>
              </div>

              {/* Pricing Section */}
              <div className="text-center pt-8">
                <h3 className="text-xl font-bold text-foreground">Projected Pricing</h3>
                <p className="mt-2 text-sm text-foreground/60">
                  Pricing structure for reference - subject to change
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mt-8 opacity-60">
                {[
                  { name: 'Small', price: '$49', icon: Cloud, specs: ['2 vCPUs', '4 GB RAM', '50 GB Storage', 'Up to 5 Users'] },
                  { name: 'Medium', price: '$149', icon: Cloud, specs: ['4 vCPUs', '16 GB RAM', '200 GB Storage', 'Up to 25 Users'] },
                  { name: 'Large', price: '$399', icon: Desktop, specs: ['8 vCPUs', '32 GB RAM', '1 TB Storage', 'Unlimited Users'] }
                ].map((plan) => (
                  <div key={plan.name} className="relative glass-card p-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-foreground/20 mb-6">
                      <plan.icon className="h-6 w-6 text-foreground/60" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                    <p className="mt-6">
                      <span className="text-4xl font-bold tracking-tight text-foreground">{plan.price}</span>
                      <span className="text-sm font-semibold leading-6 text-foreground/60">/month</span>
                    </p>
                    <ul className="mt-8 space-y-3 text-sm leading-6 text-foreground/60">
                      {plan.specs.map((spec) => (
                        <li key={spec} className="flex gap-x-3">
                          <Check className="h-6 w-5 flex-none text-foreground/40" />
                          {spec}
                        </li>
                      ))}
                    </ul>
                    <button disabled className="mt-8 w-full rounded-md bg-foreground/20 px-3.5 py-2.5 text-center text-sm font-semibold text-foreground/60 cursor-not-allowed">
                      Coming Soon
                    </button>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Plugins - Coming Soon */}
            <TabsContent value="plugins" className="space-y-12">
              {/* Product Overview */}
              <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-base font-semibold leading-7 text-cyan-400">Plugin Marketplace</h2>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Extend Lyceum with powerful integrations
                </p>
                <p className="mt-4 text-base leading-7 text-foreground/60">
                  Access a curated marketplace of plugins built by Lyceum and our partner ecosystem. Add machine learning capabilities, custom visualizations, industry-specific analysis tools, and integrations with your existing workflow.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-sm font-medium">
                  <Code className="h-4 w-4" />
                  Coming Q3 2025
                </div>
              </div>

              {/* Featured Plugins Preview */}
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                <div className="glass-card p-6">
                  <div className="h-12 w-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 mb-4">
                    <TrendUp className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">ML Prediction Toolkit</h3>
                  <p className="text-xs text-foreground/60 mb-3">
                    Advanced machine learning models for predictive analysis and anomaly detection
                  </p>
                  <span className="text-xs text-purple-400 font-medium">By Lyceum Labs</span>
                </div>
                <div className="glass-card p-6">
                  <div className="h-12 w-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 mb-4">
                    <Database className="h-6 w-6 text-black" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Enterprise Connectors</h3>
                  <p className="text-xs text-foreground/60 mb-3">
                    Connect to SAP, Oracle, Salesforce, and other enterprise systems
                  </p>
                  <span className="text-xs text-cyan-400 font-medium">By Integration Partners</span>
                </div>
                <div className="glass-card p-6">
                  <div className="h-12 w-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 mb-4">
                    <ChartLine className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Advanced Visualization</h3>
                  <p className="text-xs text-foreground/60 mb-3">
                    3D plotting, heatmaps, and industry-specific chart types
                  </p>
                  <span className="text-xs text-orange-400 font-medium">By Lyceum Labs</span>
                </div>
              </div>

              {/* Developer Preview */}
              <div className="relative rounded-xl overflow-hidden shadow-2xl bg-background max-w-5xl mx-auto">
                <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <div className="text-center">
                    <Code className="h-20 w-20 text-foreground/80 mx-auto mb-4" />
                    <p className="text-foreground/80 text-lg font-medium">Plugin Marketplace</p>
                    <p className="text-foreground/60 text-sm mt-2">Browse, install, and manage plugins</p>
                  </div>
                </div>
              </div>

              {/* Developer Program */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 max-w-5xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-3">Build Your Own Plugins</h3>
                    <p className="text-purple-100 mb-6">
                      Join our developer program and create custom plugins for your team or publish to the marketplace. Full SDK documentation and support provided.
                    </p>
                    <button className="bg-white text-purple-600 hover:bg-purple-50 font-semibold px-6 py-2.5 rounded-lg transition-colors">
                      Join Developer Program
                    </button>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Code className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">Plugin SDK</p>
                        <p className="text-purple-200 text-xs">TypeScript & Python Support</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                        <UsersThree className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">Revenue Sharing</p>
                        <p className="text-purple-200 text-xs">Earn from marketplace sales</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="text-center pt-8">
                <h3 className="text-xl font-bold text-foreground">Plugin Pricing</h3>
                <p className="mt-2 text-sm text-foreground/60">
                  Individual plugins priced separately
                </p>
              </div>

              <div className="max-w-3xl mx-auto opacity-60">
                <div className="relative glass-card p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Plugin Marketplace Access</h3>
                      <p className="mt-2 text-sm text-foreground/60">Access to all available plugins and extensions</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-foreground/20">
                      <PuzzlePiece className="h-6 w-6 text-foreground/60" />
                    </div>
                  </div>
                  <p className="mt-6">
                    <span className="text-4xl font-bold tracking-tight text-foreground">$25</span>
                    <span className="text-sm font-semibold leading-6 text-foreground/60">/month per plugin</span>
                  </p>
                  <div className="mt-8 grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Available Plugins:</h4>
                      <ul className="space-y-2 text-sm text-foreground/60">
                        <li className="flex gap-x-2"><Check className="h-5 w-5 flex-none text-foreground/40" />Advanced Visualization</li>
                        <li className="flex gap-x-2"><Check className="h-5 w-5 flex-none text-foreground/40" />ML Toolkit</li>
                        <li className="flex gap-x-2"><Check className="h-5 w-5 flex-none text-foreground/40" />Data Import/Export</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Features:</h4>
                      <ul className="space-y-2 text-sm text-foreground/60">
                        <li className="flex gap-x-2"><Check className="h-5 w-5 flex-none text-foreground/40" />Automatic updates</li>
                        <li className="flex gap-x-2"><Check className="h-5 w-5 flex-none text-foreground/40" />Documentation</li>
                        <li className="flex gap-x-2"><Check className="h-5 w-5 flex-none text-foreground/40" />Priority support</li>
                      </ul>
                    </div>
                  </div>
                  <button disabled className="mt-8 w-full rounded-md bg-foreground/20 px-3.5 py-2.5 text-center text-sm font-semibold text-foreground/60 cursor-not-allowed">
                    Coming Soon
                  </button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-background">
        <div className="px-6 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              All plans include a risk-free trial
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-foreground/60">
              Start with a 30-day free trial. Cancel anytime with no penalties or long-term contracts.
            </p>
            <div className="mt-8 flex items-center justify-center gap-x-6">
              <Link
                href="/dashboard"
                className="text-sm font-semibold leading-6 text-foreground hover:text-cyan-400"
              >
                View dashboard <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
