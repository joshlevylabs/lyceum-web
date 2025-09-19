import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface CreateCommentRequest {
  content: string
  is_internal?: boolean // Admin-only comments
}

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
    .select('id, user_id, ticket_key')
    .eq('id', ticketId)
    .single()

  if (error || !ticket) {
    return { hasAccess: false, isAdmin, ticket: null, error: 'Ticket not found' }
  }

  // Admin can access all tickets, users can only access their own
  const hasAccess = isAdmin || ticket.user_id === userId
  return { hasAccess, isAdmin, ticket, error: hasAccess ? null : 'Access denied' }
}

// GET /api/tickets/[ticketId]/comments - Get comments for a ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params

    // Check if this is an admin panel call or Centcom API call
    const referer = request.headers.get('referer') || ''
    const requestOrigin = request.headers.get('origin') || ''
    const isAdminCall = referer.includes('/admin/') || requestOrigin.includes('localhost:3594')

    let user = null
    let authError = null

    if (isAdminCall) {
      // For admin panel calls, we assume admin privileges (authentication handled by the admin layout)
      // This is a placeholder - in production you'd validate the session differently
      console.log('🎫 Comments API: Admin panel call detected, using service role')
      
    // For now, we'll use a default admin user - in production this should come from session
    user = { id: 'admin-user', email: 'admin@lyceum.io' }
  } else {
    // For Centcom API calls, validate the authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🎫 Comments API: Validating token', {
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...'
    })
    
    // For Centcom integration, use enhanced authentication with service role fallback
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)
      
      // Try Supabase auth first
      try {
        const { data: authData, error: supabaseError } = await supabase.auth.getUser(token)
        if (supabaseError) {
          console.log('🎫 Comments API: Supabase auth failed, trying alternative validation:', supabaseError.message)
          
          // If Supabase auth fails, try to decode the token to get user info
          try {
            // For legacy tokens, extract user email/ID and validate via service role
            const tokenParts = token.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
              console.log('🎫 Comments API: Decoded token payload', { 
                hasEmail: !!payload.email, 
                hasUserId: !!payload.sub,
                email: payload.email 
              })
              
              if (payload.email || payload.sub) {
                // Look up user by email or ID using service role in user_profiles table
                const { data: userData, error: lookupError } = await serviceSupabase
                  .from('user_profiles')
                  .select('id, email')
                  .or(payload.email ? `email.eq.${payload.email}` : `id.eq.${payload.sub}`)
                  .single()
                
                if (userData && !lookupError) {
                  user = { id: userData.id, email: userData.email }
                  console.log('🎫 Comments API: User found via token lookup', { userId: user.id, email: user.email })
                } else {
                  console.log('🎫 Comments API: User lookup failed', lookupError)
                  // Also try looking up by the decoded user ID in case it's a Supabase auth user ID
                  if (payload.sub) {
                    const { data: authUserData, error: authLookupError } = await serviceSupabase
                      .from('user_profiles')
                      .select('id, email')
                      .eq('id', payload.sub)
                      .single()
                    
                    if (authUserData && !authLookupError) {
                      user = { id: authUserData.id, email: authUserData.email }
                      console.log('🎫 Comments API: User found via auth ID lookup', { userId: user.id, email: user.email })
                    } else {
                      console.log('🎫 Comments API: Auth ID lookup also failed', authLookupError)
                    }
                  }
                }
              }
            }
          } catch (decodeError) {
            console.log('🎫 Comments API: Token decode failed', decodeError)
          }
        } else {
          user = authData.user
        }
      } catch (error) {
        console.log('🎫 Comments API: Auth validation error', error)
        authError = error
      }
    }
    
    console.log('🎫 Comments API: Final authentication result', {
      hasUser: !!user,
      hasError: !!authError,
      userId: user?.id,
      userEmail: user?.email
    })
    
    if (!user) {
      console.log('🎫 Comments API: Authentication failed')
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    // Check access
    const { hasAccess, isAdmin, error: accessError } = await validateTicketAccess(ticketId, user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: accessError }, { status: 403 })
    }

    // Build query for comments
    let query = supabase
      .from('ticket_comments')
      .select(`
        id,
        content,
        author_name,
        author_type,
        is_internal,
        created_at,
        updated_at,
        edit_reason,
        author:user_profiles!author_id(id, username, full_name)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    // Non-admin users cannot see internal comments
    if (!isAdmin) {
      query = query.eq('is_internal', false)
    }

    const { data: comments, error } = await query

    if (error) {
      console.error('Error fetching ticket comments:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      comments: comments || []
    })

  } catch (error: any) {
    console.error('GET /api/tickets/[ticketId]/comments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/tickets/[ticketId]/comments - Add a comment to a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params

    // Handle CORS
    const origin = request.headers.get('origin')
    const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'tauri://localhost']
    const corsOrigin = allowedOrigins.includes(origin || '') ? origin : '*'
    
    const headers = {
      'Access-Control-Allow-Origin': corsOrigin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version, x-client-app, x-client-version',
      'Access-Control-Allow-Credentials': 'true'
    }

    // Check if this is an admin panel call or Centcom API call
    const referer = request.headers.get('referer') || ''
    const requestOrigin = request.headers.get('origin') || ''
    const isAdminCall = referer.includes('/admin/') || requestOrigin.includes('localhost:3594')

    let user = null
    let authError = null

    if (isAdminCall) {
      // For admin panel calls, we assume admin privileges (authentication handled by the admin layout)
      console.log('🎫 Comments POST API: Admin panel call detected, using service role')
      
      // For now, we'll use a default admin user - in production this should come from session
      user = { id: 'admin-user', email: 'admin@lyceum.io' }
    } else {
      // For Centcom API calls, validate the authorization token
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid authorization header' }, { 
          status: 401,
          headers 
        })
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !authUser) {
        return NextResponse.json({ error: 'Invalid authentication token' }, { 
          status: 401,
          headers 
        })
      }
      
      user = authUser
    }

    // Check access
    const { hasAccess, isAdmin, ticket, error: accessError } = await validateTicketAccess(ticketId, user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: accessError }, { 
        status: 403,
        headers 
      })
    }

    const body: CreateCommentRequest = await request.json()
    
    // Validate required fields
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Comment content is required' 
      }, { 
        status: 400,
        headers 
      })
    }

    // Only admins can create internal comments
    const isInternal = body.is_internal && isAdmin

    // Get user profile info
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('username, full_name')
      .eq('id', user.id)
      .single()

    // Prepare comment data
    const commentData = {
      ticket_id: ticketId,
      author_id: user.id,
      author_name: userProfile?.full_name || userProfile?.username || user.email?.split('@')[0] || 'Unknown User',
      author_type: isAdmin ? 'admin' : 'user',
      content: body.content.trim(),
      is_internal: isInternal
    }

    console.log('Creating comment:', { 
      ticketId, 
      ticketKey: ticket?.ticket_key,
      author: user.email, 
      isInternal,
      contentPreview: body.content.substring(0, 100) + '...' 
    })

    // Create the comment
    const { data: comment, error: createError } = await supabase
      .from('ticket_comments')
      .insert([commentData])
      .select(`
        *,
        author:user_profiles!author_id(id, username, full_name)
      `)
      .single()

    if (createError) {
      console.error('Error creating comment:', createError)
      return NextResponse.json({ 
        error: 'Failed to create comment', 
        details: createError.message 
      }, { 
        status: 500,
        headers 
      })
    }

    console.log('✅ Comment created successfully on ticket:', ticket?.ticket_key)

    return NextResponse.json({
      success: true,
      comment,
      message: 'Comment added successfully'
    }, { headers })

  } catch (error: any) {
    console.error('POST /api/tickets/[ticketId]/comments error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version, x-client-app, x-client-version',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  })
}
