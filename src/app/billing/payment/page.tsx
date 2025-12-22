'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import PaymentMethodSetup from '@/components/billing/PaymentMethodSetup'
import { ArrowLeft } from '@phosphor-icons/react'

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
        <div className="flex items-center justify-center h-64 bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/20 border-t-cyan-500"></div>
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
            className="btn-ghost inline-flex items-center px-3 py-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" weight="regular" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payment Methods</h1>
            <p className="mt-1 text-sm text-foreground/60">
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


