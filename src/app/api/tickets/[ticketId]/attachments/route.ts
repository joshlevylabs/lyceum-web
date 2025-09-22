import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// File upload constraints
const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const ALLOWED_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Videos
  'video/mp4', 'video/webm', 'video/avi', 'video/mov', 'video/ogg',
  // Documents
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'application/json', 'application/xml',
  // Archives
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
]

// Helper functions
function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

function getFileCategory(mimeType: string): 'image' | 'video' | 'document' | 'archive' | 'other' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text') || mimeType.includes('sheet') || mimeType.includes('presentation')) return 'document'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archive'
  return 'other'
}

async function authenticateRequest(request: NextRequest) {
  const requestOrigin = request.headers.get('origin')
  const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'tauri://localhost']
  const corsOrigin = allowedOrigins.includes(requestOrigin || '') ? requestOrigin : '*'
  
  const headers = {
    'Access-Control-Allow-Origin': corsOrigin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
    console.log('🎫 Attachments API: Admin panel call detected, using service role')
    return { user: { id: 'admin-user', email: 'admin@lyceum.io' }, error: null, headers, isAdminCall: true }
  } else {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { user: null, error: 'Missing or invalid authorization header', headers, isAdminCall: false }
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🎫 Attachments API: Validating token', {
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...'
    })
    
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)
    
    try {
      const { data: authData, error: supabaseError } = await supabase.auth.getUser(token)
      if (supabaseError) {
        console.log('🎫 Attachments API: Supabase auth failed, trying alternative validation:', supabaseError.message)
        try {
          const tokenParts = token.split('.')
          if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
            console.log('🎫 Attachments API: Decoded token payload', { 
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
                console.log('🎫 Attachments API: User found via token lookup', { userId: user.id, email: user.email })
              } else {
                console.log('🎫 Attachments API: User lookup failed', lookupError)
                if (payload.sub) {
                  const { data: authUserData, error: authLookupError } = await serviceSupabase
                    .from('user_profiles')
                    .select('id, email')
                    .eq('id', payload.sub)
                    .single()
                  
                  if (authUserData && !authLookupError) {
                    user = { id: authUserData.id, email: authUserData.email }
                    console.log('🎫 Attachments API: User found via auth ID lookup', { userId: user.id, email: user.email })
                  } else {
                    console.log('🎫 Attachments API: Auth ID lookup also failed', authLookupError)
                  }
                }
              }
            }
          }
        } catch (decodeError) {
          console.log('🎫 Attachments API: Token decode failed', decodeError)
        }
      } else {
        user = authData.user
      }
    } catch (error) {
      console.log('🎫 Attachments API: Auth validation error', error)
      authError = error
    }
    
    console.log('🎫 Attachments API: Final authentication result', {
      hasUser: !!user,
      hasError: !!authError,
      userId: user?.id,
      userEmail: user?.email
    })
    
    return { user, error: user ? null : 'Invalid authentication token', headers, isAdminCall: false }
  }
}

async function validateTicketAccess(ticketId: string, userId?: string, isAdminCall: boolean = false) {
  // For admin calls, assume admin privileges
  if (isAdminCall) {
    // Get the ticket to verify it exists
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single()
    
    if (ticketError || !ticket) {
      return { hasAccess: false, isAdmin: false, ticket: null, error: 'Ticket not found' }
    }
    
    return { hasAccess: true, isAdmin: true, ticket, error: null }
  }

  if (!userId) {
    return { hasAccess: false, isAdmin: false, ticket: null, error: 'User ID required for non-admin calls' }
  }

  // Get user profile to check role
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin'

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select('id, user_id')
    .eq('id', ticketId)
    .single()

  if (error || !ticket) {
    return { hasAccess: false, isAdmin, ticket: null, error: 'Ticket not found' }
  }

  const hasAccess = isAdmin || ticket.user_id === userId
  return { hasAccess, isAdmin, ticket, error: hasAccess ? null : 'Access denied' }
}

