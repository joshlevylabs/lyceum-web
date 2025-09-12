'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function SetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [sessionData, setSessionData] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    checkUserSession()
  }, [])

  const checkUserSession = async () => {
    try {
      // First try to get session data from localStorage (from auth callback)
      const storedSession = localStorage.getItem('lyceum_password_reset_session')
      if (storedSession) {
        try {
          const sessionInfo = JSON.parse(storedSession)
          console.log('Got session data from localStorage:', { 
            email: sessionInfo.email, 
            has_token: !!sessionInfo.access_token,
            recovery_flow: sessionInfo.recovery_flow
          })
          setSessionData(sessionInfo)
          setUserInfo({
            email: sessionInfo.email,
            full_name: 'User'
          })
          // Clear the stored session data after using it
          localStorage.removeItem('lyceum_password_reset_session')
          return
        } catch (parseError) {
          console.warn('Failed to parse session from localStorage:', parseError)
          localStorage.removeItem('lyceum_password_reset_session')
        }
      }

      // Second try to get session data from URL (from auth callback)
      const sessionParam = searchParams.get('session')
      if (sessionParam) {
        try {
          const sessionInfo = JSON.parse(decodeURIComponent(sessionParam))
          console.log('Got session data from URL:', { 
            email: sessionInfo.email, 
            has_token: !!sessionInfo.access_token 
          })
          setSessionData(sessionInfo)
          setUserInfo({
            email: sessionInfo.email,
            full_name: 'User'
          })
          return
        } catch (parseError) {
          console.warn('Failed to parse session from URL:', parseError)
        }
      }

      // Fallback to checking current Supabase session
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        console.warn('No session found, redirecting to login')
        router.push('/auth/login')
        return
      }

      console.log('Got session from Supabase:', { email: session.user.email })
      setUserInfo({
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || 'User'
      })
      setSessionData({
        access_token: session.access_token,
        user_id: session.user.id,
        email: session.user.email
      })
    } catch (error) {
      console.error('Session check failed:', error)
      router.push('/auth/login')
    }
  }

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }
    return null
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate password strength
      const passwordError = validatePassword(password)
      if (passwordError) {
        throw new Error(passwordError)
      }

      // Check password confirmation
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      console.log('About to update password...')
      
      if (!sessionData?.access_token) {
        throw new Error('No session data available. Please try logging in again.')
      }
      
      // Use our custom API endpoint instead of supabase.auth.updateUser
      console.log('Calling password update API...')
      
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: sessionData.access_token,
          new_password: password
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      const result = await response.json()
      
      console.log('Password update API result:', result)

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Password update failed')
      }
      
      console.log('Password updated successfully via API!')

      // Clear any stored session data since we're redirecting to login
      localStorage.removeItem('lyceum_password_reset_session')
      
      console.log('Redirecting to login with success message...')
      
      // Redirect to login with success message (no session cleanup needed)
      router.push('/auth/signin?message=password_updated')
      return

    } catch (error: any) {
      console.error('Password update error:', error)
      
      if (error.name === 'AbortError') {
        setError('Password update timed out. Please try again.')
      } else {
        setError(error.message || 'Failed to set password')
      }
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^a-zA-Z\d]/.test(password)) strength++
    return strength
  }

  const getStrengthColor = (strength: number) => {
    if (strength < 2) return 'bg-red-500'
    if (strength < 4) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStrengthText = (strength: number) => {
    if (strength < 2) return 'Weak'
    if (strength < 4) return 'Medium'
    return 'Strong'
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Set Successfully!</h1>
            <p className="text-gray-600 mb-4">Your password has been updated. You can now access your account.</p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Set Your Password</h1>
            <p className="text-gray-600">Welcome to Lyceum! Please set a secure password for your account.</p>
            {userInfo && (
              <p className="text-sm text-gray-500 mt-2">Account: {userInfo.email}</p>
            )}
          </div>

          <form onSubmit={handleSetPassword} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              
              {password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(getPasswordStrength(password))}`}
                        style={{ width: `${(getPasswordStrength(password) / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">{getStrengthText(getPasswordStrength(password))}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Must be 8+ characters with uppercase, lowercase, and number
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Set Password'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Skip for now (you can set password later)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
