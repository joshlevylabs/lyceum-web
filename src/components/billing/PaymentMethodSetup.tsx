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

interface PaymentHistoryItem {
  id: string
  date: string
  description: string
  amount_cents: number
  currency: string
  type: 'subscription' | 'plugin_subscription'
  status: string
  payment_method?: string
  stripe_session_id?: string
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
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([])
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(true)

  useEffect(() => {
    if (userId) {
      loadPaymentMethods()
      loadInvoices()
      loadBillingInfo()
      loadCurrentUser()
      loadPaymentHistory()
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

  const loadPaymentHistory = async () => {
    try {
      setLoadingPaymentHistory(true)
      console.log('💰 Loading payment history for user:', userId)

      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        console.error('No session for payment history:', sessionError)
        return
      }

      const response = await fetch(`/api/billing/payment-history?user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('💰 Payment history loaded:', data)
        setPaymentHistory(data.payments || [])
      } else {
        console.error('Error response from payment history API:', response.status)
      }
    } catch (error) {
      console.error('Error loading payment history:', error)
    } finally {
      setLoadingPaymentHistory(false)
    }
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

      {/* Current Bill */}
      {billingInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Current Bill
            </CardTitle>
            <CardDescription>
              Your estimated monthly charges based on current usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                {billingInfo.preview?.lineItems?.map((item, index) => {
                  const isDiscount = item.name.includes('Discount');
                  return (
                    <div key={index} className={`flex justify-between items-center text-sm ${isDiscount ? 'bg-green-50 dark:bg-green-900/20 -mx-4 px-4 py-2 rounded' : ''}`}>
                      <div>
                        <span className={`font-medium ${isDiscount ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                          {item.name}
                        </span>
                        <p className={`text-xs ${isDiscount ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {item.description}
                        </p>
                      </div>
                      <span className={`font-medium ${isDiscount ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                        ${(item.totalPrice / 100).toFixed(2)}
                      </span>
                    </div>
                  );
                }) || <p className="text-gray-600 dark:text-gray-400 text-sm">No billing items found</p>}
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900 dark:text-white">Estimated Monthly Total:</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${billingInfo.preview?.totalAmount ? (billingInfo.preview.totalAmount / 100).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Payment Methods */}
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

      {/* 4. Payment History (Subscriptions and Plugins) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            All completed payments for subscriptions and plugins
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPaymentHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : paymentHistory.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No payment history</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Payment history will appear here when you purchase subscriptions or plugins
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <div key={payment.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="font-medium text-gray-900 dark:text-white">{payment.description}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(payment.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={payment.status === 'active' || payment.status === 'cancelled' ? 'default' : 'secondary'}
                        >
                          {payment.status}
                        </Badge>
                        <Badge variant="secondary">
                          {payment.type === 'subscription' ? 'Main App' : 'Plugin'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-semibold text-lg text-green-600 dark:text-green-400">
                        ${(payment.amount_cents / 100).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 uppercase">
                        {payment.currency}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Invoice History
          </CardTitle>
          <CardDescription>
            Past and current invoices with detailed payment confirmation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInvoices ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No invoices yet</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Invoices will appear here when billing periods are processed
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices?.map((invoice) => (
                <div key={invoice.id} className="border rounded-lg">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => toggleInvoiceExpansion(invoice.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</span>
                        <Badge 
                          variant={
                            invoice.status === 'paid' ? 'default' : 
                            invoice.status === 'overdue' ? 'destructive' : 
                            'secondary'
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Invoice Date: {new Date(invoice.invoice_date).toLocaleDateString()}
                      </p>
                      {invoice.due_date && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Due Date: {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      )}
                      {invoice.paid_date && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Paid Date: {new Date(invoice.paid_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-semibold text-lg text-gray-900 dark:text-white">
                          ${(invoice.total_cents / 100).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 uppercase">
                          {invoice.currency}
                        </div>
                      </div>
                      {expandedInvoices.has(invoice.id) ? (
                        <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded Invoice Details */}
                  {expandedInvoices.has(invoice.id) && (
                    <div className="border-t bg-gray-50 dark:bg-gray-900 p-4">
                      {invoiceDetails[invoice.id] ? (
                        <div className="space-y-4">
                          {/* Payment Information */}
                          {invoiceDetails[invoice.id].stripe_invoice_id && (
                            <div>
                              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Payment Information</h4>
                              <div className="text-sm space-y-1">
                                <p>Stripe Invoice ID: <span className="font-mono text-xs">{invoiceDetails[invoice.id].stripe_invoice_id}</span></p>
                                
                                {/* Payment Confirmation Details */}
                                {invoiceDetails[invoice.id].stripe_payment_intent_id && (
                                  <p>Payment Intent: <span className="font-mono text-xs">{invoiceDetails[invoice.id].stripe_payment_intent_id}</span></p>
                                )}
                                
                                {invoiceDetails[invoice.id].stripe_charge_id && (
                                  <p>Charge ID: <span className="font-mono text-xs">{invoiceDetails[invoice.id].stripe_charge_id}</span></p>
                                )}
                                
                                {invoiceDetails[invoice.id].stripe_transaction_id && (
                                  <p>Transaction ID: <span className="font-mono text-xs">{invoiceDetails[invoice.id].stripe_transaction_id}</span></p>
                                )}
                                
                                {invoiceDetails[invoice.id].payment_method_last4 && (
                                  <p>Payment Method: {invoiceDetails[invoice.id].payment_method_brand?.toUpperCase()} ••••{invoiceDetails[invoice.id].payment_method_last4}</p>
                                )}
                                
                                {/* Stripe Receipt Link */}
                                {invoiceDetails[invoice.id].stripe_receipt_url && (
                                  <p>
                                    <a 
                                      href={invoiceDetails[invoice.id].stripe_receipt_url!} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-blue-600 hover:text-blue-800 underline"
                                    >
                                      View Stripe Receipt →
                                    </a>
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Line Items */}
                          {invoiceDetails[invoice.id].line_items && invoiceDetails[invoice.id].line_items!.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Invoice Details</h4>
                              <div className="space-y-2">
                                {invoiceDetails[invoice.id].line_items!.map((item, index) => (
                                  <div key={index} className="flex justify-between items-center text-sm bg-white dark:bg-gray-700 p-2 rounded">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                                      <div className="text-gray-600 dark:text-gray-400 text-xs">{item.description}</div>
                                      <div className="text-gray-600 dark:text-gray-400 text-xs">Qty: {item.quantity} × ${(item.unit_price_cents / 100).toFixed(2)}</div>
                                    </div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      ${(item.total_price_cents / 100).toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                                
                                {/* Invoice Totals */}
                                <div className="border-t pt-2 mt-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Subtotal:</span>
                                    <span>${(invoiceDetails[invoice.id].subtotal_cents / 100).toFixed(2)}</span>
                                  </div>
                                  {invoiceDetails[invoice.id].tax_cents > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span>Tax:</span>
                                      <span>${(invoiceDetails[invoice.id].tax_cents / 100).toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-medium text-base border-t pt-1 text-gray-900 dark:text-white">
                                    <span>Total:</span>
                                    <span>${(invoiceDetails[invoice.id].total_cents / 100).toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                          Loading details...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Test Billing System (Admin Only) */}
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
