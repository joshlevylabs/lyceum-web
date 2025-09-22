import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Allowed file types and max sizes
const ALLOWED_TYPES = {
  // Images
  'image/jpeg': { ext: 'jpg', maxSize: 500 * 1024 * 1024, category: 'image' }, // 500MB
  'image/jpg': { ext: 'jpg', maxSize: 500 * 1024 * 1024, category: 'image' },
  'image/png': { ext: 'png', maxSize: 500 * 1024 * 1024, category: 'image' },
  'image/gif': { ext: 'gif', maxSize: 500 * 1024 * 1024, category: 'image' },
  'image/webp': { ext: 'webp', maxSize: 500 * 1024 * 1024, category: 'image' },
  'image/svg+xml': { ext: 'svg', maxSize: 500 * 1024 * 1024, category: 'image' }, // 500MB
  
  // Videos
  'video/mp4': { ext: 'mp4', maxSize: 500 * 1024 * 1024, category: 'video' }, // 500MB
  'video/webm': { ext: 'webm', maxSize: 500 * 1024 * 1024, category: 'video' },
  'video/ogg': { ext: 'ogg', maxSize: 500 * 1024 * 1024, category: 'video' },
  'video/avi': { ext: 'avi', maxSize: 500 * 1024 * 1024, category: 'video' },
  'video/mov': { ext: 'mov', maxSize: 500 * 1024 * 1024, category: 'video' },
  'video/quicktime': { ext: 'mov', maxSize: 500 * 1024 * 1024, category: 'video' },
  
  // Documents
  'application/pdf': { ext: 'pdf', maxSize: 500 * 1024 * 1024, category: 'document' }, // 500MB
  'application/msword': { ext: 'doc', maxSize: 500 * 1024 * 1024, category: 'document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', maxSize: 500 * 1024 * 1024, category: 'document' },
  'application/vnd.ms-excel': { ext: 'xls', maxSize: 500 * 1024 * 1024, category: 'document' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'xlsx', maxSize: 500 * 1024 * 1024, category: 'document' },
  'application/vnd.ms-powerpoint': { ext: 'ppt', maxSize: 500 * 1024 * 1024, category: 'document' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: 'pptx', maxSize: 500 * 1024 * 1024, category: 'document' },
  'text/plain': { ext: 'txt', maxSize: 500 * 1024 * 1024, category: 'document' }, // 500MB
  'text/csv': { ext: 'csv', maxSize: 500 * 1024 * 1024, category: 'document' },
  'application/json': { ext: 'json', maxSize: 500 * 1024 * 1024, category: 'document' },
  'application/xml': { ext: 'xml', maxSize: 500 * 1024 * 1024, category: 'document' },
  
  // Archives
  'application/zip': { ext: 'zip', maxSize: 500 * 1024 * 1024, category: 'archive' }, // 500MB
  'application/x-rar-compressed': { ext: 'rar', maxSize: 500 * 1024 * 1024, category: 'archive' },
  'application/x-7z-compressed': { ext: '7z', maxSize: 500 * 1024 * 1024, category: 'archive' },
}

async function validateUserAccess(userId?: string, isAdminCall: boolean = false) {
  if (isAdminCall) {
    return { hasAccess: true, isAdmin: true, error: null }
  }

  if (!userId) {
    return { hasAccess: false, isAdmin: false, error: 'User ID required' }
  }

  // Get user profile to check role
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin'
  return { hasAccess: true, isAdmin, error: null }
}

