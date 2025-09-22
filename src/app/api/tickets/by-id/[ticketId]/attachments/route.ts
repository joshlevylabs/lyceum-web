import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Helper functions
function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('text')) return 'text'
  if (mimeType.includes('zip') || mimeType.includes('archive')) return 'archive'
  return 'document'
}

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

async function authenticateRequest(request: NextRequest) {
  // Check if this is an admin panel call or Centcom API call
  const referer = request.headers.get('referer') || ''
  const origin = request.headers.get('origin') || ''
  const isAdminCall = referer.includes('/admin/') || origin.includes('localhost:3594')

  // Set up CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  }

  let user = null

  if (isAdminCall) {
    // For admin panel calls, we assume admin privileges
    console.log('🎫 Attachments API: Admin panel call detected, using service role')
    user = { id: undefined, email: 'admin@lyceum.io' }
  } else {
    // For Centcom API calls, validate the authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { 
        user: null, 
        error: 'Missing or invalid authorization header', 
        headers,
        isAdminCall: false
      }
    }

    const token = authHeader.replace('Bearer ', '')
    
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !authUser) {
        return { 
          user: null, 
          error: 'Invalid authentication token', 
          headers,
          isAdminCall: false
        }
      }
      
      user = authUser
    } catch (error) {
      console.error('🎫 Attachments API: Authentication error:', error)
      return { 
        user: null, 
        error: 'Authentication failed', 
        headers,
        isAdminCall: false
      }
    }
  }

  return { user, error: null, headers, isAdminCall }
}

async function validateTicketAccess(ticketId: string, userId?: string, isAdminCall: boolean = false) {
  // For admin panel calls, assume admin privileges
  if (isAdminCall) {
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (error || !ticket) {
      return { hasAccess: false, isAdmin: true, error: 'Ticket not found' }
    }

    return { hasAccess: true, isAdmin: true, error: null }
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
    .eq('id', ticketId)
    .single()

  if (error || !ticket) {
    return { hasAccess: false, isAdmin, error: 'Ticket not found' }
  }

  // Admin can access all tickets, users can only access their own
  const hasAccess = isAdmin || !userId || ticket.user_id === userId
  return { hasAccess, isAdmin, error: hasAccess ? null : 'Access denied' }
}

// GET /api/tickets/by-id/[ticketId]/attachments - Get attachments for a ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params
    const { user, error: authError, headers, isAdminCall } = await authenticateRequest(request)

    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401, headers })
    }

    // Check access
    const { hasAccess, isAdmin, error: accessError } = await validateTicketAccess(ticketId, user?.id, isAdminCall)
    if (!hasAccess) {
      return NextResponse.json({ error: accessError }, { status: 403, headers })
    }

    // Get attachments for this ticket (only ticket-level attachments, not comment attachments)
    let query = supabase
      .from('ticket_attachments')
      .select(`
        id,
        filename,
        original_filename,
        file_size,
        mime_type,
        file_extension,
        storage_path,
        attachment_type,
        description,
        uploaded_at,
        is_public,
        scan_status,
        comment_id,
        uploaded_by
      `)
      .eq('ticket_id', ticketId)
      .is('comment_id', null) // Only get ticket-level attachments, not comment attachments
      .order('uploaded_at', { ascending: false })

    const { data: attachments, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching attachments:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch attachments',
        details: fetchError.message 
      }, { status: 500, headers })
    }

    // Process attachments to add computed fields
    const processedAttachments = (attachments || []).map(attachment => {
      // Generate proper Supabase storage public URL
      const { data: urlData } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(attachment.storage_path)
      
      return {
        ...attachment,
        file_category: getFileCategory(attachment.mime_type),
        size_formatted: formatFileSize(attachment.file_size),
        public_url: urlData.publicUrl,
        can_download: isAdmin || attachment.is_public || attachment.uploaded_by === user?.id
      }
    })

    return NextResponse.json({
      success: true,
      attachments: processedAttachments,
      count: processedAttachments.length
    }, { headers })

  } catch (error: any) {
    console.error('GET /api/tickets/by-id/[ticketId]/attachments error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version'
    }})
  }
}

// DELETE /api/tickets/by-id/[ticketId]/attachments - Delete attachment from a ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params
    const { user, error: authError, headers, isAdminCall } = await authenticateRequest(request)

    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401, headers })
    }

    // Check access
    const { hasAccess, isAdmin, error: accessError } = await validateTicketAccess(ticketId, user?.id, isAdminCall)
    if (!hasAccess) {
      return NextResponse.json({ error: accessError }, { status: 403, headers })
    }

    // Get attachment ID from request body
    const body = await request.json()
    const { attachmentId } = body

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400, headers })
    }

    // Get attachment details first to verify ownership and get storage path
    const { data: attachment, error: fetchError } = await supabase
      .from('ticket_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('ticket_id', ticketId)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404, headers })
    }

    // Check if user has permission to delete this attachment
    // Admins can delete any attachment, users can only delete their own
    if (!isAdmin && attachment.uploaded_by !== user?.id) {
      return NextResponse.json({ error: 'You can only delete your own attachments' }, { status: 403, headers })
    }

    // Delete from storage first
    const { error: storageError } = await supabase.storage
      .from('ticket-attachments')
      .remove([attachment.storage_path])

    if (storageError) {
      console.error('Failed to delete from storage:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('ticket_attachments')
      .delete()
      .eq('id', attachmentId)
      .eq('ticket_id', ticketId)

    if (dbError) {
      console.error('Failed to delete from database:', dbError)
      return NextResponse.json({ 
        error: 'Failed to delete attachment from database',
        details: dbError.message 
      }, { status: 500, headers })
    }

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted successfully'
    }, { headers })

  } catch (error: any) {
    console.error('DELETE /api/tickets/by-id/[ticketId]/attachments error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version'
    }})
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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  })
}
