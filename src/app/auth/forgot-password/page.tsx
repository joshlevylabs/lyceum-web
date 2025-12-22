'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Envelope, ArrowLeft } from '@phosphor-icons/react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send password reset email')
      }

      setSuccess(true)
    } catch (err: any) {
      console.error('Forgot password error:', err)
      setError(err.message || 'Failed to send password reset email')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Envelope className="h-6 w-6 text-emerald-400" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
              Check your email
            </h2>
            <p className="mt-2 text-center text-sm text-foreground/60">
              We've sent a password reset link to <strong className="text-cyan-400">{email}</strong>
            </p>
            <p className="mt-4 text-center text-sm text-foreground/60">
              Didn't receive the email? Check your spam folder or contact your administrator.
            </p>
          </div>

          <div className="mt-8">
            <Link
              href="/auth/signin"
              className="btn-ghost w-full inline-flex items-center justify-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <span className="text-xl font-bold text-cyan-400">L</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-foreground/60">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
              <div className="text-sm text-red-400">
                {error}
              </div>
            </div>
          )}

          <div className="glass-card p-6">
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="glass-input w-full px-4 py-2.5 rounded-xl text-foreground placeholder-foreground/40"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>

          <div className="text-center">
            <Link href="/auth/signin" className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
