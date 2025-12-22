'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Eye, EyeSlash } from '@phosphor-icons/react'

export const dynamic = 'force-dynamic'

function SignInContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  const { signIn, user, userProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const message = searchParams.get('message')
    if (message === 'password_updated') {
      setSuccessMessage('Password updated successfully! Please sign in with your new password.')
    }
  }, [searchParams])

  // After successful SIGNED_IN (AuthContext updates user), navigate
  useEffect(() => {
    console.log('=== SignIn useEffect running ===', {
      hasUser: !!user,
      hasUserProfile: !!userProfile,
      authLoading,
      emailVerified: userProfile?.email_verified
    })

    // Check if user just logged out - if so, don't auto-redirect
    const justLoggedOut = sessionStorage.getItem('justLoggedOut')
    if (justLoggedOut) {
      console.log('User just logged out, clearing flag and preventing auto-redirect')
      sessionStorage.removeItem('justLoggedOut')
      return
    }

    // Only redirect if user is authenticated AND email is verified
    if (user && !authLoading && userProfile) {
      console.log('SignIn: All conditions met, checking email verification')
      if (userProfile.email_verified) {
        const redirectedFrom = searchParams.get('redirectedFrom')
        const destination = redirectedFrom || '/dashboard'
        console.log('Verified user detected after signin, redirecting to', destination)
        router.push(destination)
      } else {
        // User is authenticated but not verified - redirect to verify page
        console.log('Unverified user detected, redirecting to verify-email page')
        router.push('/auth/verify-email')
      }
    } else {
      console.log('SignIn: Not all conditions met:', {
        hasUser: !!user,
        authLoadingFalse: !authLoading,
        hasUserProfile: !!userProfile
      })
    }
  }, [user, userProfile, authLoading, router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('Starting signin process...')
      const { error } = await signIn(email, password)
      console.log('Signin completed, error:', error?.message)
      if (error) setError(error.message)
      // Do not route here; routing will happen after AuthContext updates user
    } catch (err: any) {
      console.error('Signin error:', err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <span className="text-xl font-bold text-cyan-400">L</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Sign in to Lyceum
          </h2>
          <p className="mt-2 text-center text-sm text-foreground/60">
            Industrial Analytics Platform
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {successMessage && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <div className="text-sm text-emerald-400">
                {successMessage}
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

          <div className="glass-card p-6 space-y-4">
            <div>
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
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="glass-input w-full px-4 py-2.5 pr-10 rounded-xl text-foreground placeholder-foreground/40"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-foreground/50 hover:text-cyan-400 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlash className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link href="/auth/forgot-password" className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                Forgot your password?
              </Link>
            </div>
            <div className="text-sm">
              <Link href="/auth/signup" className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                Don't have an account? Sign up
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/20 border-t-cyan-500 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Loading...</h1>
          </div>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
} 