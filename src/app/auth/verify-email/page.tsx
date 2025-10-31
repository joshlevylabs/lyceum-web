'use client'

import { useState } from 'react'
import Link from 'next/link'
import { EnvelopeIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'

export default function VerifyEmail() {
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')

  const handleResendEmail = async () => {
    setResending(true)
    setError('')

    try {
      // Get the current user email from session
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.email) {
        setError('No email found. Please sign up again.')
        setResending(false)
        return
      }

      // Resend confirmation email
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (resendError) {
        setError(resendError.message)
      } else {
        setResent(true)
      }
    } catch (err) {
      setError('Failed to resend email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <EnvelopeIcon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Verify your email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            We've sent a verification link to your email address
          </p>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 py-8 px-6 shadow rounded-lg">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please check your email and click the verification link to activate your account.
              You won't be able to access your dashboard until you verify your email address.
            </p>

            <div className="pt-4 space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Didn't receive the email? Check your spam folder or request a new one.
              </p>

              {resent && (
                <div className="rounded-md bg-green-50 dark:bg-green-900/50 p-4">
                  <div className="text-sm text-green-700 dark:text-green-200">
                    Verification email sent! Please check your inbox.
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4">
                  <div className="text-sm text-red-700 dark:text-red-200">
                    {error}
                  </div>
                </div>
              )}

              <button
                onClick={handleResendEmail}
                disabled={resending || resent}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? 'Sending...' : resent ? 'Email sent!' : 'Resend verification email'}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
