import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/auth/sessions
 *
 * Retrieve all sessions (active and inactive) for the current user
 * Used by: Settings page to display session information
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.warn('Sessions GET: Missing or invalid authorization header');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Create Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.warn('Sessions GET: Invalid token or user not found');
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log('Fetching sessions for user:', userId);

    // Query sessions using the view we created
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('v_active_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(50); // Limit to last 50 sessions

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);

      // Handle view not existing gracefully
      if (sessionsError.code === 'PGRST116' || sessionsError.message?.includes('does not exist')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Session tracking not yet configured. Run database migrations.',
            setup_required: true
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch sessions',
          details: sessionsError.message
        },
        { status: 500 }
      );
    }

    // Format sessions data
    const formattedSessions = (sessionsData || []).map((session: any) => ({
      id: session.id,
      session_id: session.session_id,
      session_type: session.session_type,
      status: session.computed_status,

      // Device & Platform Info
      device_name: session.device_name || `${session.platform || 'Unknown'} Device`,
      platform: session.platform,
      os: session.os,
      browser: session.browser,
      user_agent: session.user_agent,

      // Location & Security
      location: session.location || 'Unknown',
      ip_address: session.ip_address,
      mfa_verified: session.mfa_verified,
      risk_score: session.risk_score || 0,

      // License & App Info
      license_type: session.license_type || 'unknown',
      app_version: session.app_version || session.build || 'Unknown',
      build: session.build,

      // Timestamps
      started_at: session.started_at,
      last_activity: session.last_activity || session.last_updated,
      revoked_at: session.revoked_at,

      // Calculated fields
      duration_seconds: session.duration_seconds,
      duration_formatted: formatDuration(session.duration_seconds),

      // Flags
      is_current: session.session_id === token, // Check if this is the current session
      is_active: session.computed_status === 'active',
      is_revoked: !!session.revoked_at
    }));

    // Separate active and inactive sessions
    const activeSessions = formattedSessions.filter((s: any) => s.is_active && !s.is_revoked);
    const inactiveSessions = formattedSessions.filter((s: any) => !s.is_active || s.is_revoked);

    // Separate desktop and web sessions
    const activeDesktopSessions = activeSessions.filter((s: any) => s.session_type === 'desktop');
    const activeWebSessions = activeSessions.filter((s: any) => s.session_type === 'web');

    // Get session limits for this user (applies to DESKTOP sessions only)
    const userLicenseType = formattedSessions[0]?.license_type || 'basic';
    const sessionLimits = {
      trial: 1,
      basic: 1,
      pro: 5,
      enterprise: 999999
    };
    const maxDesktopSessions = sessionLimits[userLicenseType as keyof typeof sessionLimits] || 1;

    console.log(`✅ Found ${activeSessions.length} active (${activeDesktopSessions.length} desktop, ${activeWebSessions.length} web) and ${inactiveSessions.length} inactive sessions`);

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
      active_sessions: activeSessions,
      inactive_sessions: inactiveSessions,
      active_desktop_sessions: activeDesktopSessions,
      active_web_sessions: activeWebSessions,
      stats: {
        total: formattedSessions.length,
        active: activeSessions.length,
        active_desktop: activeDesktopSessions.length,
        active_web: activeWebSessions.length,
        inactive: inactiveSessions.length,
        revoked: formattedSessions.filter((s: any) => s.is_revoked).length,
        max_allowed_desktop: maxDesktopSessions,
        within_desktop_limit: activeDesktopSessions.length < maxDesktopSessions,
        // Web sessions are unlimited
        max_allowed_web: 999999
      }
    });

  } catch (error: any) {
    console.error('Sessions GET exception:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to format duration in human-readable format
 */
function formatDuration(seconds: number | null): string {
  if (!seconds || seconds < 0) return '0s';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
