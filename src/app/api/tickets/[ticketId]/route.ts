import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function validateTicketAccess(ticketId: string, userId: string) {
  // Get user profile to check role
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin'

  // Check if ticket exists and user has access
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .single()

  if (error || !ticket) {
    return { hasAccess: false, isAdmin, ticket: null, error: 'Ticket not found' }
  }

  // Admin can access all tickets, users can only access their own
  const hasAccess = isAdmin || ticket.user_id === userId
  return { hasAccess, isAdmin, ticket, error: hasAccess ? null : 'Access denied' }
}

// GET /api/tickets/[ticketId] - Get detailed ticket information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params

    // Handle CORS
    const requestOrigin = request.headers.get('origin')
    const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'tauri://localhost']
    const corsOrigin = allowedOrigins.includes(requestOrigin || '') ? requestOrigin : '*'
    
    const headers = {
      'Access-Control-Allow-Origin': corsOrigin || '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version, x-client-app, x-client-version',
      'Access-Control-Allow-Credentials': 'true'
    }

    // Check if this is an admin panel call or Centcom API call
    const referer = request.headers.get('referer') || ''
    const requestOriginHeader = request.headers.get('origin') || ''
    const isAdminCall = referer.includes('/admin/') || requestOriginHeader.includes('localhost:3594')

    let user = null
    let authError = null

    if (isAdminCall) {
      console.log('🎫 Ticket Detail API: Admin panel call detected, using service role')
      user = { id: 'admin-user', email: 'admin@lyceum.io' }
    } else {
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid authorization header' }, { 
          status: 401,
          headers 
        })
      }

      const token = authHeader.replace('Bearer ', '')
      console.log('🎫 Ticket Detail API: Validating token', {
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...'
      })
      
      const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)
      
      try {
        const { data: authData, error: supabaseError } = await supabase.auth.getUser(token)
        if (supabaseError) {
          console.log('🎫 Ticket Detail API: Supabase auth failed, trying alternative validation:', supabaseError.message)
          try {
            const tokenParts = token.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
              console.log('🎫 Ticket Detail API: Decoded token payload', { 
                hasEmail: !!payload.email, 
                hasUserId: !!payload.sub,
                email: payload.email 
              })
              
              if (payload.email || payload.sub) {
                const { data: userData, error: lookupError } = await serviceSupabase
                  .from('user_profiles')
                  .select('id, email')
                  .or(payload.email ? `email.eq.${payload.email}` : `id.eq.${payload.sub}`)
                  .single()
                
                if (userData && !lookupError) {
                  user = { id: userData.id, email: userData.email }
                  console.log('🎫 Ticket Detail API: User found via token lookup', { userId: user.id, email: user.email })
                } else {
                  console.log('🎫 Ticket Detail API: User lookup failed', lookupError)
                  if (payload.sub) {
                    const { data: authUserData, error: authLookupError } = await serviceSupabase
                      .from('user_profiles')
                      .select('id, email')
                      .eq('id', payload.sub)
                      .single()
                    
                    if (authUserData && !authLookupError) {
                      user = { id: authUserData.id, email: authUserData.email }
                      console.log('🎫 Ticket Detail API: User found via auth ID lookup', { userId: user.id, email: user.email })
                    } else {
                      console.log('🎫 Ticket Detail API: Auth ID lookup also failed', authLookupError)
                    }
                  }
                }
              }
            }
          } catch (decodeError) {
            console.log('🎫 Ticket Detail API: Token decode failed', decodeError)
          }
        } else {
          user = authData.user
        }
      } catch (error) {
        console.log('🎫 Ticket Detail API: Auth validation error', error)
        authError = error
      }
    }
    
    console.log('🎫 Ticket Detail API: Final authentication result', {
      hasUser: !!user,
      hasError: !!authError,
      userId: user?.id,
      userEmail: user?.email
    })
    
    if (!user) {
      console.log('🎫 Ticket Detail API: Authentication failed')
      return NextResponse.json({ error: 'Invalid authentication token' }, { 
        status: 401,
        headers 
      })
    }

    const { hasAccess, isAdmin, ticket, error: accessError } = await validateTicketAccess(ticketId, user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: accessError }, { 
        status: 403,
        headers 
      })
    }

    return NextResponse.json({
      success: true,
      ticket
    }, { headers })

  } catch (error: any) {
    console.error('GET /api/tickets/[ticketId] error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version'
      }
    })
  }
}

