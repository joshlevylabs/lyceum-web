'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'

export default function NativeAppSubscribePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [checkingLicense, setCheckingLicense] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  // Check if user has an active license
  useEffect(() => {
    const checkLicense = async () => {
      if (!user) return

      try {
        const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
        if (!session?.access_token) {
          setCheckingLicense(false)
          return
        }

        console.log('Checking if user has valid license...')

        // Check if user has a license
        const licenseResponse = await fetch('/api/licenses/generate-main-app', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (licenseResponse.ok) {
          const licenseData = await licenseResponse.json()

          if (licenseData.hasLicense) {
            // User already has a license - redirect to download
            console.log('User already has a license, redirecting to download...')
            router.push('/download-app')
          } else {
            // No license - redirect to billing page to subscribe
            console.log('No license found - redirecting to billing page...')
            router.push('/billing')
          }
        } else {
          // Error checking license - redirect to billing page
          console.log('Error checking license - redirecting to billing page...')
          router.push('/billing')
        }
      } catch (err) {
        console.error('Error checking license:', err)
        // On error, redirect to billing page
        router.push('/billing')
      } finally {
        setCheckingLicense(false)
      }
    }

    if (!loading && user) {
      checkLicense()
    }
  }, [user, loading, router])

  // Show loading state
  if (loading || checkingLicense) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Checking license status...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // This should never be reached as we always redirect, but just in case
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
