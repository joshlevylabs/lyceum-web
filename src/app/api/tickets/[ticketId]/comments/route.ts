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

interface EditCommentRequest {
  commentId: string
  content: string
  edit_reason?: string
}

interface DeleteCommentRequest {
  commentId: string
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

    // Handle CORS
    const requestOrigin = request.headers.get('origin')
    const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'tauri://localhost']
    const corsOrigin = allowedOrigins.includes(requestOrigin || '') ? requestOrigin : '*'
    
    const headers = {
      'Access-Control-Allow-Origin': corsOrigin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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
      console.log('🎫 Comments API: Admin panel call detected, using service role')
      user = { id: 'admin-user', email: 'admin@lyceum.io' }
    } else {
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401, headers })
      }

      const token = authHeader.replace('Bearer ', '')
      console.log('🎫 Comments API: Validating token', {
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...'
      })
      
      const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)
      
      try {
        const { data: authData, error: supabaseError } = await supabase.auth.getUser(token)
        if (supabaseError) {
          console.log('🎫 Comments API: Supabase auth failed, trying alternative validation:', supabaseError.message)
          try {
            const tokenParts = token.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
              console.log('🎫 Comments API: Decoded token payload', { 
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
                  console.log('🎫 Comments API: User found via token lookup', { userId: user.id, email: user.email })
                } else {
                  console.log('🎫 Comments API: User lookup failed', lookupError)
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
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401, headers })
    }

    const { hasAccess, isAdmin, error: accessError } = await validateTicketAccess(ticketId, user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: accessError }, { status: 403, headers })
    }

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
        author_id,
        edited_by
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (!isAdmin) {
      query = query.eq('is_internal', false)
    }

    const { data: comments, error } = await query

    if (error) {
      console.error('Error fetching ticket comments:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500, headers })
    }

    return NextResponse.json({
      success: true,
      comments: comments || []
    }, { headers })

  } catch (error: any) {
    console.error('GET /api/tickets/[ticketId]/comments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version'
      }
    })
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      console.log('🎫 Comments POST API: Admin panel call detected, using service role')
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
      console.log('🎫 Comments POST API: Validating token', {
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...'
      })
      
      const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)
      
      try {
        const { data: authData, error: supabaseError } = await supabase.auth.getUser(token)
        if (supabaseError) {
          console.log('🎫 Comments POST API: Supabase auth failed, trying alternative validation:', supabaseError.message)
          try {
            const tokenParts = token.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
              console.log('🎫 Comments POST API: Decoded token payload', { 
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
                  console.log('🎫 Comments POST API: User found via token lookup', { userId: user.id, email: user.email })
                } else {
                  console.log('🎫 Comments POST API: User lookup failed', lookupError)
                  if (payload.sub) {
                    const { data: authUserData, error: authLookupError } = await serviceSupabase
                      .from('user_profiles')
                      .select('id, email')
                      .eq('id', payload.sub)
                      .single()
                    
                    if (authUserData && !authLookupError) {
                      user = { id: authUserData.id, email: authUserData.email }
                      console.log('🎫 Comments POST API: User found via auth ID lookup', { userId: user.id, email: user.id })
                    } else {
                      console.log('🎫 Comments POST API: Auth ID lookup also failed', authLookupError)
                    }
                  }
                }
              }
            }
          } catch (decodeError) {
            console.log('🎫 Comments POST API: Token decode failed', decodeError)
          }
        } else {
          user = authData.user
        }
      } catch (error) {
        console.log('🎫 Comments POST API: Auth validation error', error)
        authError = error
      }
    }
    
    console.log('🎫 Comments POST API: Final authentication result', {
      hasUser: !!user,
      hasError: !!authError,
      userId: user?.id,
      userEmail: user?.email
    })
    
    if (!user) {
      console.log('🎫 Comments POST API: Authentication failed')
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

    const body: CreateCommentRequest = await request.json()
    
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Comment content is required' 
      }, { 
        status: 400,
        headers 
      })
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('full_name, username')
      .eq('id', user.id)
      .single()

    const commentData = {
      ticket_id: ticketId,
      author_id: user.id,
      author_name: userProfile?.full_name || userProfile?.username || user.email?.split('@')[0] || 'Unknown User',
      author_type: isAdmin ? 'admin' : 'user',
      content: body.content.trim(),
      is_internal: body.is_internal && isAdmin // Only admins can post internal comments
    }

    console.log('Creating comment:', { 
      ticketId, 
      ticketKey: ticket?.ticket_key,
      author: user.email, 
      isInternal: commentData.is_internal,
      contentPreview: body.content.substring(0, 100) + '...' 
    })

    const { data: comment, error: createError } = await supabase
      .from('ticket_comments')
      .insert([commentData])
      .select('*')
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
    }, { status: 201, headers })

  } catch (error: any) {
    console.error('POST /api/tickets/[ticketId]/comments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version'
      }
    })
  }
}