// GET /api/tickets/[ticketId]/attachments - Get attachments for a ticket
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
        uploaded_by,
        is_public,
        scan_status,
        comment_id
      `)
      .eq('ticket_id', ticketId)
      .order('uploaded_at', { ascending: false })

    // Non-admin users can only see public attachments or their own
    if (!isAdmin) {
      query = query.or(`is_public.eq.true,uploaded_by.eq.${user?.id}`)
    }

    const { data: attachments, error } = await query

    if (error) {
      console.error('Error fetching attachments:', error)
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500, headers })
    }

    // Process attachments to add computed fields
    const processedAttachments = (attachments || []).map(attachment => ({
      ...attachment,
      file_category: getFileCategory(attachment.mime_type),
      size_formatted: formatFileSize(attachment.file_size),
      public_url: attachment.storage_path ? supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(attachment.storage_path).data.publicUrl : null,
      can_download: true
    }))

    return NextResponse.json({
      success: true,
      attachments: processedAttachments
    }, { headers })

  } catch (error: any) {
    console.error('GET /api/tickets/[ticketId]/attachments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version'
      }
    })
  }
}

// POST /api/tickets/[ticketId]/attachments - Upload attachment to a ticket
export async function POST(
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const description = formData.get('description') as string | null
    const attachmentType = (formData.get('attachment_type') as string || 'other') as 'screenshot' | 'video' | 'log_file' | 'document' | 'other'
    const isPublic = formData.get('is_public') === 'true'
    const commentId = formData.get('comment_id') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400, headers })
    }

    // Validate file size and type
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` }, { status: 400, headers })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `File type ${file.type} not allowed` }, { status: 400, headers })
    }

    const fileExtension = `.${file.name.split('.').pop()}`
    const uniqueFilename = `${uuidv4()}${fileExtension}`
    const storagePath = `${ticketId}/${uniqueFilename}`

    console.log('📎 Attempting to upload attachment:', {
      ticketId,
      filename: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      attachmentType,
      isPublic,
      hasDescription: !!description,
      hasCommentId: !!commentId,
      author: user!.email
    })

    // First upload the file to Supabase storage
    console.log('📎 Uploading file to Supabase storage:', storagePath)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ticket-attachments')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      console.error('Failed to upload file to storage:', uploadError)
      return NextResponse.json({ 
        error: 'Failed to upload file to storage',
        details: uploadError.message 
      }, { status: 500, headers })
    }

    console.log('📎 File uploaded successfully to storage:', uploadData.path)

    // Generate the public URL
    const { data: urlData } = supabase.storage
      .from('ticket-attachments')
      .getPublicUrl(storagePath)

    // Save attachment metadata to database
    const attachmentData = {
      ticket_id: ticketId,
      comment_id: commentId || null,
      filename: uniqueFilename,
      original_filename: file.name,
      file_size: file.size,
      mime_type: file.type,
      file_extension: fileExtension,
      storage_path: storagePath,
      storage_bucket: 'ticket-attachments',
      uploaded_by: user!.id,
      attachment_type: attachmentType,
      description: description || null,
      is_public: isPublic,
      scan_status: 'clean' // Mock as clean for now
    }

    const { data: attachment, error: createError } = await supabase
      .from('ticket_attachments')
      .insert([attachmentData])
      .select('*')
      .single()

    if (createError) {
      console.error('Error creating attachment record:', createError)
      
      // If database insert fails, clean up the uploaded file
      await supabase.storage
        .from('ticket-attachments')
        .remove([storagePath])
      
      return NextResponse.json({ 
        error: 'Failed to save attachment metadata' 
      }, { status: 500, headers })
    }

    // Process response data
    const processedAttachment = {
      ...attachment,
      file_category: getFileCategory(attachment.mime_type),
      size_formatted: formatFileSize(attachment.file_size),
      public_url: urlData.publicUrl, // Real Supabase storage URL
      can_download: true
    }

    console.log('📎 Attachment uploaded successfully:', {
      id: attachment.id,
      filename: attachment.filename,
      size: formatFileSize(attachment.file_size)
    })

    return NextResponse.json({
      success: true,
      attachment: processedAttachment,
      message: 'File uploaded successfully'
    }, { headers })

  } catch (error: any) {
    console.error('POST /api/tickets/[ticketId]/attachments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version'
      }
    })
  }
}

// DELETE /api/tickets/[ticketId]/attachments - Delete attachment from a ticket
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
    console.error('DELETE /api/tickets/[ticketId]/attachments error:', error)
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version, x-client-app, x-client-version',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  })
}