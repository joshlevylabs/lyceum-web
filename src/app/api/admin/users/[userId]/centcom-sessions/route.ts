import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface CentComSessionData {
  centcom_session_id: string
  created_at: string
  last_activity: string
  source_ip: string
  user_agent: string
  mfa_verified: boolean
  risk_score: number
  session_status: string
  location: {
    country: string
    city: string
    timezone: string
  }
  device_info: {
    platform: string
    device_type: string
    browser: string
  }
  application_info: {
    app_name: string
    app_version: string
    build_number: string
    license_type: string
  }
}

interface SyncMetadata {
  sync_timestamp: string
  sync_source: string
  sync_version: string
}

interface CentComSessionSyncRequest {
  session_data: CentComSessionData
  sync_metadata: SyncMetadata
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  
  // CORS headers for CentCom
  const origin = request.headers.get('origin')
  const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'tauri://localhost']
  const corsOrigin = allowedOrigins.includes(origin || '') ? origin : '*'
  
  const headers = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version, X-Session-Source',
    'Access-Control-Allow-Credentials': 'true'
  }

  try {
    // Validate authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid authorization header'
      }, { status: 401, headers })
    }

    // Validate client headers
    const clientApp = request.headers.get('X-Client-App')
    const clientVersion = request.headers.get('X-Client-Version')
    const sessionSource = request.headers.get('X-Session-Source')

    if (clientApp !== 'CentCom') {
      return NextResponse.json({
        success: false,
        error: 'Invalid client application'
      }, { status: 400, headers })
    }

    console.log(`🔄 CentCom session sync request for user ${userId}`, {
      clientApp,
      clientVersion,
      sessionSource
    })

    // Parse request body
    const body: CentComSessionSyncRequest = await request.json()
    const { session_data, sync_metadata } = body

    // Validate required fields
    if (!session_data || !session_data.centcom_session_id) {
      return NextResponse.json({
        success: false,
        error: 'Missing required session data'
      }, { status: 400, headers })
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Verify the user exists
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404, headers })
    }

    console.log(`📝 Syncing session for user: ${userData.email}`)

    // Prepare session data for database insertion
    const sessionRecord = {
      user_id: userId,
      centcom_session_id: session_data.centcom_session_id,
      created_at: session_data.created_at,
      last_activity: session_data.last_activity,
      session_status: session_data.session_status || 'active',
      source_ip: session_data.source_ip,
      user_agent: session_data.user_agent,
      mfa_verified: session_data.mfa_verified || false,
      risk_score: session_data.risk_score || 0,
      country: session_data.location?.country,
      city: session_data.location?.city,
      timezone: session_data.location?.timezone,
      platform: session_data.device_info?.platform,
      device_type: session_data.device_info?.device_type,
      browser: session_data.device_info?.browser,
      app_name: session_data.application_info?.app_name || 'CentCom',
      app_version: session_data.application_info?.app_version,
      build_number: session_data.application_info?.build_number,
      license_type: session_data.application_info?.license_type,
      sync_timestamp: sync_metadata?.sync_timestamp || new Date().toISOString(),
      sync_source: sync_metadata?.sync_source || 'centcom_session_manager',
      sync_version: sync_metadata?.sync_version || '1.0'
    }

    // Insert or update the session record
    const { data: sessionData, error: sessionError } = await supabase
      .from('centcom_sessions')
      .upsert(sessionRecord, {
        onConflict: 'centcom_session_id',
        ignoreDuplicates: false
      })
      .select('id, centcom_session_id, updated_at')
      .single()

    if (sessionError) {
      console.error('❌ Failed to sync CentCom session:', sessionError)
      
      // If table doesn't exist, provide helpful error message
      if (sessionError.code === 'PGRST116' || sessionError.message.includes('does not exist') || sessionError.message.includes('schema cache')) {
        return NextResponse.json({
          success: false,
          error: 'CentCom sessions table not found',
          details: 'Please run database-setup-centcom-sessions.sql to create the required table first.',
          setup_required: true
        }, { status: 503, headers }) // Service Unavailable - setup required
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to sync session data',
        details: sessionError.message
      }, { status: 500, headers })
    }

    console.log('✅ CentCom session synced successfully:', {
      sessionId: sessionData.id,
      centcomSessionId: sessionData.centcom_session_id,
      updatedAt: sessionData.updated_at
    })

    // Also log to user activity for audit trail
    try {
      const { error: activityError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: userId,
          activity_type: 'centcom_session_sync',
          description: `CentCom session synchronized: ${session_data.centcom_session_id}`,
          ip_address: session_data.source_ip,
          user_agent: session_data.user_agent,
          metadata: {
            centcom_session_id: session_data.centcom_session_id,
            app_version: session_data.application_info?.app_version,
            sync_source: sync_metadata?.sync_source,
            platform: session_data.device_info?.platform
          }
        })

      if (activityError) {
        console.warn('⚠️ Failed to log session sync activity:', activityError.message)
      }
    } catch (activityErr) {
      console.warn('⚠️ Activity logging failed (non-critical):', activityErr)
    }

    // Return success response
    return NextResponse.json({
      success: true,
      session: {
        id: sessionData.id,
        centcom_session_id: sessionData.centcom_session_id,
        last_updated: sessionData.updated_at,
        status: 'synchronized'
      },
      message: 'CentCom session synchronized successfully'
    }, { headers })

  } catch (error: any) {
    console.error('❌ CentCom session sync error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500, headers })
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'tauri://localhost']
  const corsOrigin = allowedOrigins.includes(origin || '') ? origin : '*'

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-App, X-Client-Version, X-Session-Source',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  })
}