// PATCH /api/tickets/[ticketId]/comments - Edit a comment
export async function PATCH(
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
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
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
      console.log('🎫 Comments PATCH API: Admin panel call detected, using service role')
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
      console.log('🎫 Comments PATCH API: Validating token', {
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...'
      })
      
      const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)
      
      try {
        const { data: authData, error: supabaseError } = await supabase.auth.getUser(token)
        if (supabaseError) {
          console.log('🎫 Comments PATCH API: Supabase auth failed, trying alternative validation:', supabaseError.message)
          try {
            const tokenParts = token.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
              console.log('🎫 Comments PATCH API: Decoded token payload', { 
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
                  console.log('🎫 Comments PATCH API: User found via token lookup', { userId: user.id, email: user.email })
                } else {
                  console.log('🎫 Comments PATCH API: User lookup failed', lookupError)
                  if (payload.sub) {
                    const { data: authUserData, error: authLookupError } = await serviceSupabase
                      .from('user_profiles')
                      .select('id, email')
                      .eq('id', payload.sub)
                      .single()
                    
                    if (authUserData && !authLookupError) {
                      user = { id: authUserData.id, email: authUserData.email }
                      console.log('🎫 Comments PATCH API: User found via auth ID lookup', { userId: user.id, email: user.email })
                    } else {
                      console.log('🎫 Comments PATCH API: Auth ID lookup also failed', authLookupError)
                    }
                  }
                }
              }
            }
          } catch (decodeError) {
            console.log('🎫 Comments PATCH API: Token decode failed', decodeError)
          }
        } else {
          user = authData.user
        }
      } catch (error) {
        console.log('🎫 Comments PATCH API: Auth validation error', error)
        authError = error
      }
    }
    
    console.log('🎫 Comments PATCH API: Final authentication result', {
      hasUser: !!user,
      hasError: !!authError,
      userId: user?.id,
      userEmail: user?.email
    })
    
    if (!user) {
      console.log('🎫 Comments PATCH API: Authentication failed')
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

    const body: EditCommentRequest = await request.json()
    
    if (!body.commentId || !body.content || body.content.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Comment ID and content are required' 
      }, { 
        status: 400,
        headers 
      })
    }

    // Get the existing comment to verify ownership
    const { data: existingComment, error: fetchError } = await supabase
      .from('ticket_comments')
      .select('*')
      .eq('id', body.commentId)
      .eq('ticket_id', ticketId)
      .single()

    if (fetchError || !existingComment) {
      return NextResponse.json({ 
        error: 'Comment not found' 
      }, { 
        status: 404,
        headers 
      })
    }

    // Check if user has permission to edit this comment
    // Admins can edit any comment, users can only edit their own
    if (!isAdmin && existingComment.author_id !== user.id) {
      return NextResponse.json({ 
        error: 'You can only edit your own comments' 
      }, { 
        status: 403,
        headers 
      })
    }

    // Update the comment
    const { data: updatedComment, error: updateError } = await supabase
      .from('ticket_comments')
      .update({
        content: body.content.trim(),
        updated_at: new Date().toISOString(),
        edited_by: user.id,
        edit_reason: body.edit_reason || 'Content updated'
      })
      .eq('id', body.commentId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating comment:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update comment', 
        details: updateError.message 
      }, { 
        status: 500,
        headers 
      })
    }

    console.log('✅ Comment updated successfully:', {
      commentId: body.commentId,
      ticketKey: ticket?.ticket_key,
      author: user.email,
      editReason: body.edit_reason
    })

    return NextResponse.json({
      success: true,
      comment: updatedComment,
      message: 'Comment updated successfully'
    }, { headers })

  } catch (error: any) {
    console.error('PATCH /api/tickets/[ticketId]/comments error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version'
      }
    })
  }
}