// PUT /api/tickets/[ticketId] - Update ticket (limited fields for regular users)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params

    // Handle CORS
    const requestOrigin = request.headers.get('origin')
    const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'tauri://localhost']
    const corsOrigin = allowedOrigins.includes(requestOrigin || '') ? requestOrigin : '*'
    
    const headers = {
      'Access-Control-Allow-Origin': corsOrigin || '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version, x-client-app, x-client-version',
      'Access-Control-Allow-Credentials': 'true'
    }

    // Check if this is an admin panel call or Centcom API call
    const referer = request.headers.get('referer') || ''
    const requestOriginHeader = request.headers.get('origin') || ''
    const isAdminCall = referer.includes('/admin/') || requestOriginHeader.includes('localhost:3594')

    let user = null

    if (isAdminCall) {
      console.log('🎫 Ticket Update API: Admin panel call detected, using service role')
      user = { id: 'admin-user', email: 'admin@lyceum.io' }
    } else {
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid authorization header' }, { 
          status: 401,
          headers 
        })
      }

      const token = authHeader.replace('Bearer ', '')
      const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)
      
      try {
        const { data: authData, error: supabaseError } = await supabase.auth.getUser(token)
        if (supabaseError) {
          try {
            const tokenParts = token.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
              
              if (payload.email || payload.sub) {
                const { data: userData, error: lookupError } = await serviceSupabase
                  .from('user_profiles')
                  .select('id, email')
                  .or(payload.email ? `email.eq.${payload.email}` : `id.eq.${payload.sub}`)
                  .single()
                
                if (userData && !lookupError) {
                  user = { id: userData.id, email: userData.email }
                }
              }
            }
          } catch (decodeError) {
            console.log('Token decode failed:', decodeError)
          }
        } else {
          user = authData.user
        }
      } catch (error) {
        console.log('Auth validation error:', error)
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { 
        status: 401,
        headers 
      })
    }

    const { hasAccess, isAdmin, ticket, error: accessError } = await validateTicketAccess(ticketId, user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: accessError }, { 
        status: 403,
        headers 
      })
    }

    const body = await request.json()
    
    // Regular users can only update tags, admins can update more fields
    const allowedFields = isAdmin 
      ? ['status', 'priority', 'severity', 'tags', 'internal_notes']
      : ['tags']

    const updateData: any = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        error: 'No valid fields to update' 
      }, { 
        status: 400,
        headers 
      })
    }

    updateData.updated_at = new Date().toISOString()

    const { data: updatedTicket, error: updateError } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update ticket', 
        details: updateError.message 
      }, { 
        status: 500,
        headers 
      })
    }

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Ticket updated successfully'
    }, { headers })

  } catch (error: any) {
    console.error('PUT /api/tickets/[ticketId] error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version'
      }
    })
  }
}

// DELETE /api/tickets/[ticketId] - Delete ticket (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params

    // Handle CORS
    const requestOrigin = request.headers.get('origin')
    const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'tauri://localhost']
    const corsOrigin = allowedOrigins.includes(requestOrigin || '') ? requestOrigin : '*'
    
    const headers = {
      'Access-Control-Allow-Origin': corsOrigin || '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version, x-client-app, x-client-version',
      'Access-Control-Allow-Credentials': 'true'
    }

    // Authentication (similar pattern as above)
    const referer = request.headers.get('referer') || ''
    const requestOriginHeader = request.headers.get('origin') || ''
    const isAdminCall = referer.includes('/admin/') || requestOriginHeader.includes('localhost:3594')

    let user = null

    if (isAdminCall) {
      user = { id: 'admin-user', email: 'admin@lyceum.io' }
    } else {
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid authorization header' }, { 
          status: 401,
          headers 
        })
      }

      // Token validation logic (similar to above)
      const token = authHeader.replace('Bearer ', '')
      const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)
      
      try {
        const { data: authData, error: supabaseError } = await supabase.auth.getUser(token)
        if (supabaseError) {
          try {
            const tokenParts = token.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
              
              if (payload.email || payload.sub) {
                const { data: userData, error: lookupError } = await serviceSupabase
                  .from('user_profiles')
                  .select('id, email')
                  .or(payload.email ? `email.eq.${payload.email}` : `id.eq.${payload.sub}`)
                  .single()
                
                if (userData && !lookupError) {
                  user = { id: userData.id, email: userData.email }
                }
              }
            }
          } catch (decodeError) {
            console.log('Token decode failed:', decodeError)
          }
        } else {
          user = authData.user
        }
      } catch (error) {
        console.log('Auth validation error:', error)
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { 
        status: 401,
        headers 
      })
    }

    const { hasAccess, isAdmin, error: accessError } = await validateTicketAccess(ticketId, user.id)
    if (!hasAccess || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { 
        status: 403,
        headers 
      })
    }

    // Delete the ticket (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('support_tickets')
      .delete()
      .eq('id', ticketId)

    if (deleteError) {
      console.error('Error deleting ticket:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete ticket', 
        details: deleteError.message 
      }, { 
        status: 500,
        headers 
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket deleted successfully'
    }, { headers })

  } catch (error: any) {
    console.error('DELETE /api/tickets/[ticketId] error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version'
      }
    })
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'tauri://localhost']
  const corsOrigin = allowedOrigins.includes(origin || '') ? origin : '*'

  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin || '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version, x-client-app, x-client-version',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  })
}