// POST /api/tickets/attachments/upload - Upload file for ticket
export async function POST(request: NextRequest) {
  try {
    // Handle CORS
    const origin = request.headers.get('origin')
    const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'tauri://localhost']
    const corsOrigin = allowedOrigins.includes(origin || '') ? origin : '*'
    
    const headers = {
      'Access-Control-Allow-Origin': corsOrigin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version',
      'Access-Control-Allow-Credentials': 'true'
    }

    // Check if this is an admin panel call or Centcom API call
    const referer = request.headers.get('referer') || ''
    const requestOrigin = request.headers.get('origin') || ''
    const isAdminCall = referer.includes('/admin/') || requestOrigin.includes('localhost:3594')

    let user = null

    if (isAdminCall) {
      console.log('📎 Upload API: Admin panel call detected')
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
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !authUser) {
        return NextResponse.json({ error: 'Invalid authentication token' }, { 
          status: 401,
          headers 
        })
      }
      
      user = authUser
    }

    // Validate user access
    const { hasAccess, isAdmin, error: accessError } = await validateUserAccess(user?.id, isAdminCall)
    if (!hasAccess) {
      return NextResponse.json({ error: accessError }, { 
        status: 403,
        headers 
      })
    }

    // Parse the multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const ticketId = formData.get('ticketId') as string
    const commentId = formData.get('commentId') as string | null
    const description = formData.get('description') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { 
        status: 400,
        headers 
      })
    }

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { 
        status: 400,
        headers 
      })
    }

    // Validate file type and size
    const fileType = ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES]
    if (!fileType) {
      return NextResponse.json({ 
        error: `File type ${file.type} is not allowed`,
        allowedTypes: Object.keys(ALLOWED_TYPES)
      }, { 
        status: 400,
        headers 
      })
    }

    if (file.size > fileType.maxSize) {
      return NextResponse.json({ 
        error: `File size ${file.size} exceeds maximum allowed size of ${fileType.maxSize} bytes`,
        maxSize: fileType.maxSize
      }, { 
        status: 400,
        headers 
      })
    }

    // Verify ticket exists and user has access
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('id, user_id, ticket_key')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { 
        status: 404,
        headers 
      })
    }

    // Check access to ticket
    if (!isAdmin && ticket.user_id !== user?.id) {
      return NextResponse.json({ error: 'Access denied to this ticket' }, { 
        status: 403,
        headers 
      })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileName = `${ticket.ticket_key}_${timestamp}_${randomString}.${fileType.ext}`
    const storagePath = `tickets/${ticketId}/${fileName}`

    console.log('📎 Uploading file:', {
      originalName: file.name,
      fileName,
      size: file.size,
      type: file.type,
      ticketId,
      commentId,
      userId: user?.id
    })

    // Convert File to ArrayBuffer for Supabase
    const fileBuffer = await file.arrayBuffer()

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ticket-attachments')
      .upload(storagePath, fileBuffer, {
        contentType: file.type
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      console.error('Storage upload error details:', {
        message: uploadError.message,
        name: uploadError.name,
        path: storagePath,
        bucket: 'ticket-attachments'
      })

      // Check if the error is due to bucket not existing
      if (uploadError.message?.includes('bucket') || uploadError.message?.includes('404')) {
        return NextResponse.json({ 
          error: 'Storage bucket not found',
          details: 'The ticket-attachments storage bucket does not exist. Please contact an administrator to set up storage.',
          setup_required: true,
          setup_url: '/api/admin/setup-storage',
          storage_error: uploadError.message
        }, { 
          status: 503, // Service Unavailable
          headers 
        })
      }

      return NextResponse.json({ 
        error: 'Failed to upload file to storage',
        details: uploadError.message,
        storage_error: uploadError.name || 'Unknown storage error'
      }, { 
        status: 500,
        headers 
      })
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('ticket-attachments')
      .getPublicUrl(storagePath)

    // Save attachment record to database
    const attachmentData = {
      ticket_id: ticketId,
      comment_id: commentId || null,
      filename: fileName,
      original_filename: file.name,
      file_size: file.size,
      mime_type: file.type,
      file_extension: fileType.ext,
      storage_path: storagePath,
      storage_bucket: 'ticket-attachments',
      uploaded_by: user?.id || null,
      attachment_type: fileType.category === 'image' ? 'screenshot' : 
                      fileType.category === 'video' ? 'video' :
                      fileType.category === 'document' ? 'document' : 'other',
      description: description || null,
      scan_status: 'clean', // In production, you'd want to scan files
      is_public: !commentId // Files attached to tickets are public, comment files may be internal
    }

    const { data: attachment, error: dbError } = await supabase
      .from('ticket_attachments')
      .insert([attachmentData])
      .select('*')
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      console.error('Attachment data being inserted:', attachmentData)
      console.error('Database error details:', {
        message: dbError.message,
        code: dbError.code,
        details: dbError.details,
        hint: dbError.hint
      })
      
      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from('ticket-attachments')
        .remove([storagePath])

      return NextResponse.json({ 
        error: 'Failed to save attachment record',
        details: dbError.message,
        database_error: {
          code: dbError.code,
          details: dbError.details,
          hint: dbError.hint
        },
        attachment_data: attachmentData
      }, { 
        status: 500,
        headers 
      })
    }

    console.log('✅ File uploaded successfully:', fileName)

    // Return success response with attachment data
    return NextResponse.json({
      success: true,
      attachment: {
        ...attachment,
        public_url: urlData.publicUrl,
        file_category: fileType.category
      },
      message: 'File uploaded successfully'
    }, { headers })

  } catch (error: any) {
    console.error('POST /api/tickets/attachments/upload error:', error)
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  })
}
