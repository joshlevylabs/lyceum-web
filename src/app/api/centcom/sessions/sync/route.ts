import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Interface matching CentCom's session sync format
interface CentComSessionSyncRequest {
  user_id: string
  session_data: {
    session_id: string                    // CentCom's session ID
    status: 'active' | 'idle' | 'terminated'
    created_at: string                    // ISO timestamp
    last_activity: string                 // ISO timestamp
    duration_seconds?: number             // Optional duration
    location: {
      ip: string
      country: string
      region?: string
      city: string
      timezone: string
      formatted: string
    }
    device_info: {
      platform: string                   // windows, macos, linux
      os_version?: string
      device_type: string               // desktop, mobile, tablet
      browser: string                   // CentCom Desktop (Tauri)
      user_agent: string
      formatted: string
    }
    application_info: {
      app_name: string                  // centcom
      app_version: string               // 1.0.0
      build_number?: string
      license_type: string              // enterprise, professional, trial
    }
    security_info: {
      mfa_verified: boolean
      risk_score: number                // 0.0 - 1.0 (0.1 = 10%)
      risk_factors?: string[]
      authentication_method?: string
    }
  }
  sync_metadata: {
    sync_timestamp: string
    sync_source: string
    sync_version: string
  }
}

export async function POST(request: NextRequest) {
  // CORS headers for CentCom
  const origin = request.headers.get('origin')
  const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'tauri://localhost']
  const corsOrigin = allowedOrigins.includes(origin || '') ? origin : '*'
  
  const headers = {
    'Access-Control-Allow-Origin': corsOrigin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  try {
    const body: CentComSessionSyncRequest = await request.json()
    console.log('🔄 CentCom session sync received:', JSON.stringify(body, null, 2))

    // Validate required fields
    if (!body.user_id || !body.session_data?.session_id) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: user_id and session_data.session_id'
      }, { status: 400, headers })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    const { user_id, session_data, sync_metadata } = body

    // Try to find existing session by CentCom session ID - use proper parameterized query
    console.log('🔍 Looking for existing session with session_id:', session_data.session_id)
    
    // First try to find by external_session_id (most reliable)
    const { data: existingSessions, error: findError } = await supabase
      .from('centcom_sessions')
      .select('*')
      .eq('user_id', user_id)
      .eq('external_session_id', session_data.session_id)
      .order('created_at', { ascending: false })
      .limit(1)
    
    console.log('🔍 Found existing sessions:', existingSessions?.length || 0)
    
    // If not found by external_session_id, try by centcom_session_id as fallback
    let fallbackSessions = null
    if (!existingSessions || existingSessions.length === 0) {
      console.log('🔄 Trying fallback search by centcom_session_id...')
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('centcom_sessions')
        .select('*')
        .eq('user_id', user_id)
        .eq('centcom_session_id', session_data.session_id)
        .order('created_at', { ascending: false })
        .limit(1)
      
      fallbackSessions = fallbackData
      console.log('🔄 Fallback search found:', fallbackSessions?.length || 0)
    }

    if (findError && findError.code !== 'PGRST116') {
      console.error('❌ Error finding session:', findError)
      return NextResponse.json({
        success: false,
        error: 'Database error'
      }, { status: 500, headers })
    }

    // Use the session we found (prefer external_session_id match over centcom_session_id)
    const existingSession = (existingSessions && existingSessions.length > 0) 
      ? existingSessions[0] 
      : (fallbackSessions && fallbackSessions.length > 0) 
        ? fallbackSessions[0] 
        : null
    
    console.log('📋 Using existing session:', existingSession ? existingSession.id : 'none')
    
    // Clean up any duplicate sessions for this user/session_id combination
    if (existingSession) {
      console.log('🧹 Cleaning up duplicate sessions...')
      // Find duplicates by external_session_id
      const { data: externalDuplicates } = await supabase
        .from('centcom_sessions')
        .select('id, created_at')
        .eq('user_id', user_id)
        .eq('external_session_id', session_data.session_id)
        .neq('id', existingSession.id)
      
      // Find duplicates by centcom_session_id
      const { data: centcomDuplicates } = await supabase
        .from('centcom_sessions')
        .select('id, created_at')
        .eq('user_id', user_id)
        .eq('centcom_session_id', session_data.session_id)
        .neq('id', existingSession.id)
      
      // Combine and deduplicate
      const allDuplicates = [
        ...(externalDuplicates || []),
        ...(centcomDuplicates || [])
      ].filter((session, index, arr) => 
        arr.findIndex(s => s.id === session.id) === index
      )
      
      if (allDuplicates && allDuplicates.length > 0) {
        console.log(`🗑️ Found ${allDuplicates.length} duplicate sessions to remove`)
        const duplicateIds = allDuplicates.map(d => d.id)
        const { error: deleteError } = await supabase
          .from('centcom_sessions')
          .delete()
          .in('id', duplicateIds)
        
        if (!deleteError) {
          console.log(`✅ Cleaned up ${allDuplicates.length} duplicate sessions`)
        } else {
          console.warn('⚠️ Failed to clean up duplicates:', deleteError.message)
        }
      }
    }
    const now = new Date().toISOString()

    // Extract optimized heartbeat metadata
    const heartbeatType = sync_metadata.heartbeat_type || 
                         (session_data.status === 'active' ? 'active_sync' : 'idle_sync')
    const lastSyncInterval = sync_metadata.last_sync_interval || 
                            (session_data.status === 'active' ? 480000 : 86400000) // 8min or 24hr
    
    console.log('🔄 Optimized heartbeat detected:', {
      type: heartbeatType,
      source: sync_metadata.sync_source,
      interval: `${Math.round(lastSyncInterval / 60000)}min`,
      version: sync_metadata.sync_version
    })

    // Prepare session data in Lyceum format with enhanced heartbeat support
    const sessionData = {
      user_id: user_id,
      centcom_session_id: existingSession?.centcom_session_id || `centcom-sync-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      external_session_id: session_data.session_id, // Store CentCom's session ID
      created_at: session_data.created_at,
      last_activity: session_data.last_activity,
      session_status: session_data.status,
      source_ip: session_data.location?.ip || '::1',
      user_agent: session_data.device_info?.user_agent || 'CentCom Desktop',
      mfa_verified: session_data.security_info?.mfa_verified || false,
      risk_score: Math.round((session_data.security_info?.risk_score || 0.1) * 100), // Convert 0.1 to 10
      country: session_data.location?.country || 'Local',
      city: session_data.location?.city || 'Development',
      timezone: session_data.location?.timezone || 'UTC',
      platform: session_data.device_info?.platform || 'Unknown',
      device_type: session_data.device_info?.device_type || 'desktop',
      browser: session_data.device_info?.browser || 'CentCom Desktop',
      app_name: session_data.application_info?.app_name || 'CentCom',
      app_version: session_data.application_info?.app_version || '1.0.0',
      build_number: session_data.application_info?.build_number || 'unknown',
      license_type: session_data.application_info?.license_type || 'enterprise',
      
      // Enhanced heartbeat metadata
      heartbeat_type: heartbeatType,
      sync_source: sync_metadata.sync_source,
      sync_version: sync_metadata.sync_version || '2.0_optimized',
      last_sync_interval: lastSyncInterval,
      heartbeat_frequency: heartbeatType === 'active_sync' ? 'optimized_active' : 'optimized_idle',
      optimization_enabled: true,
      
      sync_timestamp: sync_metadata.sync_timestamp,
      updated_at: now
    }

    console.log('💾 Prepared session data:', JSON.stringify(sessionData, null, 2))

    let result
    if (existingSession) {
      // Update existing session
      console.log('🔄 Updating existing session:', existingSession.id)
      const { data, error } = await supabase
        .from('centcom_sessions')
        .update(sessionData)
        .eq('id', existingSession.id)
        .select()
      
      result = { data, error }
    } else {
      // Create new session
      console.log('🆕 Creating new session from CentCom sync')
      const { data, error } = await supabase
        .from('centcom_sessions')
        .insert(sessionData)
        .select()
      
      result = { data, error }
    }

    if (result.error) {
      console.error('❌ Failed to sync session:', result.error)
      
      // Handle missing table gracefully
      if (result.error.code === 'PGRST116' || result.error.message?.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          error: 'CentCom sessions table not yet created. Run database setup first.',
          setup_required: true
        }, { status: 503, headers })
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to sync session data'
      }, { status: 500, headers })
    }

    console.log('✅ CentCom session synced successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Session synced successfully',
      session_id: sessionData.centcom_session_id,
      external_session_id: session_data.session_id,
      action: existingSession ? 'updated' : 'created'
    }, { headers })

  } catch (error: any) {
    console.error('❌ Session sync error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500, headers })
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'tauri://localhost']
  const corsOrigin = allowedOrigins.includes(origin || '') ? origin : '*'
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
