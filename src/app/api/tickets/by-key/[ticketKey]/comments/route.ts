import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
const supabase = createClient(supabaseUrl, supabaseServiceKey)
const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)

interface CreateCommentRequest {
  content: string
  is_internal?: boolean // Admin-only comments
  attachment_ids?: string[] // IDs of attachments to associate with this comment
}

// Authentication helper function
async function authenticateRequest(request: NextRequest) {
  // Check if this is an admin panel call or Centcom API call
  const referer = request.headers.get('referer') || ''
  const origin = request.headers.get('origin') || ''
  const isAdminCall = referer.includes('/admin/') || origin.includes('localhost:3594')

  // Set up CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version, x-client-app, x-client-version',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  }

  let user = null

  if (isAdminCall) {
    // For admin panel calls, we assume admin privileges
    console.log('🎫 Comments API: Admin panel call detected, using service role')
    user = { id: undefined, email: 'admin@lyceum.io' } // Use undefined for admin calls
  } else {
    // For Centcom API calls, validate the authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { 
        user: null, 
        error: 'Missing or invalid authorization header', 
        headers 
      }
    }

    const token = authHeader.replace('Bearer ', '')
    
    try {
      // Try Supabase auth first
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !authUser) {
        console.log('🎫 Comments API: Supabase auth failed, trying alternative validation:', authError?.message)
        
        // For legacy tokens, try alternative validation
        try {
          const tokenParts = token.split('.')
          if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
            
            if (payload.email || payload.sub) {
              // Look up user by email or ID using service role
              const { data: userData, error: lookupError } = await serviceSupabase
                .from('user_profiles')
                .select('id, email')
                .or(payload.email ? `email.eq.${payload.email}` : `id.eq.${payload.sub}`)
                .single()
              
              if (userData && !lookupError) {
                user = { id: userData.id, email: userData.email }
                console.log('🎫 Comments API: User found via token lookup', { userId: user.id, email: user.email })
              }
            }
          }
        } catch (decodeError) {
          console.error('🎫 Comments API: Token decode failed:', decodeError)
        }
        
        if (!user) {
          return { 
            user: null, 
            error: 'Invalid authentication token', 
            headers 
          }
        }
      } else {
        user = authUser
      }
    } catch (error) {
      console.error('🎫 Comments API: Authentication error:', error)
      return { 
        user: null, 
        error: 'Authentication failed', 
        headers 
      }
    }
  }

  return { user, error: null, headers, isAdminCall }
}

async function validateTicketAccess(ticketKey: string, userId?: string, isAdminCall: boolean = false) {
  // For admin panel calls, assume admin privileges
  if (isAdminCall) {
    // Try to find ticket by key first, then by ID (for backwards compatibility)
    let ticket = null
    let error = null

    // First, try to find by ticket_key
    const { data: ticketByKey, error: keyError } = await supabase
      .from('support_tickets')
      .select('id, user_id, ticket_key')
      .eq('ticket_key', ticketKey)
      .single()

    if (ticketByKey && !keyError) {
      ticket = ticketByKey
    } else {
      // If not found by key, try by ID (for backwards compatibility with old URLs)
      const { data: ticketById, error: idError } = await supabase
        .from('support_tickets')
        .select('id, user_id, ticket_key')
        .eq('id', ticketKey)
        .single()

      if (ticketById && !idError) {
        ticket = ticketById
      } else {
        error = 'Ticket not found'
      }
    }

    return { 
      hasAccess: !!ticket, 
      isAdmin: true, 
      ticket, 
      error: ticket ? null : error 
    }
  }

  // For non-admin calls, do full validation
  let isAdmin = false
  if (userId) {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()

    isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin'
  }

  // Check if ticket exists and user has access
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select('id, user_id, ticket_key')
    .eq('ticket_key', ticketKey)
    .single()

  if (error || !ticket) {
    return { hasAccess: false, isAdmin, ticket: null, error: 'Ticket not found' }
  }

  // Admin can access all tickets, users can only access their own
  const hasAccess = isAdmin || !userId || ticket.user_id === userId
  return { hasAccess, isAdmin, ticket, error: hasAccess ? null : 'Access denied' }
}

