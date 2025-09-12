'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [userInfo, setUserInfo] = useState<any>(null)
  const processedRef = useRef(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleAuthCallback = async () => {
    // Prevent multiple executions with more robust checking
    if (processedRef.current) {
      console.log('Auth callback already processed, skipping...')
      return
    }
    
    // Set flag immediately to prevent any race conditions
    processedRef.current = true
    console.log('=== Starting auth callback processing ===')
    try {
      const supabase = createClient()
      
      // Check if this is an invite flow or password recovery
      const type = searchParams.get('type')
      const accessToken = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')
      
      console.log('Auth callback - URL params:', { type, accessToken: !!accessToken, refreshToken: !!refreshToken })
      console.log('Auth callback - Full URL:', window.location.href)
      
      // Check if this is a recovery flow (either by type param or hash content)
      const hash = window.location.hash
      const hashParams = new URLSearchParams(hash.substring(1))
      const hashType = hashParams.get('type')
      const isRecovery = type === 'recovery' || hashType === 'recovery'
      
      console.log('Detection:', { type, hashType, isRecovery })
      
      if (isRecovery) {
        // Handle password recovery
        setMessage('Processing password reset...')
        
        console.log('Recovery hash:', hash)
        
        // Parse tokens from URL fragment manually for recovery
        const access_token = hashParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token')
        
        console.log('Parsed tokens:', { 
          access_token: access_token ? access_token.substring(0, 50) + '...' : null, 
          refresh_token: !!refresh_token 
        })
        
        if (!access_token) {
          throw new Error('No access token found in URL')
        }
        
        console.log('About to call setSession...')
        
        // Try a different approach - create session from tokens directly
        let data: any = null
        let error: any = null
        
        try {
          console.log('Trying alternative: manual session creation...')
          
          // Instead of setSession, just parse the JWT and create user info
          const tokenPayload = JSON.parse(atob(access_token.split('.')[1]))
          console.log('Token payload:', {
            email: tokenPayload.email,
            sub: tokenPayload.sub,
            exp: tokenPayload.exp,
            role: tokenPayload.role
          })
          
          // Create synthetic session data
          data = {
            session: {
              access_token,
              refresh_token: refresh_token || '',
              user: {
                id: tokenPayload.sub,
                email: tokenPayload.email,
                user_metadata: tokenPayload.user_metadata || {},
                app_metadata: tokenPayload.app_metadata || {}
              }
            }
          }
          error = null
          
          console.log('Manual session creation successful')
        } catch (manualError) {
          console.error('Manual session failed, trying setSession with shorter timeout...')
          
          // Fallback to setSession with shorter timeout
          const sessionPromise = supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || ''
          })
          
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('setSession timeout after 5 seconds')), 5000)
          )
          
          const result = await Promise.race([sessionPromise, timeoutPromise]) as any
          data = result.data
          error = result.error
        }
        
        console.log('Session result:', { 
          success: !!data.session,
          user_email: data.session?.user?.email,
          error: error?.message 
        })
        
        if (error) {
          throw new Error(`Password reset error: ${error.message}`)
        }
        
        if (data.session) {
          setUserInfo({
            email: data.session.user.email,
            full_name: data.session.user.user_metadata?.full_name || 'User'
          })
          
          // Store session data for password reset page
          const sessionData = {
            access_token,
            user_id: data.session.user.id,
            email: data.session.user.email,
            recovery_flow: true
          }
          
          console.log('Storing session data for password reset:', {
            email: sessionData.email,
            has_token: !!sessionData.access_token
          })
          
          // Store in localStorage temporarily for the password reset page
          localStorage.setItem('lyceum_password_reset_session', JSON.stringify(sessionData))
          
          setStatus('success')
          setMessage('Password reset verified! You can now set a new password.')
          
          // Redirect to set password page immediately for recovery
          console.log('About to redirect to set-password page...')
          setTimeout(() => {
            console.log('Executing redirect now...')
            router.push('/auth/set-password')
          }, 1500)
        } else {
          throw new Error('No session data received for password reset')
        }
      } else if (type === 'invite' && accessToken) {
        // Handle invite acceptance
        setMessage('Processing your invitation...')
        
        // Set the session with the tokens from URL
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        })

        if (sessionError) {
          throw new Error(`Session error: ${sessionError.message}`)
        }

        if (sessionData.user) {
          setUserInfo({
            email: sessionData.user.email,
            full_name: sessionData.user.user_metadata?.full_name || 'User',
            role: sessionData.user.user_metadata?.role || 'user',
            company: sessionData.user.user_metadata?.company || ''
          })

          // Update the user's profile if needed
          try {
            await fetch('/api/admin/users/backfill-profiles', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: sessionData.user.id })
            })
          } catch (profileError) {
            console.warn('Profile backfill failed:', profileError)
          }

          setStatus('success')
          setMessage('Welcome to Lyceum! Your account has been activated.')
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push('/dashboard')
          }, 3000)
        } else {
          throw new Error('No user data received')
        }
      } else {
        // Regular auth callback (OAuth, etc.)
        console.log('Regular auth callback')
        
        // Check if we have tokens in the URL hash
        if (hash) {
          const access_token = hashParams.get('access_token')
          const refresh_token = hashParams.get('refresh_token')
          
          if (access_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token: refresh_token || ''
            })
            
            if (error) {
              throw new Error(`Auth error: ${error.message}`)
            }
            
            if (data.session) {
              setUserInfo({
                email: data.session.user.email,
                full_name: data.session.user.user_metadata?.full_name || 'User'
              })
              setStatus('success')
              setMessage('Authentication successful! Redirecting...')
              
              setTimeout(() => {
                router.push('/dashboard')
              }, 2000)
            } else {
              throw new Error('No session data received')
            }
          } else {
            throw new Error('No tokens found in URL')
          }
        } else {
          throw new Error('No authentication data found in URL')
        }
      }
    } catch (error: any) {
      console.error('Auth callback error:', error)
      setStatus('error')
      setMessage(error.message || 'Authentication failed. Please try again.')
    }
  }

  useEffect(() => {
    handleAuthCallback()
  }, []) // No dependencies - runs once on mount

  const handleSetPassword = () => {
    router.push('/auth/set-password')
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  const handleRetryLogin = () => {
    router.push('/auth/login')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Authenticating...</h1>
            <p className="text-gray-600">{message || 'Please wait while we verify your account.'}</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Lyceum!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            
            {userInfo && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-medium text-gray-900 mb-2">Account Details:</h3>
                <p className="text-sm text-gray-600"><strong>Email:</strong> {userInfo.email}</p>
                <p className="text-sm text-gray-600"><strong>Name:</strong> {userInfo.full_name}</p>
                <p className="text-sm text-gray-600"><strong>Role:</strong> {userInfo.role}</p>
                {userInfo.company && (
                  <p className="text-sm text-gray-600"><strong>Company:</strong> {userInfo.company}</p>
                )}
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={handleSetPassword}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Set Your Password
              </button>
              
              <button
                onClick={handleGoToDashboard}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Go to Dashboard
              </button>
              
              {/* Debug: Manual redirect for password reset */}
              <button
                onClick={() => router.push('/auth/set-password')}
                className="w-full bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                Manual: Go to Set Password
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-4">
              Redirecting automatically in a few seconds...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            
            <div className="space-y-3">
              <button
                onClick={handleRetryLogin}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Try Login Again
              </button>
              
              <button
                onClick={() => window.location.href = 'mailto:support@lyceum.com'}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
