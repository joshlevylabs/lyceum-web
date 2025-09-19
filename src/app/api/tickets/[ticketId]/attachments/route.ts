import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// File upload configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads', 'tickets')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'text/plain',
  'text/csv',
  'application/json',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed'
]

interface CreateAttachmentRequest {
  description?: string
  attachment_type: 'screenshot' | 'video' | 'log_file' | 'document' | 'other'
  is_public?: boolean
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

function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
}

function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = getFileExtension(originalFilename)
  return `${timestamp}_${random}.${extension}`
}

async function scanFile(filePath: string): Promise<'clean' | 'suspicious' | 'blocked'> {
  // Placeholder for virus scanning
  // In production, integrate with ClamAV, VirusTotal, or similar service
  try {
    // Basic file validation - check for executable extensions
    const suspiciousExtensions = ['exe', 'bat', 'com', 'cmd', 'scr', 'pif', 'vbs', 'js']
    const extension = getFileExtension(filePath)
    
    if (suspiciousExtensions.includes(extension)) {
      return 'blocked'
    }
    
    // TODO: Add actual virus scanning here
    return 'clean'
  } catch {
    return 'suspicious'
  }
}

// GET /api/tickets/[ticketId]/attachments - Get attachments for a ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params

    // Validate authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    // Check access
    const { hasAccess, isAdmin, error: accessError } = await validateTicketAccess(ticketId, user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: accessError }, { status: 403 })
    }

    // Get attachments
    let query = supabase
      .from('ticket_attachments')
      .select(`
        id,
        filename,
        original_filename,
        file_size,
        mime_type,
        attachment_type,
        description,
        uploaded_at,
        is_public,
        scan_status,
        uploader:user_profiles!uploaded_by(id, username, full_name)
      `)
      .eq('ticket_id', ticketId)
      .order('uploaded_at', { ascending: false })

    // Non-admin users can only see public attachments or their own uploads
    if (!isAdmin) {
      query = query.or(`is_public.eq.true,uploaded_by.eq.${user.id}`)
    }

    const { data: attachments, error } = await query

    if (error) {
      console.error('Error fetching attachments:', error)
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      attachments: attachments || []
    })

  } catch (error: any) {
    console.error('GET /api/tickets/[ticketId]/attachments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/tickets/[ticketId]/attachments - Upload attachment
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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version, x-client-app, x-client-version',
      'Access-Control-Allow-Credentials': 'true'
    }

    // Validate authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { 
        status: 401,
        headers 
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { 
        status: 401,
        headers 
      })
    }

    // Check access
    const { hasAccess, ticket, error: accessError } = await validateTicketAccess(ticketId, user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: accessError }, { 
        status: 403,
        headers 
      })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const description = formData.get('description') as string || ''
    const attachment_type = formData.get('attachment_type') as string || 'other'
    const is_public = formData.get('is_public') === 'true'

    if (!file) {
      return NextResponse.json({ 
        error: 'No file provided' 
      }, { 
        status: 400,
        headers 
      })
    }

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { 
        status: 400,
        headers 
      })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: `File type not allowed. Allowed types: ${ALLOWED_TYPES.join(', ')}` 
      }, { 
        status: 400,
        headers 
      })
    }

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(file.name)
    const storagePath = join('tickets', ticketId, uniqueFilename)
    const fullPath = join(UPLOAD_DIR, ticketId)

    // Ensure upload directory exists
    if (!existsSync(fullPath)) {
      await mkdir(fullPath, { recursive: true })
    }

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = join(fullPath, uniqueFilename)
    await writeFile(filePath, buffer)

    console.log('File uploaded:', { 
      ticketId, 
      filename: uniqueFilename, 
      originalName: file.name,
      size: file.size,
      type: file.type 
    })

    // Scan file for security
    const scanStatus = await scanFile(filePath)

    if (scanStatus === 'blocked') {
      // Delete the file if it's blocked
      try {
        await import('fs/promises').then(fs => fs.unlink(filePath))
      } catch {}
      
      return NextResponse.json({ 
        error: 'File blocked by security scan' 
      }, { 
        status: 400,
        headers 
      })
    }

    // Get user profile info
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('username, full_name')
      .eq('id', user.id)
      .single()

    // Create attachment record
    const attachmentData = {
      ticket_id: ticketId,
      filename: uniqueFilename,
      original_filename: file.name,
      file_size: file.size,
      mime_type: file.type,
      file_extension: getFileExtension(file.name),
      storage_path: storagePath,
      storage_bucket: 'local-uploads',
      uploaded_by: user.id,
      attachment_type: attachment_type as any,
      description: description || null,
      scan_status: scanStatus,
      is_public: is_public
    }

    const { data: attachment, error: createError } = await supabase
      .from('ticket_attachments')
      .insert([attachmentData])
      .select(`
        *,
        uploader:user_profiles!uploaded_by(id, username, full_name)
      `)
      .single()

    if (createError) {
      console.error('Error creating attachment record:', createError)
      
      // Clean up uploaded file
      try {
        await import('fs/promises').then(fs => fs.unlink(filePath))
      } catch {}
      
      return NextResponse.json({ 
        error: 'Failed to create attachment record', 
        details: createError.message 
      }, { 
        status: 500,
        headers 
      })
    }

    console.log('✅ Attachment created successfully on ticket:', ticket?.ticket_key)

    return NextResponse.json({
      success: true,
      attachment,
      message: 'File uploaded successfully'
    }, { headers })

  } catch (error: any) {
    console.error('POST /api/tickets/[ticketId]/attachments error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// DELETE /api/tickets/[ticketId]/attachments/[attachmentId] would go in a separate file
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
