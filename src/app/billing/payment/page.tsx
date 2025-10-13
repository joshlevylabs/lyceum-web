'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import PaymentMethodSetup from '@/components/billing/PaymentMethodSetup'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function PaymentPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Methods</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage your payment methods, view invoices, and billing information.
            </p>
          </div>
        </div>

        {/* Payment Method Setup Component */}
        <PaymentMethodSetup 
          userId={user.id}
          onPaymentMethodAdded={() => {
            // Callback when payment method is added - could refresh data
            console.log('Payment method added successfully')
          }}
        />
      </div>
    </DashboardLayout>
  )
}


