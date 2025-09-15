import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force explicit values to avoid environment variable loading issues
const supabaseUrl = 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET /api/admin/live-connection/lyceum/[userId] - Get live connection URL for Lyceum portal
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    const userId = params.userId

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Get user information
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate secure connection token
    const connectionToken = `admin_lyceum_${sessionId}_${userId}_${Date.now()}`

    // Store connection session in database for security
    const { error: sessionError } = await supabase
      .from('admin_connection_sessions')
      .insert([{
        session_token: connectionToken,
        admin_user_id: request.headers.get('user-id'), // Would come from auth context
        target_user_id: userId,
        connection_type: 'lyceum',
        onboarding_session_id: sessionId,
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
        created_at: new Date().toISOString()
      }])

    if (sessionError) {
      console.error('Error creating connection session:', sessionError)
      return NextResponse.json(
        { error: 'Failed to create connection session' },
        { status: 500 }
      )
    }

    // Generate the Lyceum portal connection URL
    // In a real implementation, this would create a secure authenticated session
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const connectionUrl = `${baseUrl}/admin/live-view?token=${connectionToken}&user=${userId}&type=lyceum`

    // Log the connection attempt
    const { error: logError } = await supabase
      .from('admin_activity_log')
      .insert([{
        admin_user_id: request.headers.get('user-id'),
        action: 'live_connection_lyceum',
        target_user_id: userId,
        details: `Initiated live Lyceum portal connection for onboarding session ${sessionId}`,
        created_at: new Date().toISOString()
      }])

    if (logError) {
      console.warn('Failed to log admin activity:', logError)
    }

    return NextResponse.json({
      connection_url: connectionUrl,
      connection_token: connectionToken,
      expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      user: {
        id: userProfile.id,
        email: userProfile.email,
        full_name: userProfile.full_name
      },
      portal_access: {
        dashboard_url: `${baseUrl}/dashboard?admin_token=${connectionToken}`,
        settings_url: `${baseUrl}/settings?admin_token=${connectionToken}`,
        analytics_url: `${baseUrl}/analytics-studio?admin_token=${connectionToken}`
      }
    })

  } catch (error) {
    console.error('Error creating Lyceum live connection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/live-connection/lyceum/[userId] - End live connection session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const connectionToken = searchParams.get('token')

    if (!connectionToken) {
      return NextResponse.json(
        { error: 'Connection token is required' },
        { status: 400 }
      )
    }

    // End the connection session
    const { error } = await supabase
      .from('admin_connection_sessions')
      .update({ 
        ended_at: new Date().toISOString(),
        status: 'ended'
      })
      .eq('session_token', connectionToken)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to end connection session' },
        { status: 500 }
      )
    }

    // Log the disconnection
    const { error: logError } = await supabase
      .from('admin_activity_log')
      .insert([{
        admin_user_id: request.headers.get('user-id'),
        action: 'live_connection_ended',
        target_user_id: params.userId,
        details: `Ended live Lyceum portal connection session`,
        created_at: new Date().toISOString()
      }])

    if (logError) {
      console.warn('Failed to log admin activity:', logError)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error ending Lyceum live connection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