// GET endpoint to retrieve user's CentCom sessions (for admin panel)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }

  try {
    // No authentication required for admin panel calls - they use service role directly

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get user's CentCom sessions
    const { data: rawSessions, error: sessionsError } = await supabase
      .from('centcom_sessions')
      .select(`
        id,
        centcom_session_id,
        external_session_id,
        created_at,
        last_activity,
        session_status,
        source_ip,
        user_agent,
        platform,
        device_type,
        app_version,
        license_type,
        country,
        city,
        mfa_verified,
        risk_score,
        heartbeat_type,
        sync_source,
        sync_version,
        last_sync_interval,
        heartbeat_frequency,
        optimization_enabled
      `)
      .eq('user_id', userId)
      .order('last_activity', { ascending: false })
      .limit(50) // Get more initially to allow for deduplication
    
    // Deduplicate sessions by external_session_id (keep the most recent)
    const sessionMap = new Map()
    const sessions = []
    
    if (rawSessions) {
      // First pass: group by external_session_id, keeping the most recent
      rawSessions.forEach(session => {
        const key = session.external_session_id || session.centcom_session_id
        const existing = sessionMap.get(key)
        
        if (!existing || new Date(session.last_activity) > new Date(existing.last_activity)) {
          sessionMap.set(key, session)
        }
      })
      
      // Convert back to array and sort by last_activity
      sessions.push(...Array.from(sessionMap.values())
        .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime())
        .slice(0, 10)) // Limit to 10 after deduplication
    }
    
    console.log(`📊 Sessions: ${rawSessions?.length || 0} raw → ${sessions.length} deduplicated`)

    if (sessionsError) {
      // If table doesn't exist, return empty data instead of error
      if (sessionsError.code === 'PGRST116' || sessionsError.message.includes('does not exist') || sessionsError.message.includes('schema cache')) {
        console.log('⚠️ centcom_sessions table does not exist yet. Run database-setup-centcom-sessions.sql to create it.')
        return NextResponse.json({
          success: true,
          sessions: [],
          latest_session: null,
          total_count: 0,
          message: 'CentCom sessions table not yet created. Run database setup first.'
        }, { headers })
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch CentCom sessions',
        details: sessionsError.message
      }, { status: 500, headers })
    }

    // Get the latest session with connection status
    const latestSession = sessions?.[0]
    let connectionStatus = 'never'
    
    if (latestSession) {
      const lastActivity = new Date(latestSession.last_activity)
      const now = new Date()
      const diffMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60)
      
      if (diffMinutes <= 5) {
        connectionStatus = 'online'
      } else if (diffMinutes <= 30) {
        connectionStatus = 'idle'
      } else if (diffMinutes <= 1440) { // 24 hours
        connectionStatus = 'recent'
      } else {
        connectionStatus = 'offline'
      }
    }

    return NextResponse.json({
      success: true,
      sessions: sessions || [],
      latest_session: latestSession ? {
        ...latestSession,
        connection_status: connectionStatus,
        duration_minutes: latestSession ? Math.round(
          (new Date(latestSession.last_activity).getTime() - new Date(latestSession.created_at).getTime()) / (1000 * 60)
        ) : 0
      } : null,
      total_count: sessions?.length || 0
    }, { headers })

  } catch (error: any) {
    console.error('❌ Failed to fetch CentCom sessions:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500, headers })
  }
}
