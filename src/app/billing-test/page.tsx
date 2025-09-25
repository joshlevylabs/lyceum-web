'use client'

import React, { useState, useEffect } from 'react'
import { CreditCard, Check, Star, Zap, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'

// Standalone billing page - no admin layout, no admin checks
export default function StandaloneBillingTestPage() {
  const { user, userProfile, loading } = useAuth()
  const [authDebug, setAuthDebug] = useState<any>({})

  useEffect(() => {
    // Debug auth state
    setAuthDebug({
      loading,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      hasProfile: !!userProfile,
      profileRole: userProfile?.role,
      timestamp: new Date().toISOString()
    })
  }, [user, userProfile, loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Auth Debug Info */}
        <Card className="mb-8 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Loading:</strong> {authDebug.loading ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>User:</strong> {authDebug.hasUser ? '✅ Logged In' : '❌ Not Logged In'}
              </div>
              <div>
                <strong>User ID:</strong> {authDebug.userId || 'None'}
              </div>
              <div>
                <strong>Email:</strong> {authDebug.userEmail || 'None'}
              </div>
              <div>
                <strong>Profile:</strong> {authDebug.hasProfile ? '✅ Found' : '❌ Missing'}
              </div>
              <div>
                <strong>Role:</strong> {authDebug.profileRole || 'None'}
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Last updated: {authDebug.timestamp}
            </div>
          </CardContent>
        </Card>

        {/* Billing Content */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Database Cluster Plans</h1>
          <p className="text-xl text-gray-600">Choose the perfect plan for your data analytics needs</p>
          <Badge className="mt-2">🔧 Standalone Test Page - No Admin Checks</Badge>
        </div>

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
                onClick={() => alert('Starter plan selected! This would integrate with Stripe.')}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Get Started
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
                onClick={() => alert('Professional plan selected! This would integrate with Stripe.')}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Upgrade Now
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
                onClick={() => alert('Enterprise plan selected! This would integrate with Stripe.')}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Contact Sales
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

        {/* Navigation Links */}
        <div className="text-center mt-8 space-x-4">
          <a href="/dashboard" className="text-blue-500 hover:underline">← Back to Dashboard</a>
          <a href="/test-auth" className="text-blue-500 hover:underline">🔧 Auth Diagnostics</a>
        </div>
      </div>
    </div>
  )
}
