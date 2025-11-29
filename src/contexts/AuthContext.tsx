'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User } from '@supabase/auth-helpers-nextjs'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { WebSessionSync } from '@/services/webSessionSync'

interface AuthContextType {
  user: User | null
  userProfile: any | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, userData: any) => Promise<any>
  signOut: () => Promise<void>
  updateProfile: (data: any) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const router = useRouter()

  // Web session sync instance
  const webSessionSyncRef = useRef<WebSessionSync | null>(null)

  // Use singleton supabase client to avoid multiple instances

  useEffect(() => {
    const getUser = async () => {
      try {
        console.log('AuthContext: Getting user...')
        console.log('AuthContext: Supabase client available:', !!supabase)
        const { data: { user }, error } = await supabase.auth.getUser()
        console.log('AuthContext: getUser result:', { user: !!user, error: error?.message })
        
        setUser(user)
        
        if (user) {
          try {
            // Fetch user profile via API route to avoid browser client issues
            console.log('AuthContext: Fetching user profile via API...')
            const response = await fetch('/api/user-profile')
            const result = await response.json()

            console.log('AuthContext: Profile API result:', {
              success: response.ok,
              hasProfile: !!result.profile,
              error: result.error
            })

            if (response.ok && result.profile) {
              setUserProfile(result.profile)

              // Start web session tracking
              await startWebSessionTracking(user, result.profile)
            } else {
              console.error('AuthContext: Profile fetch error:', result.error)
              setUserProfile(null)
            }
          } catch (profileErr) {
            console.warn('AuthContext: Profile fetch failed:', profileErr)
            setUserProfile(null)
          }
        }
        
        setLoading(false)
        clearTimeout(loadingTimeoutId)
        console.log('AuthContext: Initial load complete')
      } catch (error) {
        console.error('AuthContext: getUser failed:', error)
        setLoading(false)
        clearTimeout(loadingTimeoutId)
      }
    }

    // Timeout fallback to ensure loading never stays true indefinitely
    const loadingTimeoutId = setTimeout(() => {
      console.warn('AuthContext: Loading timeout - forcing loading to false')
      setLoading(false)
    }, 10000) // 10 second timeout

    getUser()

    console.log('AuthContext: Setting up auth state change listener...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          console.log('=== AuthContext: Auth state changed ===', { event, hasSession: !!session, userId: session?.user?.id })
          setUser(session?.user ?? null)

          if (session?.user) {
            console.log('AuthContext: User exists, fetching profile for user:', session.user.id)
            try {
              console.log('AuthContext: Starting profile API call...')
              const response = await fetch('/api/user-profile')
              const result = await response.json()

              console.log('AuthContext: Profile API complete:', {
                success: response.ok,
                hasProfile: !!result.profile,
                profileData: result.profile,
                error: result.error
              })

              if (response.ok && result.profile) {
                setUserProfile(result.profile)
                console.log('AuthContext: setUserProfile called with:', result.profile)
              } else {
                console.error('AuthContext: Profile API error:', result.error)
                setUserProfile(null)
              }
            } catch (profileErr) {
              console.error('AuthContext: Exception during profile fetch:', profileErr)
              setUserProfile(null)
            }
          } else {
            console.log('AuthContext: No user in session, clearing profile')
            setUserProfile(null)
          }

          setLoading(false)
          clearTimeout(loadingTimeoutId)
          console.log('=== AuthContext: Auth state change processed ===')
        } catch (error) {
          console.error('AuthContext: Auth state change failed:', error)
          setLoading(false)
          clearTimeout(loadingTimeoutId)
        }
      }
    )

    return () => {
      console.log('AuthContext: Cleaning up subscription')
      clearTimeout(loadingTimeoutId)
      subscription.unsubscribe()
    }
  }, [])

  // Start web session tracking
  const startWebSessionTracking = async (authUser: User, profile: any) => {
    try {
      // Stop any existing session
      if (webSessionSyncRef.current) {
        await webSessionSyncRef.current.stopSync()
      }

      // Get access token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.warn('No access token for web session tracking')
        return
      }

      // Determine license type (default to enterprise for web)
      const licenseType = profile.license_type || 'enterprise'

      // Create new session sync instance
      const apiUrl = process.env.NEXT_PUBLIC_LYCEUM_API_BASE_URL || 'http://localhost:3594/api'
      webSessionSyncRef.current = new WebSessionSync(
        session.access_token,
        authUser.id,
        apiUrl,
        session.access_token,
        licenseType,
        false // MFA status - can be enhanced later
      )

      // Start tracking
      await webSessionSyncRef.current.startSync()
      console.log('✅ Web session tracking started')

      // Listen for session revoked events
      window.addEventListener('session-revoked', handleSessionRevoked)
    } catch (error) {
      console.error('Failed to start web session tracking:', error)
    }
  }

  // Stop web session tracking
  const stopWebSessionTracking = async () => {
    if (webSessionSyncRef.current) {
      try {
        await webSessionSyncRef.current.stopSync()
        webSessionSyncRef.current = null
        console.log('Web session tracking stopped')
      } catch (error) {
        console.error('Error stopping web session tracking:', error)
      }
    }

    // Remove event listener
    window.removeEventListener('session-revoked', handleSessionRevoked)
  }

  // Handle session revoked event
  const handleSessionRevoked = () => {
    console.warn('Session revoked event received, forcing logout')
    signOut()
  }

  const signIn = async (email: string, password: string) => {
    console.log('AuthContext signIn called with:', { email, hasPassword: !!password })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log('AuthContext signIn result:', {
        success: !error,
        error: error?.message,
        hasUser: !!data?.user
      })
      return { data, error }
    } catch (err) {
      console.error('AuthContext signIn exception:', err)
      return { data: null, error: err }
    }
  }

  const signUp = async (email: string, password: string, userData: any) => {
    // Check if email already exists before attempting signup
    try {
      const { data: existingUser, error: checkError } = await supabase.rpc('check_email_exists', {
        check_email: email
      })

      // If RPC doesn't exist, we'll catch it and proceed with signup (constraint will handle it)
      if (!checkError && existingUser) {
        return {
          data: null,
          error: {
            message: 'An account with this email already exists. Please sign in instead.',
            status: 409
          }
        }
      }
    } catch (rpcError) {
      console.log('Email check RPC not available, proceeding with signup')
    }

    // Sign up WITHOUT automatic email confirmation (we'll send via Resend)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          user_name: userData.username,
          full_name: userData.fullName,
          company: userData.company,
          role: userData.role || 'analyst'
        }
      }
    })

    if (error) {
      // Handle duplicate email error from Supabase auth
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        return {
          data: null,
          error: {
            ...error,
            message: 'An account with this email already exists. Please sign in instead.'
          }
        }
      }
      return { data, error }
    }

    if (data.user) {
      // Create user profile with email_verified set to false
      // User must verify email before accessing the platform
      const profileData = {
        id: data.user.id,
        email: data.user.email,
        username: userData.username,
        full_name: userData.fullName,
        company: userData.company,
        role: userData.role || 'analyst',
        email_verified: false,
      }

      const { data: profileResult, error: profileError } = await supabase
        .from('user_profiles')
        .insert([profileData])
        .select()

      if (profileError) {
        console.error('Error creating profile:', profileError)
      }

      // Send custom verification email via Resend API
      try {
        console.log('Sending verification email via Resend...')
        const verifyResponse = await fetch('/api/send-verification-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.user.email,
            userId: data.user.id,
            userName: userData.fullName || userData.username || data.user.email?.split('@')[0]
          })
        })

        if (!verifyResponse.ok) {
          console.error('Failed to send verification email:', await verifyResponse.text())
          // Don't fail signup if email sending fails
        } else {
          console.log('Verification email sent successfully')
        }
      } catch (emailError) {
        console.error('Error sending verification email:', emailError)
        // Don't fail signup if email sending fails
      }
    }

    return { data, error }
  }

  const signOut = async () => {
    // Prevent multiple simultaneous sign out calls
    if (signingOut) {
      console.log('AuthContext: Sign out already in progress, skipping...')
      return
    }

    try {
      setSigningOut(true)
      console.log('AuthContext: Signing out...')

      // Stop web session tracking
      await stopWebSessionTracking()

      // Clear state first
      setUser(null)
      setUserProfile(null)

      // Sign out from Supabase with scope: 'local' to clear local cookies immediately
      const { error } = await supabase.auth.signOut({ scope: 'local' })

      if (error) {
        console.error('AuthContext: Sign out error:', error)
      }

      console.log('AuthContext: Sign out complete, redirecting...')

      // Add a flag to prevent auto-redirect on signin page
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('justLoggedOut', 'true')
        // Use window.location for a hard redirect to ensure clean state
        window.location.href = '/auth/signin'
      }
    } catch (error) {
      console.error('AuthContext: Sign out failed:', error)
      // Force redirect even on error
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('justLoggedOut', 'true')
        window.location.href = '/auth/signin'
      }
    } finally {
      // Don't reset signingOut here - let the page redirect happen
    }
  }

  const updateProfile = async (profileData: any) => {
    if (!user) return { error: 'No user logged in' }

    const { data, error } = await supabase
      .from('user_profiles')
      .update(profileData)
      .eq('id', user.id)
      .select()
      .single()

    if (!error) {
      setUserProfile(data)
    }

    return { data, error }
  }

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 