'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/auth-helpers-nextjs'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
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
            // Fetch user profile data
            console.log('AuthContext: Fetching user profile...')
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', user.id)
              .single()
            console.log('AuthContext: Profile result:', { profile: !!profile, error: profileError?.message })
            setUserProfile(profile)
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
          console.log('AuthContext: Auth state changed:', { event, hasSession: !!session })
          setUser(session?.user ?? null)
          
          if (session?.user) {
            try {
              const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
              console.log('AuthContext: Profile loaded on auth change:', { profile: !!profile, error: profileError?.message })
              setUserProfile(profile)
            } catch (profileErr) {
              console.warn('AuthContext: Profile fetch failed on auth change:', profileErr)
              setUserProfile(null)
            }
          } else {
            setUserProfile(null)
          }
          
          setLoading(false)
          clearTimeout(loadingTimeoutId)
          console.log('AuthContext: Auth state change processed')
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (data.user && !error) {
      // Create user profile
      const profileData = {
        id: data.user.id,
        email: data.user.email,
        username: userData.username,
        full_name: userData.fullName,
        company: userData.company,
        role: userData.role || 'analyst',
      }
      
      const { data: profileResult, error: profileError } = await supabase
        .from('user_profiles')
        .insert([profileData])
        .select()

      if (profileError) {
        console.error('Error creating profile:', profileError)
      }
    }

    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/signin')
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