import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user ID from query params
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    // Fetch user's analytics sessions
    const { data: analyticsSessions, error: analyticsError } = await supabase
      .from('analytics_sessions')
      .select(`
        id,
        name,
        description,
        session_type,
        status,
        config,
        is_public,
        created_at,
        updated_at,
        last_accessed,
        metrics
      `)
      .eq('created_by', userId)
      .order('updated_at', { ascending: false })

    if (analyticsError) {
      console.error('Error fetching analytics sessions:', analyticsError)
    }

    // Fetch authentication logs for session history (including CentCom logins)
    let authLogs = []
    try {
      const { data: authData, error: authError } = await supabase
        .from('auth_logs')
        .select(`
          id,
          event_type,
          app_id,
          client_info,
          ip_address,
          success,
          error_message,
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (authError) {
        console.error('Error fetching auth logs:', authError.message)
        // If table doesn't exist, try to get data from Supabase auth system directly
      } else {
        authLogs = authData || []
      }
    } catch (err) {
      console.error('Auth logs table might not exist:', err)
    }

    // Fetch user activity logs for additional session information
    let activityLogs = []
    try {
      const { data: activityData, error: activityError } = await supabase
        .from('user_activity_logs')
        .select(`
          id,
          activity_type,
          description,
          ip_address,
          user_agent,
          metadata,
          created_at
        `)
        .eq('user_id', userId)
        .in('activity_type', ['login', 'logout', 'session_start', 'session_end', 'password_change', 'profile_update'])
        .order('created_at', { ascending: false })
        .limit(100)

      if (activityError) {
        console.error('Error fetching activity logs:', activityError.message)
      } else {
        activityLogs = activityData || []
      }
    } catch (err) {
      console.error('Activity logs table might not exist:', err)
    }

    // Try to get auth sessions from Supabase auth.sessions if available
    let authSessions = []
    try {
      const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(userId)
      if (authUser?.user && !authUserError) {
        // Get last sign in time from auth.users
        const lastSignIn = authUser.user.last_sign_in_at
        
        if (lastSignIn) {
          // Create mock session data based on auth information
          authSessions.push({
            id: `auth_session_${userId}`,
            type: 'web_login',
            event: 'login',
            app_id: 'lyceum-web',
            application_type: 'Web Lyceum', 
            ip_address: 'Unknown',
            user_agent: 'Web Browser',
            success: true,
            created_at: lastSignIn,
            session_type: 'web'
          })
        }
      }
    } catch (err) {
      console.error('Error getting auth user data:', err)
    }

    // Get current active sessions count (estimate based on recent activity)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentActivity, error: recentError } = await supabase
      .from('analytics_sessions')
      .select('id, last_accessed')
      .eq('created_by', userId)
      .eq('status', 'active')
      .gte('last_accessed', twentyFourHoursAgo)

    if (recentError) {
      console.error('Error fetching recent activity:', recentError)
    }

    // Process and categorize sessions
    const activeSessions = (analyticsSessions || []).filter(session => 
      session.status === 'active' && 
      session.last_accessed && 
      new Date(session.last_accessed) > new Date(twentyFourHoursAgo)
    )

    const inactiveSessions = (analyticsSessions || []).filter(session => 
      session.status !== 'active' || 
      !session.last_accessed || 
      new Date(session.last_accessed) <= new Date(twentyFourHoursAgo)
    )

    // Combine auth logs and auth sessions data
    const allAuthData = [...authLogs, ...authSessions]

    // Separate CentCom and web Lyceum sessions
    const centcomSessions = allAuthData.filter(log => 
      (log.event_type === 'login' || log.event_type === 'authentication' || log.type === 'centcom_login') &&
      (log.app_id === 'centcom' || log.application_type === 'centcom' || log.session_type === 'centcom' || log.type === 'centcom_login')
    ).map(log => ({
      id: log.id,
      type: 'centcom_login',
      event: log.event_type || log.event || 'login',
      app_id: log.app_id || 'centcom',
      application_type: 'CentCom Native',
      ip_address: log.ip_address || 'Unknown',
      user_agent: log.client_info?.user_agent || log.user_agent || 'CentCom Desktop',
      success: log.success !== false,
      created_at: log.created_at,
      client_info: log.client_info,
      session_type: log.session_type || 'native'
    }))

    const webSessions = allAuthData.filter(log => 
      (log.event_type === 'login' || log.event_type === 'authentication' || log.type === 'web_login') &&
      (log.app_id !== 'centcom' && log.application_type !== 'centcom' && log.session_type !== 'centcom' && log.type !== 'centcom_login')
    ).map(log => ({
      id: log.id,
      type: 'web_login',
      event: log.event_type || log.event || 'login',
      app_id: log.app_id || 'lyceum-web',
      application_type: 'Web Lyceum',
      ip_address: log.ip_address || 'Unknown',
      user_agent: log.client_info?.user_agent || log.user_agent || 'Web Browser',
      success: log.success !== false,
      created_at: log.created_at,
      client_info: log.client_info,
      session_type: log.session_type || 'web'
    }))

    // Combine all login sessions
    const allLoginSessions = [...centcomSessions, ...webSessions].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Combine activity logs for session history
    const sessionHistory = [
      ...allLoginSessions,
      ...(activityLogs || []).map(log => ({
        id: log.id,
        type: 'activity',
        event: log.activity_type,
        description: log.description,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        created_at: log.created_at,
        metadata: log.metadata,
        application_type: 'System Activity'
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Calculate session statistics with proper separation
    const recentWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const stats = {
      total_sessions: (analyticsSessions || []).length,
      active_sessions: activeSessions.length,
      inactive_sessions: inactiveSessions.length,
      
      // Separate login statistics
      centcom_logins: centcomSessions.length,
      web_logins: webSessions.length,
      recent_centcom_logins: centcomSessions.filter(s => new Date(s.created_at) > recentWeek).length,
      recent_web_logins: webSessions.filter(s => new Date(s.created_at) > recentWeek).length,
      
      // Last login times
      last_centcom_login: centcomSessions.length > 0 ? centcomSessions[0].created_at : null,
      last_web_login: webSessions.length > 0 ? webSessions[0].created_at : null,
      last_login_overall: allLoginSessions.length > 0 ? allLoginSessions[0].created_at : null
    }

    return NextResponse.json({
      success: true,
      data: {
        analytics_sessions: {
          active: activeSessions,
          inactive: inactiveSessions,
          total: analyticsSessions || []
        },
        login_sessions: {
          centcom: centcomSessions,
          web: webSessions,
          all: allLoginSessions
        },
        session_history: sessionHistory,
        statistics: stats
      }
    })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
