import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface UpdateTicketRequest {
  status?: 'open' | 'in_progress' | 'pending_user' | 'resolved' | 'closed' | 'duplicate' | 'wont_fix'
  priority?: 'critical' | 'high' | 'medium' | 'low'
  severity?: 'critical' | 'major' | 'minor' | 'cosmetic'
  assigned_to_admin_id?: string | null
  resolution?: string
  internal_notes?: string
  estimated_effort_hours?: number
  actual_effort_hours?: number
  tags?: string[]
}

async function validateUserAccess(ticketId: string, userId: string, requireAdmin: boolean = false) {
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin'

  if (requireAdmin && !isAdmin) {
    return { hasAccess: false, isAdmin: false, error: 'Admin privileges required' }
  }

  // Check if ticket exists and user has access
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select('id, user_id')
    .eq('id', ticketId)
    .single()

  if (error || !ticket) {
    return { hasAccess: false, isAdmin, error: 'Ticket not found' }
  }

  // Admin can access all tickets, users can only access their own
  const hasAccess = isAdmin || ticket.user_id === userId
  return { hasAccess, isAdmin, error: hasAccess ? null : 'Access denied' }
}

// GET /api/tickets/[ticketId] - Get ticket details
export async function GET(
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version, x-client-app, x-client-version',
      'Access-Control-Allow-Credentials': 'true'
    }

    // Check if this is an admin call (from admin panel)
    const referer = request.headers.get('referer')
    const isAdminCall = referer?.includes('/admin/') || origin?.includes('localhost:3594')

    let currentUserId = null
    let isAdmin = false

    if (isAdminCall) {
      // For admin panel calls, we assume admin privileges
      isAdmin = true
    } else {
      // For Centcom API calls, validate authentication
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
      }

      currentUserId = user.id

      // Check access
      const { hasAccess, isAdmin: userIsAdmin, error: accessError } = await validateUserAccess(ticketId, user.id)
      if (!hasAccess) {
        return NextResponse.json({ error: accessError }, { status: 403 })
      }
      isAdmin = userIsAdmin
    }

    // Fetch ticket with full details
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        assigned_admin:user_profiles!assigned_to_admin_id(id, username, full_name, email),
        comments:ticket_comments(
          id, content, author_name, author_type, is_internal, created_at, updated_at,
          author:user_profiles!author_id(id, username, full_name)
        ),
        attachments:ticket_attachments(
          id, filename, original_filename, file_size, mime_type, attachment_type, 
          description, uploaded_at, is_public, scan_status,
          uploader:user_profiles!uploaded_by(id, username, full_name)
        ),
        status_history:ticket_status_history(
          id, old_status, new_status, change_reason, created_at,
          changer:user_profiles!changed_by(id, username, full_name)
        )
      `)
      .eq('id', ticketId)
      .order('created_at', { foreignTable: 'comments', ascending: true })
      .order('created_at', { foreignTable: 'status_history', ascending: true })
      .single()

    if (error) {
      console.error('Error fetching ticket details:', error)
      return NextResponse.json({ error: 'Failed to fetch ticket details' }, { status: 500 })
    }

    // Filter internal comments for non-admin users
    if (!isAdmin && ticket.comments) {
      ticket.comments = ticket.comments.filter((comment: any) => !comment.is_internal)
    }

    // Filter non-public attachments for non-admin users
    if (!isAdmin && ticket.attachments) {
      ticket.attachments = ticket.attachments.filter((attachment: any) => 
        attachment.is_public || attachment.uploaded_by === user.id
      )
    }

    return NextResponse.json({
      success: true,
      ticket
    }, { headers })

  } catch (error: any) {
    console.error('GET /api/tickets/[ticketId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version'
      }
    })
  }
}

// PUT /api/tickets/[ticketId] - Update ticket (admin only for status changes)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params

    // Check if this is an admin call (from admin panel)
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const isAdminCall = referer?.includes('/admin/') || origin?.includes('localhost:3594')

    let currentUserId = null
    let isAdmin = false

    const body: UpdateTicketRequest = await request.json()

    if (isAdminCall) {
      // For admin panel calls, we assume admin privileges
      isAdmin = true
    } else {
      // For Centcom API calls, validate authentication
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
      }

      currentUserId = user.id

      // Check if user is trying to update admin-only fields
      const adminOnlyFields = ['status', 'assigned_to_admin_id', 'internal_notes', 'resolution', 'estimated_effort_hours', 'actual_effort_hours']
      const hasAdminFields = adminOnlyFields.some(field => field in body)

      // Check access (require admin for admin-only fields)
      const { hasAccess, isAdmin: userIsAdmin, error: accessError } = await validateUserAccess(ticketId, user.id, hasAdminFields)
      if (!hasAccess) {
        return NextResponse.json({ error: accessError }, { status: 403 })
      }
      isAdmin = userIsAdmin
    }

    // Prepare update data
    const updateData: any = {}
    
    if (isAdmin) {
      // Admins can update all fields
      if (body.status) updateData.status = body.status
      if (body.priority) updateData.priority = body.priority
      if (body.severity) updateData.severity = body.severity
      if ('assigned_to_admin_id' in body) updateData.assigned_to_admin_id = body.assigned_to_admin_id
      if (body.resolution) updateData.resolution = body.resolution
      if (body.internal_notes) updateData.internal_notes = body.internal_notes
      if (body.estimated_effort_hours) updateData.estimated_effort_hours = body.estimated_effort_hours
      if (body.actual_effort_hours) updateData.actual_effort_hours = body.actual_effort_hours
      if (body.tags) updateData.tags = body.tags
    } else {
      // Regular users can only update limited fields (like tags)
      if (body.tags) updateData.tags = body.tags
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    console.log('Updating ticket:', { ticketId, updateData, updatedBy: currentUserId || 'admin' })

    // Update the ticket
    const { data: updatedTicket, error: updateError } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select(`
        *,
        assigned_admin:user_profiles!assigned_to_admin_id(id, username, full_name)
      `)
      .single()

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update ticket', 
        details: updateError.message 
      }, { status: 500 })
    }

    // If admin updated the ticket, log who made the change
    if (isAdmin && body.status && currentUserId) {
      await supabase
        .from('ticket_status_history')
        .update({ changed_by: currentUserId })
        .eq('ticket_id', ticketId)
        .eq('new_status', body.status)
        .order('created_at', { ascending: false })
        .limit(1)
    }

    console.log('✅ Ticket updated successfully:', updatedTicket.ticket_key)

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: `Ticket ${updatedTicket.ticket_key} updated successfully`
    })

  } catch (error: any) {
    console.error('PUT /api/tickets/[ticketId] error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// DELETE /api/tickets/[ticketId] - Delete ticket (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params

    // Check if this is an admin call (from admin panel)
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const isAdminCall = referer?.includes('/admin/') || origin?.includes('localhost:3594')

    let currentUserId = null
    let isAdmin = false

    if (isAdminCall) {
      // For admin panel calls, we assume admin privileges
      isAdmin = true
    } else {
      // For Centcom API calls, validate authentication
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
      }

      currentUserId = user.id

      // Check access (admin only for deletions)
      const { hasAccess, isAdmin: userIsAdmin, error: accessError } = await validateUserAccess(ticketId, user.id, true)
      if (!hasAccess) {
        return NextResponse.json({ error: accessError }, { status: 403 })
      }
      isAdmin = userIsAdmin
    }

    // Get ticket info before deletion
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('ticket_key')
      .eq('id', ticketId)
      .single()

    console.log('Deleting ticket:', { ticketId, ticketKey: ticket?.ticket_key, deletedBy: currentUserId || 'admin' })

    // Delete the ticket (cascading will handle related records)
    const { error: deleteError } = await supabase
      .from('support_tickets')
      .delete()
      .eq('id', ticketId)

    if (deleteError) {
      console.error('Error deleting ticket:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete ticket', 
        details: deleteError.message 
      }, { status: 500 })
    }

    console.log('✅ Ticket deleted successfully:', ticket?.ticket_key)

    return NextResponse.json({
      success: true,
      message: `Ticket ${ticket?.ticket_key} deleted successfully`
    })

  } catch (error: any) {
    console.error('DELETE /api/tickets/[ticketId] error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// OPTIONS /api/tickets/[ticketId] - Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'tauri://localhost']
  const corsOrigin = allowedOrigins.includes(origin || '') ? origin : '*'
  
  return new NextResponse(null, {
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