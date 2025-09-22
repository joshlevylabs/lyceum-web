import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface TimelineEvent {
  id: string
  type: 'created' | 'comment' | 'status_change' | 'assignment' | 'resolution' | 'attachment' | 'update'
  timestamp: string
  author: string
  authorType: 'user' | 'admin' | 'system'
  title: string
  description?: string
  metadata?: Record<string, any>
  attachments?: any[] // Attachments associated with this timeline event (e.g., comment attachments)
}

async function validateUserAccess(ticketKey: string, userId?: string, isAdminCall: boolean = false) {
  // For admin panel calls, assume admin privileges
  if (isAdminCall) {
    // Try to find ticket by key first, then by ID (for backwards compatibility)
    let ticket = null
    let error = null

    // First, try to find by ticket_key
    const { data: ticketByKey, error: keyError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('ticket_key', ticketKey)
      .single()

    if (ticketByKey && !keyError) {
      ticket = ticketByKey
    } else {
      // If not found by key, try by ID (for backwards compatibility with old URLs)
      const { data: ticketById, error: idError } = await supabase
        .from('support_tickets')
        .select('*')
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
    .select('*')
    .eq('ticket_key', ticketKey)
    .single()

  if (error || !ticket) {
    return { hasAccess: false, isAdmin, ticket: null, error: 'Ticket not found' }
  }

  // Admin can access all tickets, users can only access their own
  const hasAccess = isAdmin || !userId || ticket.user_id === userId
  return { hasAccess, isAdmin, ticket, error: hasAccess ? null : 'Access denied' }
}

async function generateTimeline(ticket: any, isAdmin: boolean): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = []

  // Add ticket creation event
  events.push({
    id: `created-${ticket.id}`,
    type: 'created',
    timestamp: ticket.created_at,
    author: ticket.username,
    authorType: 'user',
    title: 'Ticket Created',
    description: `${ticket.ticket_type.replace('_', ' ').toUpperCase()} ticket created: ${ticket.title}`,
    metadata: {
      ticketType: ticket.ticket_type,
      priority: ticket.priority,
      severity: ticket.severity
    }
  })

  // Add comments
  let commentQuery = supabase
    .from('ticket_comments')
    .select('*')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: true })

  // Non-admin users cannot see internal comments
  if (!isAdmin) {
    commentQuery = commentQuery.eq('is_internal', false)
  }

  const { data: comments } = await commentQuery

  if (comments) {
    // Fetch attachments for all comments at once for efficiency
    const commentIds = comments.map(c => c.id)
    const { data: commentAttachments } = await supabase
      .from('ticket_attachments')
      .select('*')
      .in('comment_id', commentIds)
      .order('uploaded_at', { ascending: true })
    
    // Group attachments by comment_id and generate public URLs
    const attachmentsByComment = commentAttachments?.reduce((acc, attachment) => {
      if (!acc[attachment.comment_id]) {
        acc[attachment.comment_id] = []
      }
      
      // Generate proper Supabase storage public URL
      const { data: urlData } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(attachment.storage_path)
      
      acc[attachment.comment_id].push({
        ...attachment,
        public_url: urlData.publicUrl
      })
      return acc
    }, {} as Record<string, any[]>) || {}

    comments.forEach(comment => {
      const commentAttachmentsForThisComment = attachmentsByComment[comment.id] || []
      
      events.push({
        id: `comment-${comment.id}`,
        commentId: comment.id, // Add the actual comment ID for edit/delete operations
        type: 'comment',
        timestamp: comment.created_at,
        author: comment.author_name,
        authorType: comment.author_type,
        title: comment.is_internal ? 'Internal Comment Added' : 'Comment Added',
        description: comment.content,
        attachments: commentAttachmentsForThisComment,
        metadata: {
          isInternal: comment.is_internal,
          edited: comment.updated_at !== comment.created_at
        }
      })
    })
  }

  // Add status changes from ticket_status_history
  const { data: statusHistory } = await supabase
    .from('ticket_status_history')
    .select(`
      *,
      changer:user_profiles!left!changed_by(username, full_name)
    `)
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: true })

  if (statusHistory) {
    statusHistory.forEach(change => {
      // Handle admin users who might not have a profile or be null
      const changerName = change.changer?.full_name || change.changer?.username || 
                         (change.field_changes?.admin_action ? 'Admin' : 'System')
      
      // Handle comment-related events
      if (change.field_changes?.action === 'comment_edited') {
        events.push({
          id: `comment-edit-${change.id}`,
          type: 'comment_edit',
          timestamp: change.created_at,
          author: changerName,
          authorType: 'admin',
          title: 'Comment edited',
          description: change.field_changes.edit_reason || 'Comment content was updated',
          metadata: {
            commentId: change.field_changes.comment_id,
            action: 'comment_edited'
          }
        })
      } else if (change.field_changes?.action === 'comment_deleted') {
        events.push({
          id: `comment-delete-${change.id}`,
          type: 'comment_delete',
          timestamp: change.created_at,
          author: changerName,
          authorType: 'admin',
          title: 'Comment deleted',
          description: change.field_changes.had_attachments 
            ? 'Comment and associated attachments were deleted'
            : 'Comment was deleted',
          metadata: {
            commentId: change.field_changes.comment_id,
            hadAttachments: change.field_changes.had_attachments,
            action: 'comment_deleted'
          }
        })
      } else if (change.old_status || change.new_status) {
        // Handle regular status changes
        events.push({
          id: `status-${change.id}`,
          type: 'status_change',
          timestamp: change.created_at,
          author: changerName,
          authorType: 'admin',
          title: `Status changed from ${change.old_status || 'unknown'} to ${change.new_status}`,
          description: change.change_reason,
          metadata: {
            oldStatus: change.old_status,
            newStatus: change.new_status,
            fieldChanges: change.field_changes
          }
        })
      }
    })
  }

  // Add attachments
  const { data: attachments } = await supabase
    .from('ticket_attachments')
    .select(`
      *,
      uploader:user_profiles!uploaded_by(username, full_name)
    `)
    .eq('ticket_id', ticket.id)
    .order('uploaded_at', { ascending: true })

  if (attachments) {
    attachments.forEach(attachment => {
      const uploaderName = attachment.uploader?.full_name || attachment.uploader?.username || 'Unknown User'
      events.push({
        id: `attachment-${attachment.id}`,
        type: 'attachment',
        timestamp: attachment.uploaded_at,
        author: uploaderName,
        authorType: 'user',
        title: `File uploaded: ${attachment.filename}`,
        metadata: {
          filename: attachment.filename,
          fileSize: attachment.file_size,
          mimeType: attachment.mime_type,
          attachmentType: attachment.attachment_type
        }
      })
    })
  }

  // Add assignment events (if assigned_at is available)
  if (ticket.assigned_at && ticket.assigned_to_admin_id) {
    const { data: assignedAdmin } = await supabase
      .from('user_profiles')
      .select('username, full_name')
      .eq('id', ticket.assigned_to_admin_id)
      .single()

    if (assignedAdmin) {
      events.push({
        id: `assignment-${ticket.id}`,
        type: 'assignment',
        timestamp: ticket.assigned_at,
        author: 'System',
        authorType: 'system',
        title: `Assigned to ${assignedAdmin.full_name || assignedAdmin.username}`,
        metadata: {
          assignedTo: assignedAdmin.username,
          assignedId: ticket.assigned_to_admin_id
        }
      })
    }
  }

  // Add resolution event
  if (ticket.resolved_at) {
    events.push({
      id: `resolution-${ticket.id}`,
      type: 'resolution',
      timestamp: ticket.resolved_at,
      author: 'System',
      authorType: 'system',
      title: 'Ticket Resolved',
      description: ticket.resolution,
      metadata: {
        resolution: ticket.resolution
      }
    })
  }

  // Sort events by timestamp (newest first for display)
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

// GET /api/tickets/by-key/[ticketKey]/timeline - Get ticket timeline
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketKey: string }> }
) {
  try {
    const { ticketKey } = await params

    // Check if this is an admin panel call or Centcom API call
    const referer = request.headers.get('referer') || ''
    const origin = request.headers.get('origin') || ''
    const isAdminCall = referer.includes('/admin/') || origin.includes('localhost:3594')

    let user = null

    if (isAdminCall) {
      // For admin panel calls, we assume admin privileges
      console.log('🎫 Timeline API: Admin panel call detected, using service role')
      user = { id: 'admin-user', email: 'admin@lyceum.io' }
    } else {
      // For Centcom API calls, validate the authorization token
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !authUser) {
        return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
      }
      
      user = authUser
    }

    // Check access
    const { hasAccess, isAdmin, ticket, error: accessError } = await validateUserAccess(ticketKey, user?.id, isAdminCall)
    if (!hasAccess) {
      return NextResponse.json({ error: accessError }, { status: 403 })
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Generate timeline
    const timeline = await generateTimeline(ticket, isAdmin || false)

    return NextResponse.json({
      success: true,
      timeline
    })

  } catch (error: any) {
    console.error('GET /api/tickets/by-key/[ticketKey]/timeline error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
