'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'

export default function SimpleBillingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('Billing page - Auth loading:', authLoading, 'User:', !!user)
    
    if (!authLoading) {
      if (!user) {
        console.log('No user found, redirecting to login...')
        router.push('/auth/login')
        return
      }
      setLoading(false)
    }
  }, [user, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p>Please wait while we load your billing information.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Database Cluster Plans</h1>
        <p className="text-gray-600">Choose the perfect plan for your data analytics needs</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {/* Starter Plan */}
        <Card className="border-2 hover:border-blue-300 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Starter</span>
              <span className="text-2xl font-bold">$29</span>
            </CardTitle>
            <p className="text-gray-600">Perfect for small teams and testing</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                1 Database Cluster
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Up to 5 Users
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                10GB Storage
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Basic Analytics
              </li>
            </ul>
            <Button className="w-full">
              <CreditCard className="w-4 h-4 mr-2" />
              Get Started
            </Button>
          </CardContent>
        </Card>

        {/* Professional Plan */}
        <Card className="border-2 border-blue-500 hover:border-blue-600 transition-colors relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm">Most Popular</span>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Professional</span>
              <span className="text-2xl font-bold">$99</span>
            </CardTitle>
            <p className="text-gray-600">For growing teams and production workloads</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                5 Database Clusters
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Up to 25 Users
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                100GB Storage
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Advanced Analytics
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Priority Support
              </li>
            </ul>
            <Button className="w-full bg-blue-500 hover:bg-blue-600">
              <CreditCard className="w-4 h-4 mr-2" />
              Upgrade Now
            </Button>
          </CardContent>
        </Card>

        {/* Enterprise Plan */}
        <Card className="border-2 hover:border-purple-300 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Enterprise</span>
              <span className="text-2xl font-bold">$299</span>
            </CardTitle>
            <p className="text-gray-600">For large organizations</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Unlimited Clusters
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Unlimited Users
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                1TB Storage
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Custom Analytics
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                24/7 Support
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                SSO Integration
              </li>
            </ul>
            <Button className="w-full bg-purple-500 hover:bg-purple-600">
              <CreditCard className="w-4 h-4 mr-2" />
              Contact Sales
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="text-center mt-8">
        <p className="text-gray-600 mb-4">All plans include 30-day free trial</p>
        <p className="text-sm text-gray-500">
          Need help choosing? <a href="mailto:support@lyceum.com" className="text-blue-500 hover:underline">Contact our team</a>
        </p>
      </div>
    </div>
  )
}
