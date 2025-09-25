'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CreditCard, Check, AlertCircle, User, ArrowLeft, DollarSign, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import PaymentMethodSetup from '@/components/billing/PaymentMethodSetup'
import { supabase } from '@/lib/supabase'

interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  company?: string;
}

interface UserBilling {
  subscription_status?: string;
  plan_name?: string;
  stripe_customer_id?: string;
  subscription_id?: string;
  payment_method_verified?: boolean;
}

interface AssignedCluster {
  id: string;
  name: string;
  cluster_key: string;
  cluster_type: string;
  status: string;
  access_level: string;
  is_billing_admin: boolean;
}

export default function UserBillingPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params?.userId as string
  
  const [user, setUser] = useState<User | null>(null)
  const [userBilling, setUserBilling] = useState<UserBilling>({})
  const [assignedClusters, setAssignedClusters] = useState<AssignedCluster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      loadUserBillingData()
    }
  }, [userId])

  const loadUserBillingData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current session from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required. Please refresh the page.')
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }

      // Load user profile
      const userResponse = await fetch(`/api/admin/users/${userId}/profile`, { headers })
      if (!userResponse.ok) {
        const errorData = await userResponse.json()
        throw new Error(errorData.error || 'Failed to load user profile')
      }
      const userData = await userResponse.json()
      setUser(userData.user || userData)

      // Load user billing status
      const billingResponse = await fetch(`/api/admin/users/${userId}/billing-status`, { headers })
      if (billingResponse.ok) {
        const billingData = await billingResponse.json()
        setUserBilling(billingData.billing || billingData)
      }

      // Load assigned clusters where user is billing admin
      const clustersResponse = await fetch(`/api/admin/users/${userId}/assigned-clusters`, { headers })
      if (clustersResponse.ok) {
        const clustersData = await clustersResponse.json()
        setAssignedClusters(clustersData.clusters || [])
      }

    } catch (error: any) {
      console.error('Error loading user billing data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSetupStripeCustomer = async () => {
    try {
      // Get current session from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        alert('Authentication required. Please refresh the page.')
        return
      }

      const response = await fetch(`/api/admin/users/${userId}/setup-stripe-customer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        await loadUserBillingData()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message}`)
      }
    } catch (error) {
      console.error('Error setting up Stripe customer:', error)
      alert('Failed to setup Stripe customer')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading user billing information...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Error Loading User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error || 'User not found'}</p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const billingAdminClusters = assignedClusters.filter(cluster => cluster.is_billing_admin)
  const hasPaymentMethod = userBilling.stripe_customer_id && userBilling.payment_method_verified

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <User className="w-8 h-8" />
                Billing Setup for {user.full_name || user.email}
              </h1>
              <p className="text-gray-600 mt-1">Configure payment information and manage cluster billing</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-lg">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-lg">{user.full_name || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Company</label>
                  <p className="text-lg">{user.company || 'Not set'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Responsibility */}
          {billingAdminClusters.length > 0 && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Billing Administrator For
                </CardTitle>
                <CardDescription>
                  This user is responsible for paying for the following clusters:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {billingAdminClusters.map((cluster) => (
                    <div key={cluster.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium">{cluster.name}</p>
                        <p className="text-sm text-gray-600">
                          {cluster.cluster_key} • {cluster.cluster_type} • {cluster.status}
                        </p>
                      </div>
                      <Badge variant="outline">Billing Admin</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Information Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Stripe Customer</p>
                    <p className="text-sm text-gray-600">
                      {userBilling.stripe_customer_id ? 'Created' : 'Not created'}
                    </p>
                  </div>
                  <Badge variant={userBilling.stripe_customer_id ? 'default' : 'secondary'}>
                    {userBilling.stripe_customer_id ? 'Active' : 'Pending'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Payment Method</p>
                    <p className="text-sm text-gray-600">
                      {hasPaymentMethod ? 'Configured and verified' : 'Not configured'}
                    </p>
                  </div>
                  <Badge variant={hasPaymentMethod ? 'default' : 'destructive'}>
                    {hasPaymentMethod ? 'Verified' : 'Required'}
                  </Badge>
                </div>

                {userBilling.subscription_status && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Subscription Status</p>
                      <p className="text-sm text-gray-600">
                        {userBilling.plan_name || 'Unknown Plan'} • {userBilling.subscription_status}
                      </p>
                    </div>
                    <Badge variant={userBilling.subscription_status === 'active' ? 'default' : 'secondary'}>
                      {userBilling.subscription_status}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Setup Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Setup Payment Information
              </CardTitle>
              <CardDescription>
                Configure payment methods for this user to enable cluster billing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!userBilling.stripe_customer_id ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This user needs a Stripe customer account before adding payment methods.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    Stripe customer account is ready. Payment methods can be added below.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                {!userBilling.stripe_customer_id && (
                  <Button onClick={handleSetupStripeCustomer} className="w-full">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Create Stripe Customer Account
                  </Button>
                )}

                {userBilling.stripe_customer_id && (
                  <div className="space-y-4">
                    <Separator />
                    <h4 className="font-medium">Payment Method Management</h4>
                    <PaymentMethodSetup 
                      userId={userId} 
                      onPaymentMethodAdded={loadUserBillingData}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Back Navigation */}
          <div className="text-center">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cluster Management
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
