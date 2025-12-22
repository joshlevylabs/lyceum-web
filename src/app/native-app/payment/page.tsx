'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  CheckCircle,
  X,
  CreditCard,
  LockSimple,
  ShieldCheck
} from '@phosphor-icons/react'

function PaymentPageContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const subscriptionType = searchParams.get('type') as 'trial' | 'paid' | null
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardInfo, setCardInfo] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    billingZip: ''
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!subscriptionType || !['trial', 'paid'].includes(subscriptionType)) {
      router.push('/native-app/subscribe')
    }
  }, [subscriptionType, router])

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
    return formatted.slice(0, 19) // Max 16 digits + 3 spaces
  }

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4)
    }
    return cleaned
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    setCardInfo({ ...cardInfo, cardNumber: formatted })
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value)
    setCardInfo({ ...cardInfo, expiryDate: formatted })
  }

  const validateCardInfo = () => {
    const cardNumberClean = cardInfo.cardNumber.replace(/\s/g, '')

    if (cardNumberClean.length !== 16) {
      setError('Please enter a valid 16-digit card number')
      return false
    }

    if (!cardInfo.cardName.trim()) {
      setError('Please enter the name on card')
      return false
    }

    if (cardInfo.expiryDate.length !== 5) {
      setError('Please enter a valid expiry date (MM/YY)')
      return false
    }

    const [month, year] = cardInfo.expiryDate.split('/')
    const expMonth = parseInt(month, 10)
    if (expMonth < 1 || expMonth > 12) {
      setError('Please enter a valid month (01-12)')
      return false
    }

    if (cardInfo.cvv.length !== 3 && cardInfo.cvv.length !== 4) {
      setError('Please enter a valid CVV')
      return false
    }

    if (cardInfo.billingZip.length < 5) {
      setError('Please enter a valid billing ZIP code')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateCardInfo()) {
      return
    }

    setProcessing(true)

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Authentication required')
        setProcessing(false)
        return
      }

      // Step 1: Process payment
      const paymentResponse = await fetch('/api/payment/process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription_type: subscriptionType,
          card_number: cardInfo.cardNumber.replace(/\s/g, ''),
          card_name: cardInfo.cardName,
          expiry_date: cardInfo.expiryDate,
          cvv: cardInfo.cvv,
          billing_zip: cardInfo.billingZip
        })
      })

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json()
        throw new Error(errorData.error || 'Payment processing failed')
      }

      // Step 2: Create subscription
      const subscriptionResponse = await fetch('/api/subscriptions/native-app', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscription_type: subscriptionType })
      })

      if (!subscriptionResponse.ok) {
        const errorData = await subscriptionResponse.json()
        throw new Error(errorData.error || 'Failed to create subscription')
      }

      // Step 3: Generate license
      const licenseResponse = await fetch('/api/licenses/generate-main-app', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!licenseResponse.ok) {
        const errorData = await licenseResponse.json()
        throw new Error(errorData.error || 'Failed to generate license')
      }

      // Success! Redirect to download page
      router.push('/download-app')

    } catch (err) {
      console.error('Payment error:', err)
      setError(err instanceof Error ? err.message : 'Payment processing failed')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/20 border-t-cyan-500"></div>
        </div>
      </DashboardLayout>
    )
  }

  const planInfo = {
    trial: {
      name: 'Free Trial',
      price: '$0',
      duration: '30 days',
      color: 'yellow'
    },
    paid: {
      name: 'Paid Subscription',
      price: '$49',
      duration: 'lifetime',
      color: 'blue'
    }
  }

  const plan = subscriptionType ? planInfo[subscriptionType] : null

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Error Message */}
        {error && (
          <div className="mb-6 glass-card p-4 border border-red-500/20 bg-red-500/10">
            <div className="flex">
              <X className="h-5 w-5 text-red-400 mr-3" weight="duotone" />
              <p className="text-sm text-foreground/90">{error}</p>
            </div>
          </div>
        )}

        {/* Plan Summary */}
        {plan && (
          <div className="mb-8 glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {plan.name}
                </h2>
                <p className="text-foreground/60 mt-1">
                  {plan.duration === 'lifetime' ? 'One-time payment' : `${plan.duration} trial period`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-cyan-400">
                  {plan.price}
                </p>
                <p className="text-sm text-foreground/40">
                  {plan.duration === 'lifetime' ? 'one-time' : plan.duration}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Form */}
        <div className="glass-card p-6">
          <div className="flex items-center mb-6">
            <CreditCard className="h-6 w-6 text-cyan-400 mr-3" weight="duotone" />
            <h3 className="text-xl font-semibold text-foreground">
              Payment Information
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card Number */}
            <div>
              <label htmlFor="cardNumber" className="block text-sm font-medium text-foreground/60 mb-1">
                Card Number
              </label>
              <input
                id="cardNumber"
                type="text"
                value={cardInfo.cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                className="w-full px-4 py-3 rounded-xl glass-input text-foreground placeholder-foreground/40"
                required
              />
            </div>

            {/* Card Name */}
            <div>
              <label htmlFor="cardName" className="block text-sm font-medium text-foreground/60 mb-1">
                Name on Card
              </label>
              <input
                id="cardName"
                type="text"
                value={cardInfo.cardName}
                onChange={(e) => setCardInfo({ ...cardInfo, cardName: e.target.value })}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl glass-input text-foreground placeholder-foreground/40"
                required
              />
            </div>

            {/* Expiry and CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="expiryDate" className="block text-sm font-medium text-foreground/60 mb-1">
                  Expiry Date
                </label>
                <input
                  id="expiryDate"
                  type="text"
                  value={cardInfo.expiryDate}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="w-full px-4 py-3 rounded-xl glass-input text-foreground placeholder-foreground/40"
                  required
                />
              </div>
              <div>
                <label htmlFor="cvv" className="block text-sm font-medium text-foreground/60 mb-1">
                  CVV
                </label>
                <input
                  id="cvv"
                  type="text"
                  value={cardInfo.cvv}
                  onChange={(e) => setCardInfo({ ...cardInfo, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="123"
                  maxLength={4}
                  className="w-full px-4 py-3 rounded-xl glass-input text-foreground placeholder-foreground/40"
                  required
                />
              </div>
            </div>

            {/* Billing ZIP */}
            <div>
              <label htmlFor="billingZip" className="block text-sm font-medium text-foreground/60 mb-1">
                Billing ZIP Code
              </label>
              <input
                id="billingZip"
                type="text"
                value={cardInfo.billingZip}
                onChange={(e) => setCardInfo({ ...cardInfo, billingZip: e.target.value })}
                placeholder="12345"
                className="w-full px-4 py-3 rounded-xl glass-input text-foreground placeholder-foreground/40"
                required
              />
            </div>

            {/* Security Notice */}
            <div className="glass-card p-4 bg-cyan-500/10 border border-cyan-500/20">
              <div className="flex">
                <ShieldCheck className="h-5 w-5 text-cyan-400 mr-3 flex-shrink-0" weight="duotone" />
                <div className="text-sm text-foreground/90">
                  <p className="font-medium mb-1">Your payment is secure</p>
                  <p className="text-foreground/60">
                    We use industry-standard encryption to protect your payment information.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push('/native-app/subscribe')}
                className="flex-1 px-6 py-3 btn-ghost"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={processing}
                className="flex-1 inline-flex justify-center items-center px-6 py-3 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500/20 border-t-cyan-500 mr-3"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <LockSimple className="h-5 w-5 mr-2" weight="duotone" />
                    Complete Payment
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/20 border-t-cyan-500"></div>
        </div>
      </DashboardLayout>
    }>
      <PaymentPageContent />
    </Suspense>
  )
}
