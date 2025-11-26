'use client'

import React, { useState, useEffect } from 'react'
import { CreditCard, Plus, Trash2, CheckCircle, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
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

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  paid_date?: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded'
  total_cents: number
  subtotal_cents: number
  tax_cents: number
  currency: string
  stripe_invoice_id?: string
  stripe_payment_intent_id?: string
  stripe_charge_id?: string
  stripe_receipt_url?: string
  stripe_transaction_id?: string
  payment_method_last4?: string
  payment_method_brand?: string
  line_items?: InvoiceLineItem[]
}

interface InvoiceLineItem {
  id: string
  name: string
  description: string
  quantity: number
  unit_price_cents: number
  total_price_cents: number
}

interface BillingInfo {
  success: boolean
  preview: {
    lineItems: Array<{
      name: string
      description: string
      quantity: number
      unitPrice: number
      totalPrice: number
    }>
    totalAmount: number
    monthlyTotal: string
    summary: string
  }
  usage: any
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
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(true)
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [testingBilling, setTestingBilling] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set())
  const [invoiceDetails, setInvoiceDetails] = useState<Record<string, Invoice>>({})

  // Stripe charges state
  const [stripeCharges, setStripeCharges] = useState<any[]>([])
  const [loadingCharges, setLoadingCharges] = useState(true)
  const [refundingCharge, setRefundingCharge] = useState<string | null>(null)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [selectedCharge, setSelectedCharge] = useState<any>(null)
  const [refundRequests, setRefundRequests] = useState<Record<string, any>>({}) // Map charge_id to refund request

  // Active subscriptions state
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([])
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true)

  useEffect(() => {
    if (userId) {
      loadPaymentMethods()
      loadInvoices()
      loadBillingInfo()
      loadCurrentUser()
      loadStripeCharges()
      loadRefundRequests()
      loadActiveSubscriptions()
    }
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

  const loadCurrentUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      setCurrentUser(user)
    } catch (error) {
      console.error('Error loading current user:', error)
    }
  }

  const loadInvoices = async () => {
    try {
      setLoadingInvoices(true)
      console.log('🧾 Invoice system has been disabled - skipping invoice load')

      // Invoice system has been removed - just set empty invoices array
      setInvoices([])
    } catch (error) {
      console.error('Error loading invoices:', error)
      setInvoices([])
    } finally {
      setLoadingInvoices(false)
    }
  }

  const loadInvoiceDetails = async (invoiceId: string) => {
    // Invoice system has been removed - no-op
    console.log('🔍 Invoice system has been disabled - skipping invoice details load')
    return
  }

  const toggleInvoiceExpansion = async (invoiceId: string) => {
    const newExpanded = new Set(expandedInvoices)

    if (expandedInvoices.has(invoiceId)) {
      newExpanded.delete(invoiceId)
    } else {
      newExpanded.add(invoiceId)
      // Load details if not already loaded
      if (!invoiceDetails[invoiceId]) {
        await loadInvoiceDetails(invoiceId)
      }
    }

    setExpandedInvoices(newExpanded)
  }

  const loadBillingInfo = async () => {
    try {
      console.log('💰 Loading billing info for user:', userId)
      
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        console.error('No session for billing info:', sessionError)
        return
      }

      // Use the flexible billing preview API (same as top section)
      const response = await fetch(`/api/stripe/billing-preview`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('💰 Billing info loaded:', data)
        setBillingInfo(data)
      } else {
        console.error('Error response from billing API:', response.status)
      }
    } catch (error) {
      console.error('Error loading billing info:', error)
    }
  }

  const loadStripeCharges = async () => {
    try {
      setLoadingCharges(true)
      console.log('💳 Loading Stripe charges for user:', userId)

      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        console.error('No session for charges:', sessionError)
        return
      }

      const response = await fetch(`/api/stripe/charges`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('💳 Stripe charges loaded:', data)
        setStripeCharges(data.charges || [])
      } else {
        console.error('Error response from charges API:', response.status)
      }
    } catch (error) {
      console.error('Error loading Stripe charges:', error)
    } finally {
      setLoadingCharges(false)
    }
  }

  const loadRefundRequests = async () => {
    try {
      console.log('💸 Loading refund requests for user:', userId)

      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        console.error('No session for refund requests:', sessionError)
        return
      }

      // Fetch refund requests from database
      const { data: requests, error } = await supabase
        .from('refund_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        // If table doesn't exist yet, just set empty and don't log error
        if (error.message?.includes('relation "public.refund_requests" does not exist')) {
          console.log('💸 Refund requests table not yet created - run migration first')
          setRefundRequests({})
          return
        }
        console.error('Error loading refund requests:', error)
        return
      }

      // Create a map of charge_id to refund request for quick lookup
      const requestsMap: Record<string, any> = {}
      requests?.forEach(request => {
        requestsMap[request.charge_id] = request
      })

      console.log('💸 Refund requests loaded:', requestsMap)
      setRefundRequests(requestsMap)
    } catch (error: any) {
      // Gracefully handle errors - just set empty state
      console.log('💸 Unable to load refund requests (table may not exist yet):', error?.message || 'Unknown error')
      setRefundRequests({})
    }
  }

  const loadActiveSubscriptions = async () => {
    try {
      setLoadingSubscriptions(true)
      console.log('📋 Loading active subscriptions for user:', userId)

      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        console.error('No session for subscriptions:', sessionError)
        return
      }

      const response = await fetch(`/api/stripe/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('📋 Active subscriptions loaded:', data)
        setActiveSubscriptions(data.subscriptions || [])
      } else {
        console.error('Error response from subscriptions API:', response.status)
        // If the endpoint doesn't exist yet, set empty array
        setActiveSubscriptions([])
      }
    } catch (error) {
      console.error('Error loading active subscriptions:', error)
      setActiveSubscriptions([])
    } finally {
      setLoadingSubscriptions(false)
    }
  }

  const handleRequestRefund = (charge: any) => {
    setSelectedCharge(charge)
    setRefundDialogOpen(true)
  }

  const handleConfirmRefund = async () => {
    if (!selectedCharge) return

    try {
      setRefundingCharge(selectedCharge.id)

      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        alert('Authentication error. Please try again.')
        return
      }

      const response = await fetch('/api/stripe/refund', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          charge_id: selectedCharge.id,
          reason: 'requested_by_customer'
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Refund request created:', result)
        alert(result.message || '✅ Refund request submitted successfully! An administrator will review your request.')
        await loadRefundRequests() // Reload refund requests to show new status
        setRefundDialogOpen(false)
      } else {
        const error = await response.json()
        alert(`❌ Refund request failed: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error processing refund request:', error)
      alert('❌ Refund request failed: Network error')
    } finally {
      setRefundingCharge(null)
    }
  }

  const handleTestBilling = async () => {
    if (!billingInfo) return

    try {
      setTestingBilling(true)

      const response = await fetch('/api/billing/test-billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your-secure-random-string-here'
        },
        body: JSON.stringify({
          userId: userId,
          amount: billingInfo.preview.totalAmount,
          lineItems: billingInfo.preview.lineItems
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Test billing successful:', result)
        await loadInvoices()
        alert('✅ Test billing completed! Check invoices below.')
      } else {
        const error = await response.json()
        alert(`❌ Test billing failed: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error in test billing:', error)
      alert('❌ Test billing failed: Network error')
    } finally {
      setTestingBilling(false)
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

  const stripeMode = process.env.NEXT_PUBLIC_STRIPE_MODE || 'test'
  const isTestMode = stripeMode === 'test'

  return (
    <div className="space-y-6">
      {/* Stripe Test Mode Banner */}
      {isTestMode && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Test Mode Active
              </h3>
              <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  You're in <strong>Stripe test mode</strong>. No real charges will be made. Use test card <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">4242 4242 4242 4242</code> to test payments.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Paid Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Current Paid Products
          </CardTitle>
          <CardDescription>
            Your active subscriptions and next billing dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSubscriptions ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : activeSubscriptions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No active subscriptions</h3>
              <p className="text-gray-600 dark:text-gray-300">
                You don't have any active paid subscriptions at the moment
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSubscriptions.map((subscription: any) => (
                <div key={subscription.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {subscription.description || subscription.product_name || 'Subscription'}
                        </span>
                        <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                          {subscription.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Started: {new Date(subscription.created * 1000 || subscription.start_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      {subscription.current_period_end && (
                        <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-1">
                          Next billing: {new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-semibold text-lg text-gray-900 dark:text-white">
                        ${((subscription.amount || subscription.plan?.amount || 0) / 100).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        per {subscription.interval || subscription.plan?.interval || 'month'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                Manage your payment methods for billing
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
              <CreditCard className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No payment methods</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Add a payment method to enable billing
              </p>
              <Button onClick={handleAddPaymentMethod} disabled={addingMethod}>
                <Plus className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods?.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          •••• •••• •••• {method.last4}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 uppercase">
                          {method.brand}
                        </span>
                        {method.is_default && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
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

      {/* Past Charges (formerly Stripe Charges) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Past Charges
          </CardTitle>
          <CardDescription>
            All past charges with receipt URLs and refund request options
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCharges ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : stripeCharges.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No charges yet</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Charges will appear here when payments are processed through Stripe
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stripeCharges.map((charge) => {
                const refundRequest = refundRequests[charge.id]
                const hasPendingRequest = refundRequest?.status === 'pending'
                const isApproved = refundRequest?.status === 'approved'
                const isRejected = refundRequest?.status === 'rejected'

                return (
                  <div key={charge.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {charge.description || 'Charge'}
                          </span>
                          <Badge
                            variant={charge.paid ? 'default' : 'secondary'}
                          >
                            {charge.paid ? 'Paid' : charge.status}
                          </Badge>

                          {/* Refund Status Badges */}
                          {hasPendingRequest && (
                            <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
                              Request Pending
                            </Badge>
                          )}
                          {(isApproved || charge.refunded) && (
                            <Badge className="bg-green-600 hover:bg-green-700 text-white">
                              Refunded
                            </Badge>
                          )}
                          {isRejected && (
                            <Badge className="bg-gray-500 hover:bg-gray-600 text-white">
                              Refund Rejected
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {new Date(charge.created * 1000).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>

                        {charge.payment_method_details?.card && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {charge.payment_method_details.card.brand.toUpperCase()} ••••{charge.payment_method_details.card.last4}
                          </p>
                        )}

                        {/* Rejection Message */}
                        {isRejected && (
                          <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm text-gray-700 dark:text-gray-300">
                            <p className="font-medium">Refund request was rejected.</p>
                            {refundRequest.admin_notes && (
                              <p className="text-xs mt-1">Reason: {refundRequest.admin_notes}</p>
                            )}
                            <p className="text-xs mt-1">Please contact your administrator for more details.</p>
                          </div>
                        )}

                        {charge.receipt_url && (
                          <a
                            href={charge.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                          >
                            View Receipt →
                          </a>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-semibold text-lg text-gray-900 dark:text-white">
                          ${(charge.amount / 100).toFixed(2)}
                        </div>
                        {charge.amount_refunded > 0 && (
                          <div className="text-sm text-red-600 dark:text-red-400">
                            -${(charge.amount_refunded / 100).toFixed(2)} refunded
                          </div>
                        )}
                        <div className="text-sm text-gray-600 dark:text-gray-400 uppercase">
                          {charge.currency}
                        </div>
                        {!charge.refunded && !hasPendingRequest && !isApproved && charge.paid && (
                          <Button
                            onClick={() => handleRequestRefund(charge)}
                            variant="outline"
                            size="sm"
                            className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={refundingCharge === charge.id}
                          >
                            {refundingCharge === charge.id ? 'Processing...' : 'Request Refund'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refund Confirmation Dialog */}
      {refundDialogOpen && selectedCharge && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Refund Request
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to request a refund for this charge?
            </p>
            <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${(selectedCharge.amount / 100).toFixed(2)} {selectedCharge.currency.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Date:</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(selectedCharge.created * 1000).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Description:</span>
                <span className="text-gray-900 dark:text-white">
                  {selectedCharge.description || 'N/A'}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setRefundDialogOpen(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRefund}
                disabled={refundingCharge !== null}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {refundingCharge ? 'Processing...' : 'Confirm Refund'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Test Billing System (Admin Only) */}
      {currentUser?.user_metadata?.role === 'admin' && billingInfo && paymentMethods.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              Test Billing System
            </CardTitle>
            <CardDescription className="text-orange-700">
              Generate and process a test invoice for this user's current monthly cost (${billingInfo.preview?.totalAmount ? (billingInfo.preview.totalAmount / 100).toFixed(2) : '0.00'})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleTestBilling}
              disabled={testingBilling}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {testingBilling ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing Test Invoice...
                </div>
              ) : (
                `Create Test Invoice ($${billingInfo.preview?.totalAmount ? (billingInfo.preview.totalAmount / 100).toFixed(2) : '0.00'})`
              )}
            </Button>
            <p className="text-xs text-orange-600 mt-2">
              This will create a real invoice and charge the user's payment method as a test.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
