import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force explicit values to avoid environment variable loading issues
const supabaseUrl = 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET /api/admin/live-connection/centcom/[userId] - Get live connection URL for Centcom
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

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

    // Get user's license information for Centcom connection
    const { data: licenses, error: licenseError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('assigned_to', userId)
      .eq('enabled_plugins', 'centcom')
      .order('created_at', { ascending: false })
      .limit(1)

    if (licenseError || !licenses || licenses.length === 0) {
      return NextResponse.json(
        { error: 'No valid Centcom license found for user' },
        { status: 404 }
      )
    }

    const license = licenses[0]

    // Generate secure connection token (in a real implementation, this would be JWT or similar)
    const connectionToken = `admin_session_${sessionId}_${userId}_${Date.now()}`

    // Store connection session in database for security
    const { error: sessionError } = await supabase
      .from('admin_connection_sessions')
      .insert([{
        session_token: connectionToken,
        admin_user_id: request.headers.get('user-id'), // Would come from auth context
        target_user_id: userId,
        connection_type: 'centcom',
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

    // In a real implementation, you would integrate with Centcom's remote access API
    // For now, return a placeholder connection URL
    const connectionUrl = `https://centcom-connect.example.com/admin-session?token=${connectionToken}&license=${license.key_code}&user=${userId}`

    // Log the connection attempt
    const { error: logError } = await supabase
      .from('admin_activity_log')
      .insert([{
        admin_user_id: request.headers.get('user-id'),
        action: 'live_connection_centcom',
        target_user_id: userId,
        details: `Initiated live Centcom connection for onboarding session ${sessionId}`,
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
      license: {
        key_code: license.key_code,
        license_type: license.license_type,
        status: license.status
      }
    })

  } catch (error) {
    console.error('Error creating Centcom live connection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/live-connection/centcom/[userId] - End live connection session
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
        details: `Ended live Centcom connection session`,
        created_at: new Date().toISOString()
      }])

    if (logError) {
      console.warn('Failed to log admin activity:', logError)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error ending Centcom live connection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

