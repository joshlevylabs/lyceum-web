'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function NativeAppSubscribePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect to billing page (which defaults to desktop tab)
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/signin')
      } else {
        // Redirect to billing page which shows desktop app by default
        router.push('/billing')
      }
    }
  }, [user, loading, router])

  return null
}
