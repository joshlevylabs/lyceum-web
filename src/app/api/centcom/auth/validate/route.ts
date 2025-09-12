import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

interface SessionValidationRequest {
  session_token: string
  user_id: string
}

interface SessionValidationResponse {
  success: boolean
  valid: boolean
  user?: {
    id: string
    email: string
    roles: string[]
    permissions: string[]
  }
  error?: string
}

export async function POST(req: NextRequest) {
  // CORS headers for Centcom and testing
  const origin = req.headers.get('origin')
  const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'null']
  const corsOrigin = allowedOrigins.includes(origin || 'null') ? (origin || '*') : 'http://localhost:3003'
  
  const headers = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  try {
    const body: SessionValidationRequest = await req.json()
    const { session_token, user_id } = body

    if (!session_token || !user_id) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Session token and user ID are required'
      }, { status: 400, headers })
    }

    // Verify JWT token
    const signingKey = process.env.CENTCOM_SIGNING_KEY || 'default-dev-key'
    
    try {
      const decoded = jwt.verify(session_token, signingKey) as any
      
      // Verify token claims
      if (decoded.sub !== user_id) {
        return NextResponse.json({
          success: false,
          valid: false,
          error: 'Token user ID mismatch'
        }, { status: 401, headers })
      }

      if (decoded.aud !== 'centcom') {
        return NextResponse.json({
          success: false,
          valid: false,
          error: 'Invalid token audience'
        }, { status: 401, headers })
      }

      // Token is valid
      return NextResponse.json({
        success: true,
        valid: true,
        user: {
          id: decoded.sub,
          email: decoded.email,
          roles: decoded.roles,
          permissions: mapRolesToPermissions(decoded.roles)
        }
      }, { headers })

    } catch (jwtError) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Invalid or expired token'
      }, { status: 401, headers })
    }

  } catch (error: any) {
    console.error('❌ Session validation error:', error)
    return NextResponse.json({
      success: false,
      valid: false,
      error: 'Internal server error'
    }, { status: 500, headers })
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'null']
  const corsOrigin = allowedOrigins.includes(origin || 'null') ? (origin || '*') : 'http://localhost:3003'
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// Helper function: Map roles to permissions (same as in login endpoint)
function mapRolesToPermissions(roles: string[]): string[] {
  const rolePermissionMap: Record<string, string[]> = {
    'admin': ['*:*'],
    'superadmin': ['*:*'],
    'user': ['data:read', 'assets:read'],
    'engineer': ['data:read', 'data:write', 'assets:read', 'analytics:read'],
    'analyst': ['data:read', 'assets:read', 'analytics:read'],
    'viewer': ['data:read']
  }

  const permissions = new Set<string>()
  
  for (const role of roles) {
    const rolePerms = rolePermissionMap[role] || ['data:read']
    rolePerms.forEach(perm => permissions.add(perm))
  }

  return Array.from(permissions)
}
