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
    return { hasAccess: false, isAdmin, ticket: null, error: 'Admin access required' }
  }

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

// GET /api/tickets/by-id/[ticketId] - Get ticket details by UUID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params

    // Check if this is an admin panel call or Centcom API call
    const referer = request.headers.get('referer') || ''
    const origin = request.headers.get('origin') || ''
    const isAdminCall = referer.includes('/admin/') || origin.includes('localhost:3594')

    let user = null

    if (isAdminCall) {
      // For admin panel calls, we assume admin privileges
      console.log('🎫 Ticket by ID API: Admin panel call detected, using service role')
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
    const { hasAccess, ticket, error: accessError } = await validateUserAccess(ticketId, user?.id, isAdminCall)
    if (!hasAccess) {
      return NextResponse.json({ error: accessError }, { status: 403 })
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      ticket
    })

  } catch (error: any) {
    console.error('GET /api/tickets/by-id/[ticketId] error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// PUT /api/tickets/by-id/[ticketId] - Update ticket by UUID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params

    // Check if this is an admin panel call or Centcom API call
    const referer = request.headers.get('referer') || ''
    const origin = request.headers.get('origin') || ''
    const isAdminCall = referer.includes('/admin/') || origin.includes('localhost:3594')

    let user = null

    if (isAdminCall) {
      // For admin panel calls, we assume admin privileges
      console.log('🎫 Ticket by ID API: Admin panel call detected, using service role')
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

    // Check access (require admin for updates)
    const { hasAccess, isAdmin, ticket, error: accessError } = await validateUserAccess(ticketId, user?.id, true)
    if (!hasAccess || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const body: UpdateTicketRequest = await request.json()

    // Update the ticket
    const { data: updatedTicket, error: updateError } = await supabase
      .from('support_tickets')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update ticket',
        details: updateError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Ticket updated successfully'
    })

  } catch (error: any) {
    console.error('PUT /api/tickets/by-id/[ticketId] error:', error)
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
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version, x-client-app, x-client-version',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  })
}