// DELETE /api/tickets/[ticketId]/comments - Delete a comment
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

    // Check if this is an admin panel call or Centcom API call
    const referer = request.headers.get('referer') || ''
    const requestOriginHeader = request.headers.get('origin') || ''
    const isAdminCall = referer.includes('/admin/') || requestOriginHeader.includes('localhost:3594')

    let user = null
    let authError = null

    if (isAdminCall) {
      console.log('🎫 Comments DELETE API: Admin panel call detected, using service role')
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
      console.log('🎫 Comments DELETE API: Validating token', {
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...'
      })
      
      const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)
      
      try {
        const { data: authData, error: supabaseError } = await supabase.auth.getUser(token)
        if (supabaseError) {
          console.log('🎫 Comments DELETE API: Supabase auth failed, trying alternative validation:', supabaseError.message)
          try {
            const tokenParts = token.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
              console.log('🎫 Comments DELETE API: Decoded token payload', { 
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
                  console.log('🎫 Comments DELETE API: User found via token lookup', { userId: user.id, email: user.email })
                } else {
                  console.log('🎫 Comments DELETE API: User lookup failed', lookupError)
                  if (payload.sub) {
                    const { data: authUserData, error: authLookupError } = await serviceSupabase
                      .from('user_profiles')
                      .select('id, email')
                      .eq('id', payload.sub)
                      .single()
                    
                    if (authUserData && !authLookupError) {
                      user = { id: authUserData.id, email: authUserData.email }
                      console.log('🎫 Comments DELETE API: User found via auth ID lookup', { userId: user.id, email: user.email })
                    } else {
                      console.log('🎫 Comments DELETE API: Auth ID lookup also failed', authLookupError)
                    }
                  }
                }
              }
            }
          } catch (decodeError) {
            console.log('🎫 Comments DELETE API: Token decode failed', decodeError)
          }
        } else {
          user = authData.user
        }
      } catch (error) {
        console.log('🎫 Comments DELETE API: Auth validation error', error)
        authError = error
      }
    }
    
    console.log('🎫 Comments DELETE API: Final authentication result', {
      hasUser: !!user,
      hasError: !!authError,
      userId: user?.id,
      userEmail: user?.email
    })
    
    if (!user) {
      console.log('🎫 Comments DELETE API: Authentication failed')
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

    const body: DeleteCommentRequest = await request.json()
    
    if (!body.commentId) {
      return NextResponse.json({ 
        error: 'Comment ID is required' 
      }, { 
        status: 400,
        headers 
      })
    }

    // Get the existing comment to verify ownership and check for attachments
    const { data: existingComment, error: fetchError } = await supabase
      .from('ticket_comments')
      .select('*')
      .eq('id', body.commentId)
      .eq('ticket_id', ticketId)
      .single()

    if (fetchError || !existingComment) {
      return NextResponse.json({ 
        error: 'Comment not found' 
      }, { 
        status: 404,
        headers 
      })
    }

    // Check if user has permission to delete this comment
    // Admins can delete any comment, users can only delete their own
    if (!isAdmin && existingComment.author_id !== user.id) {
      return NextResponse.json({ 
        error: 'You can only delete your own comments' 
      }, { 
        status: 403,
        headers 
      })
    }

    // First, get all attachments associated with this comment
    const { data: commentAttachments, error: attachmentsError } = await supabase
      .from('ticket_attachments')
      .select('*')
      .eq('comment_id', body.commentId)

    if (attachmentsError) {
      console.error('Error fetching comment attachments:', attachmentsError)
    }

    // Delete associated attachments from storage and database
    if (commentAttachments && commentAttachments.length > 0) {
      console.log(`🗑️ Deleting ${commentAttachments.length} attachments for comment ${body.commentId}`)
      
      // Delete from storage
      for (const attachment of commentAttachments) {
        try {
          const { error: storageError } = await supabase.storage
            .from('ticket-attachments')
            .remove([attachment.storage_path])
          
          if (storageError) {
            console.error('Failed to delete attachment from storage:', storageError)
          }
        } catch (storageError) {
          console.error('Storage deletion error:', storageError)
        }
      }

      // Delete from database
      const { error: deleteAttachmentsError } = await supabase
        .from('ticket_attachments')
        .delete()
        .eq('comment_id', body.commentId)

      if (deleteAttachmentsError) {
        console.error('Error deleting attachments from database:', deleteAttachmentsError)
      }
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from('ticket_comments')
      .delete()
      .eq('id', body.commentId)
      .eq('ticket_id', ticketId)

    if (deleteError) {
      console.error('Error deleting comment:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete comment', 
        details: deleteError.message 
      }, { 
        status: 500,
        headers 
      })
    }

    console.log('✅ Comment and associated attachments deleted successfully:', {
      commentId: body.commentId,
      ticketKey: ticket?.ticket_key,
      author: user.email,
      attachmentsDeleted: commentAttachments?.length || 0
    })

    return NextResponse.json({
      success: true,
      message: commentAttachments && commentAttachments.length > 0 
        ? 'Comment and associated attachments deleted successfully'
        : 'Comment deleted successfully'
    }, { headers })

  } catch (error: any) {
    console.error('DELETE /api/tickets/[ticketId]/comments error:', error)
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
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version, x-client-app, x-client-version',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  })
}