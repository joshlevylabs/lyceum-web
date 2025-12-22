'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Envelope } from '@phosphor-icons/react'
import { useAuth } from '@/contexts/AuthContext'

export default function VerifyEmail() {
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { user, userProfile, loading, signOut } = useAuth()

  // Redirect only if user is authenticated AND already verified
  useEffect(() => {
    if (!loading) {
      if (user && userProfile?.email_verified) {
        console.log('Already verified, redirecting to dashboard')
        router.push('/dashboard')
      }
      // Allow unauthenticated users to stay on this page (they just signed up)
    }
  }, [user, userProfile, loading, router])

  const handleResendEmail = async () => {
    console.log('=== Resend Email Button Clicked ===')
    setResending(true)
    setError('')
    setResent(false)

    try {
      console.log('Calling API route to resend verification email...')

      // Prepare request body with email and userName
      const requestBody: { email?: string; userName?: string } = {}

      // Try to include email and userName from user/profile if available
      if (user?.email) {
        requestBody.email = user.email
        if (userProfile?.full_name) {
          requestBody.userName = userProfile.full_name
        } else if (userProfile?.username) {
          requestBody.userName = userProfile.username
        }
      }

      console.log('Request body:', requestBody)

      // Use API route with email in body for users without valid session
      const response = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()
      console.log('API response:', {
        status: response.status,
        success: response.ok,
        result
      })

      if (!response.ok) {
        console.error('API error:', result.error)
        setError(result.error || 'Failed to send verification email')
      } else {
        console.log('Verification email sent successfully via API!')
        setResent(true)
      }
    } catch (err: any) {
      console.error('Exception during resend:', err)
      setError(`Failed to resend email: ${err.message || 'Please try again.'}`)
    } finally {
      setResending(false)
      console.log('=== Resend Email Complete ===')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <Envelope className="h-10 w-10 text-cyan-400" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Verify your email
          </h2>
          <p className="mt-2 text-center text-sm text-foreground/60">
            We've sent a verification link to your email address
          </p>
        </div>

        <div className="mt-8 glass-card py-8 px-6">
          <div className="space-y-4">
            <p className="text-sm text-foreground/60">
              Please check your email and click the verification link to activate your account.
              You won't be able to access your dashboard until you verify your email address.
            </p>

            <div className="pt-4 space-y-4">
              <p className="text-xs text-foreground/60">
                Didn't receive the email? Check your spam folder or request a new one.
              </p>

              {resent && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                  <div className="text-sm text-emerald-400">
                    Verification email sent! Please check your inbox.
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                  <div className="text-sm text-red-400">
                    {error}
                  </div>
                </div>
              )}

              <button
                onClick={handleResendEmail}
                disabled={resending || resent}
                className="btn-primary w-full"
              >
                {resending ? 'Sending...' : resent ? 'Email sent!' : 'Resend verification email'}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <button
            onClick={async () => {
              await signOut()
              router.push('/auth/signin')
            }}
            className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors block w-full"
          >
            Sign out and return to sign in
          </button>
          <p className="text-xs text-foreground/60">
            Need to sign in with a different account?
          </p>
        </div>
      </div>
    </div>
  )
}
