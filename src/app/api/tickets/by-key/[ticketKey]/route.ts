import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

// GET /api/tickets/by-key/[ticketKey] - Get ticket details by key
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
      console.log('🎫 Ticket by key API: Admin panel call detected, using service role')
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
    const { hasAccess, ticket, error: accessError } = await validateUserAccess(ticketKey, user?.id, isAdminCall)
    if (!hasAccess) {
      return NextResponse.json({ error: accessError }, { status: 403 })
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Get additional ticket data
    const enhancedTicket = {
      ...ticket,
      // Get comments count
      comments_count: await supabase
        .from('ticket_comments')
        .select('id', { count: 'exact' })
        .eq('ticket_id', ticket.id),
      
      // Get attachments count
      attachments_count: await supabase
        .from('ticket_attachments')
        .select('id', { count: 'exact' })
        .eq('ticket_id', ticket.id),
      
      // Get assigned admin info
      assigned_admin: ticket.assigned_to_admin_id ? await supabase
        .from('user_profiles')
        .select('id, username, full_name')
        .eq('id', ticket.assigned_to_admin_id)
        .single() : null
    }

    return NextResponse.json({
      success: true,
      ticket: enhancedTicket
    })

  } catch (error: any) {
    console.error('GET /api/tickets/by-key/[ticketKey] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/tickets/by-key/[ticketKey] - Update ticket by key
export async function PUT(
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
      console.log('🎫 Ticket UPDATE by key API: Admin panel call detected, using service role')
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

    const updateData = await request.json()

    // Track status changes for timeline
    const statusChanged = updateData.status && updateData.status !== ticket.status

    // Prepare update data
    const allowedFields = [
      'title', 'description', 'status', 'priority', 'severity',
      'steps_to_reproduce', 'expected_behavior', 'actual_behavior',
      'reproduction_rate', 'resolution', 'internal_notes',
      'estimated_effort_hours', 'actual_effort_hours'
    ]

    // Only admins can update certain fields
    const adminOnlyFields = ['assigned_to_admin_id', 'internal_notes', 'estimated_effort_hours', 'actual_effort_hours']
    
    const filteredUpdateData: any = {}
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        if (adminOnlyFields.includes(key) && !isAdmin) {
          // Skip admin-only fields for non-admin users
          return
        }
        filteredUpdateData[key] = updateData[key]
      }
    })

    // Always update the updated_at timestamp
    filteredUpdateData.updated_at = new Date().toISOString()

    // Set resolved_at if status changed to resolved
    if (statusChanged && updateData.status === 'resolved') {
      filteredUpdateData.resolved_at = new Date().toISOString()
    }

    // Set closed_at if status changed to closed
    if (statusChanged && updateData.status === 'closed') {
      filteredUpdateData.closed_at = new Date().toISOString()
    }

    console.log('Updating ticket:', { ticketKey, updateData: filteredUpdateData })

    // Update the ticket
    const { data: updatedTicket, error: updateError } = await supabase
      .from('support_tickets')
      .update(filteredUpdateData)
      .eq('ticket_key', ticketKey)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update ticket', 
        details: updateError.message 
      }, { status: 500 })
    }

    // Add status change to timeline if status changed
    if (statusChanged) {
      await supabase
        .from('ticket_status_history')
        .insert([{
          ticket_id: ticket.id,
          old_status: ticket.status,
          new_status: updateData.status,
          changed_by: user?.id || 'admin-user',
          change_reason: 'Status updated via admin panel',
          created_at: new Date().toISOString()
        }])
    }

    console.log('✅ Ticket updated successfully:', ticketKey)

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Ticket updated successfully'
    })

  } catch (error: any) {
    console.error('PUT /api/tickets/by-key/[ticketKey] error:', error)
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