// GET /api/tickets/by-key/[ticketKey]/comments - Get comments for a ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketKey: string }> }
) {
  try {
    const { ticketKey } = await params

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
      user = { id: undefined, email: 'admin@lyceum.io' } // Set id to undefined for admin calls
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
    const { hasAccess, isAdmin, error: accessError } = await validateTicketAccess(ticketKey, user?.id, isAdminCall)
    if (!hasAccess) {
      return NextResponse.json({ error: accessError }, { status: 403 })
    }

    // Get ticket to find ticket ID
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('ticket_key', ticketKey)
      .single()

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
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
        author_id
      `)
      .eq('ticket_id', ticket.id)
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
    console.error('GET /api/tickets/by-key/[ticketKey]/comments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/tickets/by-key/[ticketKey]/comments - Add a comment to a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketKey: string }> }
) {
  try {
    const { ticketKey } = await params

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
      user = { id: undefined, email: 'admin@lyceum.io' } // Set id to undefined for admin calls
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
      console.log('🎫 Comments POST API: Validating token', {
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...'
      })
      
      // For Centcom integration, use enhanced authentication with service role fallback
      const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)
      
      // Try Supabase auth first
      try {
        const { data: authData, error: supabaseError } = await supabase.auth.getUser(token)
        if (supabaseError) {
          console.log('🎫 Comments POST API: Supabase auth failed, trying alternative validation:', supabaseError.message)
          
          // If Supabase auth fails, try to decode the token to get user info
          try {
            // For legacy tokens, extract user email/ID and validate via service role
            const tokenParts = token.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
              console.log('🎫 Comments POST API: Decoded token payload', { 
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
                  console.log('🎫 Comments POST API: User found via token lookup', { userId: user.id, email: user.email })
                } else {
                  console.log('🎫 Comments POST API: User lookup failed', lookupError)
                  // Also try looking up by the decoded user ID in case it's a Supabase auth user ID
                  if (payload.sub) {
                    const { data: authUserData, error: authLookupError } = await serviceSupabase
                      .from('user_profiles')
                      .select('id, email')
                      .eq('id', payload.sub)
                      .single()
                    
                    if (authUserData && !authLookupError) {
                      user = { id: authUserData.id, email: authUserData.email }
                      console.log('🎫 Comments POST API: User found via auth ID lookup', { userId: user.id, email: user.email })
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
    }

    // Check access
    const { hasAccess, isAdmin, ticket, error: accessError } = await validateTicketAccess(ticketKey, user?.id, isAdminCall)
    if (!hasAccess) {
      return NextResponse.json({ error: accessError }, { 
        status: 403,
        headers 
      })
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { 
        status: 404,
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

    // Get user profile info (skip for admin calls with undefined ID)
    let userProfile = null
    if (user?.id) {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('username, full_name')
        .eq('id', user.id)
        .single()
      userProfile = profileData
    }

    // Prepare comment data
    const commentData = {
      ticket_id: ticket.id,
      author_id: user?.id || null, // Handle undefined user IDs for admin calls
      author_name: userProfile?.full_name || userProfile?.username || user?.email?.split('@')[0] || 'Unknown User',
      author_type: isAdmin ? 'admin' : 'user',
      content: body.content.trim(),
      is_internal: isInternal
    }

    console.log('Creating comment on ticket:', { 
      ticketKey, 
      ticketId: ticket.id,
      author: user.email, 
      isInternal,
      contentPreview: body.content.substring(0, 100) + '...' 
    })

    // Create the comment
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

    console.log('✅ Comment created successfully on ticket:', ticketKey)

    // Associate attachments with the comment if provided
    if (body.attachment_ids && body.attachment_ids.length > 0) {
      console.log('🔗 Associating attachments with comment:', body.attachment_ids)
      
      const { error: attachmentError } = await supabase
        .from('ticket_attachments')
        .update({ comment_id: comment.id })
        .in('id', body.attachment_ids)
      
      if (attachmentError) {
        console.error('Error associating attachments with comment:', attachmentError)
        // Don't fail the entire operation, just log the error
      } else {
        console.log('✅ Attachments associated with comment successfully')
      }
    }

    return NextResponse.json({
      success: true,
      comment,
      message: 'Comment added successfully'
    }, { headers })

  } catch (error: any) {
    console.error('POST /api/tickets/by-key/[ticketKey]/comments error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// PATCH /api/tickets/by-key/[ticketKey]/comments - Update a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ticketKey: string }> }
) {
  try {
    const { ticketKey } = await params
    const { user, error: authError, headers, isAdminCall } = await authenticateRequest(request)

    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401, headers })
    }

    const body = await request.json()
    const { commentId, content, edit_reason } = body

    if (!commentId || !content?.trim()) {
      return NextResponse.json({ 
        error: 'Comment ID and content are required' 
      }, { status: 400, headers })
    }

    // First, get the comment by ID only to check if it exists
    const { data: comment, error: commentError } = await supabase
      .from('ticket_comments')
      .select('*')
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      return NextResponse.json({ 
        error: 'Comment not found',
        details: commentError?.message 
      }, { status: 404, headers })
    }

    // Now get the ticket to verify ownership
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', comment.ticket_id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ 
        error: 'Associated ticket not found' 
      }, { status: 404, headers })
    }

    // Verify this comment belongs to the correct ticket
    if (ticket.ticket_key !== ticketKey) {
      return NextResponse.json({ 
        error: 'Comment does not belong to this ticket' 
      }, { status: 400, headers })
    }

    // Check if user has permission to edit this comment
    // Users can only edit their own comments, admins can edit any comment
    const isAdmin = isAdminCall || (user?.id && await checkAdminRole(user.id))
    
    if (!isAdmin && comment.author_id !== user?.id) {
      return NextResponse.json({ 
        error: 'You can only edit your own comments' 
      }, { status: 403, headers })
    }

    // Update the comment
    const { data: updatedComment, error: updateError } = await supabase
      .from('ticket_comments')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString(),
        edited_by: user?.id || null,
        edit_reason: edit_reason || 'Content updated'
      })
      .eq('id', commentId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating comment:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update comment',
        details: updateError.message 
      }, { status: 500, headers })
    }

    // Create a timeline event for the comment edit
    try {
      await supabase
        .from('ticket_status_history')
        .insert({
          ticket_id: comment.ticket_id,
          old_status: null,
          new_status: null,
          changed_by: user?.id || null, // Explicitly set to null for admin users
          change_reason: 'Comment edited',
          field_changes: {
            action: 'comment_edited',
            comment_id: commentId,
            edit_reason: edit_reason || 'Content updated',
            admin_action: isAdminCall // Flag to identify admin actions
          }
        })
    } catch (timelineError) {
      console.error('Failed to create timeline event for comment edit:', timelineError)
      // Don't fail the main operation if timeline creation fails
    }

    return NextResponse.json({
      success: true,
      comment: updatedComment,
      message: 'Comment updated successfully'
    }, { headers })

  } catch (error: any) {
    console.error('PATCH /api/tickets/by-key/[ticketKey]/comments error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// DELETE /api/tickets/by-key/[ticketKey]/comments - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ticketKey: string }> }
) {
  try {
    const { ticketKey } = await params
    const { user, error: authError, headers, isAdminCall } = await authenticateRequest(request)

    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401, headers })
    }

    const body = await request.json()
    const { commentId } = body

    if (!commentId) {
      return NextResponse.json({ 
        error: 'Comment ID is required' 
      }, { status: 400, headers })
    }

    // First, get the comment by ID only to check if it exists
    const { data: comment, error: commentError } = await supabase
      .from('ticket_comments')
      .select('*')
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      return NextResponse.json({ 
        error: 'Comment not found',
        details: commentError?.message 
      }, { status: 404, headers })
    }

    // Now get the ticket to verify ownership
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', comment.ticket_id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ 
        error: 'Associated ticket not found' 
      }, { status: 404, headers })
    }

    // Verify this comment belongs to the correct ticket
    if (ticket.ticket_key !== ticketKey) {
      return NextResponse.json({ 
        error: 'Comment does not belong to this ticket' 
      }, { status: 400, headers })
    }

    // Check if user has permission to delete this comment
    // Users can only delete their own comments, admins can delete any comment
    const isAdmin = isAdminCall || (user?.id && await checkAdminRole(user.id))
    
    if (!isAdmin && comment.author_id !== user?.id) {
      return NextResponse.json({ 
        error: 'You can only delete your own comments' 
      }, { status: 403, headers })
    }

    // Delete associated attachments from storage and database
    const { data: attachments } = await supabase
      .from('ticket_attachments')
      .select('*')
      .eq('comment_id', commentId)

    if (attachments && attachments.length > 0) {
      // Delete files from storage
      const filePaths = attachments.map(att => att.storage_path)
      const { error: storageError } = await supabase.storage
        .from('ticket-attachments')
        .remove(filePaths)

      if (storageError) {
        console.error('Error deleting attachments from storage:', storageError)
        // Continue with comment deletion even if storage cleanup fails
      }

      // Delete attachment records from database
      const { error: attachmentDeleteError } = await supabase
        .from('ticket_attachments')
        .delete()
        .eq('comment_id', commentId)

      if (attachmentDeleteError) {
        console.error('Error deleting attachment records:', attachmentDeleteError)
        // Continue with comment deletion
      }
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from('ticket_comments')
      .delete()
      .eq('id', commentId)

    if (deleteError) {
      console.error('Error deleting comment:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete comment',
        details: deleteError.message 
      }, { status: 500, headers })
    }

    // Create a timeline event for the comment deletion
    try {
      await supabase
        .from('ticket_status_history')
        .insert({
          ticket_id: comment.ticket_id,
          old_status: null,
          new_status: null,
          changed_by: user?.id || null, // Explicitly set to null for admin users
          change_reason: 'Comment deleted',
          field_changes: {
            action: 'comment_deleted',
            comment_id: commentId,
            had_attachments: attachments && attachments.length > 0,
            admin_action: isAdminCall // Flag to identify admin actions
          }
        })
    } catch (timelineError) {
      console.error('Failed to create timeline event for comment deletion:', timelineError)
      // Don't fail the main operation if timeline creation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Comment and associated attachments deleted successfully'
    }, { headers })

  } catch (error: any) {
    console.error('DELETE /api/tickets/by-key/[ticketKey]/comments error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// Helper function to check if user is admin
async function checkAdminRole(userId: string): Promise<boolean> {
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return userProfile?.role === 'admin' || userProfile?.role === 'superadmin'
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
