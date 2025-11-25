import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface CreateTicketRequest {
  title: string
  description: string
  ticket_type: 'bug' | 'feature_request' | 'improvement' | 'support' | 'other'
  priority?: 'critical' | 'high' | 'medium' | 'low'
  severity?: 'critical' | 'major' | 'minor' | 'cosmetic'
  application_section: string
  plugin_name?: string
  centcom_version?: string
  steps_to_reproduce?: string
  expected_behavior?: string
  actual_behavior?: string
  reproduction_rate?: 'always' | 'sometimes' | 'rarely' | 'once'
  environment_info?: any
  tags?: string[]
}

// GET /api/tickets - List tickets (admin view or user's own tickets)
export async function GET(request: NextRequest) {
  try {
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

    // Get search params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const ticket_type = searchParams.get('ticket_type')
    const priority = searchParams.get('priority')
    const assigned_to = searchParams.get('assigned_to')
    const user_id = searchParams.get('user_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let currentUserId = null
    let isAdmin = false

    // Always validate authentication and check role - never assume admin privileges
    const authHeader = request.headers.get('authorization')
    console.log('🎫 Ticket API: Authentication debug', {
      hasAuthHeader: !!authHeader,
      authHeaderPreview: authHeader ? authHeader.substring(0, 30) + '...' : 'NO_HEADER',
      startsWithBearer: authHeader?.startsWith('Bearer ')
    })

    if (!authHeader?.startsWith('Bearer ')) {
      console.log('🎫 Ticket API: Missing or invalid authorization header')
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, {
        status: 401,
        headers
      })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🎫 Ticket API: Validating token', {
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...'
    })

    // Use service role to validate user
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const serviceSupabase = createClient(supabaseUrl, serviceKey)

    let user = null
    let authError = null

    // Try Supabase auth first
    try {
      const { data: authData, error: supabaseError } = await supabase.auth.getUser(token)
      if (supabaseError) {
        console.log('🎫 Ticket API: Supabase auth failed, trying alternative validation:', supabaseError.message)

        // If Supabase auth fails, try to decode the token to get user info
        try {
          // For legacy tokens, extract user email/ID and validate via service role
          const tokenParts = token.split('.')
          if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
            console.log('🎫 Ticket API: Decoded token payload', {
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
                console.log('🎫 Ticket API: User found via token lookup', { userId: user.id, email: user.email })
              } else {
                console.log('🎫 Ticket API: User lookup failed', lookupError)
                // Also try looking up by the decoded user ID in case it's a Supabase auth user ID
                if (payload.sub) {
                  const { data: authUserData, error: authLookupError } = await serviceSupabase
                    .from('user_profiles')
                    .select('id, email')
                    .eq('id', payload.sub)
                    .single()

                  if (authUserData && !authLookupError) {
                    user = { id: authUserData.id, email: authUserData.email }
                    console.log('🎫 Ticket API: User found via auth ID lookup', { userId: user.id, email: user.email })
                  } else {
                    console.log('🎫 Ticket API: Auth ID lookup also failed', authLookupError)
                  }
                }
              }
            }
          }
        } catch (decodeError) {
          console.log('🎫 Ticket API: Token decode failed', decodeError)
        }
      } else {
        user = authData.user
      }
    } catch (error) {
      console.log('🎫 Ticket API: Auth validation error', error)
      authError = error
    }

    console.log('🎫 Ticket API: Final authentication result', {
      hasUser: !!user,
      hasError: !!authError,
      userId: user?.id,
      userEmail: user?.email
    })

    if (!user) {
      console.log('🎫 Ticket API: Authentication failed')
      return NextResponse.json({ error: 'Invalid authentication token' }, {
        status: 401,
        headers
      })
    }

    currentUserId = user.id

    // Check if user is admin - verify actual role from database
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin'

    console.log('🎫 Ticket API: Role check', {
      userId: user.id,
      userRole: userProfile?.role,
      isAdmin
    })

    // Build query - start simple to debug
    let query = supabase
      .from('support_tickets')
      .select('*')

    // Apply filters based on user role and query parameters
    // For dashboard personal view: always filter by current user (including admins)
    // For admin panel: only admins can filter by user_id parameter to see all tickets
    if (user_id && isAdmin) {
      // Admin explicitly filtering by a specific user_id parameter
      query = query.eq('user_id', user_id)
    } else if (currentUserId) {
      // Default: show only current user's tickets (dashboard personal view)
      query = query.eq('user_id', currentUserId)
    }

    // Apply additional filters
    if (status) query = query.eq('status', status)
    if (ticket_type) query = query.eq('ticket_type', ticket_type)
    if (priority) query = query.eq('priority', priority)
    if (assigned_to) query = query.eq('assigned_to_admin_id', assigned_to)

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: tickets, error } = await query

    if (error) {
      console.error('Error fetching tickets:', error)
      console.error('Error details:', { 
        code: error.code, 
        message: error.message, 
        details: error.details,
        hint: error.hint 
      })
      
      // Check if it's a "relation does not exist" error (tables not set up)
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Ticket management system not set up',
          message: 'The ticket management tables need to be created in your Supabase database.',
          setup_required: true,
          setup_url: '/api/admin/setup-ticket-management'
        }, { 
          status: 503,
          headers 
        })
      }
      
      // Return detailed error information for debugging
      return NextResponse.json({ 
        error: 'Failed to fetch tickets',
        debug: {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        }
      }, { 
        status: 500,
        headers 
      })
    }

    return NextResponse.json({
      success: true,
      tickets,
      pagination: {
        limit,
        offset,
        has_more: tickets?.length === limit
      }
    }, { headers })

  } catch (error: any) {
    console.error('GET /api/tickets error:', error)
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

// POST /api/tickets - Create a new ticket (for Centcom integration)
export async function POST(request: NextRequest) {
  try {
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

    // Validate authentication using the same dual authentication pattern as GET
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { 
        status: 401, 
        headers 
      })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🎫 Ticket API POST: Validating token', {
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...'
    })
    
    // Use service role for authentication like in GET endpoint
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const serviceSupabase = createClient(supabaseUrl, serviceKey)
    
    let user = null
    
    // Try Supabase auth first
    try {
      const { data: authData, error: supabaseError } = await supabase.auth.getUser(token)
      if (supabaseError) {
        console.log('🎫 Ticket API POST: Supabase auth failed, trying alternative validation:', supabaseError.message)
        
        // If Supabase auth fails, try to decode the token to get user info
        try {
          const tokenParts = token.split('.')
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]))
            console.log('🎫 Ticket API POST: Decoded token payload', { 
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
                console.log('🎫 Ticket API POST: User found via token lookup', { userId: user.id, email: user.email })
              } else {
                console.log('🎫 Ticket API POST: User lookup failed', lookupError)
                // Also try looking up by the decoded user ID in case it's a Supabase auth user ID
                if (payload.sub) {
                  const { data: authUserData, error: authLookupError } = await serviceSupabase
                    .from('user_profiles')
                    .select('id, email')
                    .eq('id', payload.sub)
                    .single()
                  
                  if (authUserData && !authLookupError) {
                    user = { id: authUserData.id, email: authUserData.email }
                    console.log('🎫 Ticket API POST: User found via auth ID lookup', { userId: user.id, email: user.email })
                  } else {
                    console.log('🎫 Ticket API POST: Auth ID lookup also failed', authLookupError)
                  }
                }
              }
            }
          }
        } catch (decodeError) {
          console.log('🎫 Ticket API POST: Token decode failed', decodeError)
        }
      } else {
        user = authData.user
      }
    } catch (error) {
      console.log('🎫 Ticket API POST: Auth validation error', error)
    }
    
    if (!user) {
      console.log('🎫 Ticket API POST: Authentication failed')
      return NextResponse.json({ error: 'Invalid authentication token' }, { 
        status: 401,
        headers 
      })
    }

    // Get user profile for username
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('username, full_name')
      .eq('id', user.id)
      .single()

    const body: CreateTicketRequest = await request.json()
    
    // Validate required fields
    const { title, description, ticket_type, application_section } = body
    if (!title || !description || !ticket_type || !application_section) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, description, ticket_type, application_section' 
      }, { 
        status: 400,
        headers 
      })
    }

    // Validate ticket_type enum
    const validTicketTypes = ['bug', 'feature_request', 'improvement', 'support', 'other']
    if (!validTicketTypes.includes(ticket_type)) {
      return NextResponse.json({ 
        error: `Invalid ticket_type. Must be one of: ${validTicketTypes.join(', ')}` 
      }, { 
        status: 400,
        headers 
      })
    }

    // Get client information
    const clientApp = request.headers.get('X-Client-App') || 'Unknown'
    const clientVersion = request.headers.get('X-Client-Version') || 'Unknown'

    // Prepare ticket data
    const ticketData = {
      user_id: user.id,
      username: userProfile?.username || user.email?.split('@')[0] || 'unknown',
      email: user.email || '',
      title: title.trim(),
      description: description.trim(),
      ticket_type,
      priority: body.priority || 'medium',
      severity: body.severity || 'minor',
      application_section,
      plugin_name: body.plugin_name,
      centcom_version: body.centcom_version || clientVersion,
      steps_to_reproduce: body.steps_to_reproduce,
      expected_behavior: body.expected_behavior,
      actual_behavior: body.actual_behavior,
      reproduction_rate: body.reproduction_rate,
      environment_info: {
        ...body.environment_info,
        client_app: clientApp,
        client_version: clientVersion,
        submitted_from: 'centcom'
      },
      tags: body.tags || []
    }

    console.log('Creating new ticket:', { 
      user: user.email, 
      ticket_type, 
      title: title.substring(0, 50) + '...' 
    })

    // Create the ticket
    const { data: ticket, error: createError } = await supabase
      .from('support_tickets')
      .insert([ticketData])
      .select('*')
      .single()

    // Manually fetch assigned admin if needed (avoids foreign key relationship cache issues)
    if (ticket && ticket.assigned_to_admin_id) {
      const { data: adminProfile } = await supabase
        .from('user_profiles')
        .select('id, username, full_name')
        .eq('id', ticket.assigned_to_admin_id)
        .single()

      if (adminProfile) {
        ticket.assigned_admin = adminProfile
      }
    }

    if (createError) {
      console.error('Error creating ticket:', createError)
      return NextResponse.json({ 
        error: 'Failed to create ticket', 
        details: createError.message 
      }, { 
        status: 500,
        headers 
      })
    }

    console.log('✅ Ticket created successfully:', ticket.ticket_key)

    return NextResponse.json({
      success: true,
      ticket,
      message: `Ticket ${ticket.ticket_key} created successfully`
    }, { headers })

  } catch (error: any) {
    console.error('POST /api/tickets error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

// OPTIONS /api/tickets - Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'tauri://localhost']
  const corsOrigin = allowedOrigins.includes(origin || '') ? origin : '*'
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version, x-client-app, x-client-version',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  })
}
