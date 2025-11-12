'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  CheckCircleIcon,
  XMarkIcon,
  CreditCardIcon,
  LockClosedIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

export default function PaymentPage() {
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
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <XMarkIcon className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Plan Summary */}
        {plan && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {plan.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {plan.duration === 'lifetime' ? 'One-time payment' : `${plan.duration} trial period`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {plan.price}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {plan.duration === 'lifetime' ? 'one-time' : plan.duration}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-6">
          <div className="flex items-center mb-6">
            <CreditCardIcon className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Payment Information
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card Number */}
            <div>
              <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Card Number
              </label>
              <input
                id="cardNumber"
                type="text"
                value={cardInfo.cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            {/* Card Name */}
            <div>
              <label htmlFor="cardName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name on Card
              </label>
              <input
                id="cardName"
                type="text"
                value={cardInfo.cardName}
                onChange={(e) => setCardInfo({ ...cardInfo, cardName: e.target.value })}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            {/* Expiry and CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expiry Date
                </label>
                <input
                  id="expiryDate"
                  type="text"
                  value={cardInfo.expiryDate}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CVV
                </label>
                <input
                  id="cvv"
                  type="text"
                  value={cardInfo.cvv}
                  onChange={(e) => setCardInfo({ ...cardInfo, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="123"
                  maxLength={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Billing ZIP */}
            <div>
              <label htmlFor="billingZip" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Billing ZIP Code
              </label>
              <input
                id="billingZip"
                type="text"
                value={cardInfo.billingZip}
                onChange={(e) => setCardInfo({ ...cardInfo, billingZip: e.target.value })}
                placeholder="12345"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex">
                <ShieldCheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Your payment is secure</p>
                  <p className="text-blue-700 dark:text-blue-300">
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
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={processing}
                className="flex-1 inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <LockClosedIcon className="h-5 w-5 mr-2" />
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
