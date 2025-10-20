import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTU0MTYsImV4cCI6MjA2ODQ3MTQxNn0.5Wzzoat1TsoLLbsqjuoUEKyawJgYmvrMYbJ-uvosdu0'

// Create a simple Supabase client for API authentication
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface AuthUser {
  id: string
  email: string
  role?: string
}

/**
 * Authenticate a request using the Authorization header
 */
export async function authenticateRequest(request: NextRequest): Promise<{ user: AuthUser | null, error: string | null }> {
  try {
    // Get the Authorization header
    const authHeader = request.headers.get('authorization')
    console.log('🔐 authenticateRequest - authHeader:', authHeader?.substring(0, 40) + '...')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔐 authenticateRequest - Missing or invalid auth header format')
      return { user: null, error: 'Missing or invalid authorization header' }
    }

    // Extract the token
    const token = authHeader.substring(7)
    
    console.log('🔐 Validating token:', token.substring(0, 20) + '...', 'length:', token.length)
    
    // Simple JWT validation - decode and check basic structure
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        console.log('Invalid JWT format: Expected 3 parts, got', parts.length)
        return { user: null, error: 'Invalid JWT format' }
      }
      
      console.log('JWT parts:', parts.map(p => p.substring(0, 10) + '...'))
      
      // Decode the payload (second part) - try base64 first, then base64url
      let payload
      try {
        payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
      } catch (base64Error) {
        console.log('Base64 decode failed, trying base64url:', base64Error.message)
        payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
      }
      
      console.log('Decoded payload:', {
        sub: payload.sub,
        email: payload.email,
        iss: payload.iss,
        exp: payload.exp,
        current_time: Math.floor(Date.now() / 1000)
      })
      
      // Check if token is expired
      if (payload.exp && payload.exp < Date.now() / 1000) {
        console.log('Token expired:', new Date(payload.exp * 1000), 'Current:', new Date())
        return { user: null, error: 'Token expired' }
      }

      // Check if it's a valid JWT from Lyceum or Supabase
      if (!payload.iss || (!payload.iss.includes('supabase') && payload.iss !== 'lyceum')) {
        console.log('Invalid issuer:', payload.iss, '- Expected: supabase or lyceum')
        return { user: null, error: 'Invalid token issuer' }
      }

      // For Lyceum tokens, verify audience
      if (payload.iss === 'lyceum' && payload.aud !== 'centcom') {
        console.log('Invalid audience for Lyceum token:', payload.aud, '- Expected: centcom')
        return { user: null, error: 'Invalid token audience' }
      }

      // Extract user information (handle both Supabase and Lyceum token formats)
      const authUser = {
        id: payload.sub || '',
        email: payload.email || '',
        // Lyceum tokens have roles array, Supabase has role in metadata
        role: payload.roles?.[0] || payload.user_metadata?.role || payload.app_metadata?.role || 'user'
      }
      
      console.log('Auth success for user:', authUser.email, 'role:', authUser.role, 'issuer:', payload.iss)
      
      return {
        user: authUser,
        error: null
      }
      
    } catch (decodeError) {
      console.log('JWT decode error:', decodeError.message)
      console.log('JWT decode error stack:', decodeError.stack)
      return { user: null, error: 'Invalid JWT token' }
    }
    
  } catch (err) {
    console.error('Authentication error:', err)
    return { user: null, error: 'Authentication failed' }
  }
}

/**
 * Check if a user has admin privileges
 */
export function isAdmin(user: AuthUser): boolean {
  return user.role === 'admin' || user.role === 'superadmin'
}

/**
 * Middleware helper for API routes that require authentication
 */
export async function requireAuth(request: NextRequest): Promise<
  | { success: true; user: AuthUser; error: null; response: null }
  | { success: false; user: null; error: string | null; response: Response }
> {
  const { user, error } = await authenticateRequest(request)
  
  if (!user) {
    return {
      success: false,
      user: null,
      error,
      response: new Response(
        JSON.stringify({ error: error || 'Unauthorized' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }

  return { success: true, user, error: null, response: null }
}

/**
 * Middleware helper for API routes that require admin privileges
 */
export async function requireAdmin(request: NextRequest): Promise<
  | { success: true; user: AuthUser; error: null; response: null }
  | { success: false; user: null; error: string | null; response: Response }
> {
  const { success, user, error, response } = await requireAuth(request)
  
  if (!success) return { success: false, user: null, error, response }
  
  if (!isAdmin(user)) {
    return {
      success: false,
      user: null,
      error: 'Admin privileges required',
      response: new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }

  return { success: true, user, error: null, response: null }
}
