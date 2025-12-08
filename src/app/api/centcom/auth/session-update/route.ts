import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserIdFromToken } from '@/lib/auth';

/**
 * POST /api/centcom/auth/session-update
 *
 * Update session information after successful authentication
 * Called by: Centcom lyceumClient.ts after authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      session_id,
      version,
      instance_id,
      user_agent,
      platform,
      build,
      timestamp,
      // New fields
      device_name,
      location,
      license_type,
      mfa_verified,
      ip_address,
      browser,
      os,
      session_type = 'desktop', // Default to desktop for Centcom
      session_metadata
    } = body;

    console.log('Session update request received:', {
      session_id: session_id ? `${session_id.substring(0, 20)}...` : 'missing',
      version,
      platform,
      device_name,
      location,
      license_type,
      session_type,
      instance_id
    });

    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Session update: Missing or invalid authorization header');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    console.log('🔐 Session update: Token received:', {
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...',
      sessionType: session_type || 'desktop'
    });

    // Create Supabase client with service role (needed for both auth and DB operations)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Try to decode as Lyceum JWT token first (for desktop sessions)
    let userId = getUserIdFromToken(token);
    let tokenType: 'lyceum' | 'supabase' = 'lyceum';

    console.log('🔍 Lyceum JWT decode result:', { userId, success: !!userId });

    // If Lyceum JWT decode fails, try Supabase token (for web sessions)
    if (!userId) {
      tokenType = 'supabase';
      console.log('⚠️ Lyceum token decode failed, trying Supabase token...');

      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      console.log('🔍 Supabase token verification:', {
        success: !!user,
        userId: user?.id,
        error: authError?.message
      });

      if (authError || !user) {
        console.warn('❌ Session update: Invalid token (neither Lyceum nor Supabase)', {
          authError: authError?.message,
          hasUser: !!user
        });
        // Return 401 with clear signal to stop retrying
        return NextResponse.json(
          {
            success: false,
            error: 'token_expired',
            details: authError?.message,
            action: 'logout', // Tell client to log out, not retry
            retry: false // Explicitly tell client NOT to retry
          },
          {
            status: 401,
            headers: {
              'X-Auth-Action': 'logout', // Header signal to stop retrying
              'Retry-After': '86400' // Don't retry for 24 hours (effectively: re-login required)
            }
          }
        );
      }

      userId = user.id;
    }

    console.log('✅ Session update for user:', userId, 'via', tokenType, 'token');

    // Get client IP address (for risk score calculation)
    const clientIp = ip_address ||
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Check if session exists and is revoked
    const { data: existingSession } = await supabase
      .from('user_sessions')
      .select('revoked_at, ip_address')
      .eq('session_id', session_id)
      .single();

    if (existingSession?.revoked_at) {
      console.warn('Session update rejected: Session has been revoked');
      return NextResponse.json(
        {
          success: false,
          error: 'session_revoked',
          message: 'This session has been revoked. Please log in again.'
        },
        { status: 403 }
      );
    }

    // Check session limits based on license type
    const effectiveLicenseType = license_type || 'basic';
    const { data: limitCheck } = await supabase
      .rpc('check_session_limit', {
        p_user_id: userId,
        p_license_type: effectiveLicenseType
      })
      .single();

    // If over limit and this is a new session, auto-revoke oldest
    if (limitCheck && !limitCheck.within_limit && !existingSession) {
      console.log(`Session limit exceeded for ${effectiveLicenseType} license. Auto-revoking oldest session.`);
      await supabase.rpc('auto_revoke_oldest_session', {
        p_user_id: userId,
        p_license_type: effectiveLicenseType
      });
    }

    // Detect IP address change
    const ipChanged = existingSession?.ip_address && existingSession.ip_address !== clientIp;
    const lastIpChange = ipChanged ? new Date().toISOString() : undefined;

    // Calculate risk score
    const { data: riskScoreData } = await supabase
      .rpc('calculate_session_risk_score', {
        p_user_id: userId,
        p_session_id: session_id,
        p_ip_address: clientIp,
        p_mfa_verified: mfa_verified || false,
        p_location: location || 'unknown'
      });

    const calculatedRiskScore = riskScoreData || 0;

    // Update session metadata in database
    const { error: updateError } = await supabase
      .from('user_sessions')
      .upsert({
        session_id,
        user_id: userId,
        version,
        instance_id,
        user_agent,
        platform,
        build,
        session_type,
        device_name,
        location,
        license_type: effectiveLicenseType,
        mfa_verified: mfa_verified || false,
        risk_score: calculatedRiskScore,
        ip_address: clientIp,
        browser,
        os,
        session_metadata: session_metadata || {},
        last_ip_change: lastIpChange,
        last_updated: timestamp || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id'
      });

    if (updateError) {
      console.error('Session update error:', updateError);

      // Handle table not existing gracefully
      if (updateError.code === 'PGRST116' || updateError.message?.includes('does not exist')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Session tracking not yet configured. Run database migrations.',
            setup_required: true
          },
          { status: 503 }
        );
      }

      // Return detailed error for debugging
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update session',
          details: updateError.message,
          code: updateError.code
        },
        { status: 500 }
      );
    }

    // Also update session_activity for status tracking
    await supabase
      .from('session_activity')
      .upsert({
        session_id,
        user_id: userId,
        status: 'active',
        last_activity: timestamp || new Date().toISOString(),
        platform,
        version,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id'
      });

    console.log('✅ Session updated successfully for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Session updated successfully',
      risk_score: calculatedRiskScore,
      session_limit: limitCheck
    });

  } catch (error: any) {
    console.error('Session update exception:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'http://localhost:3003',
    'http://localhost:3594',
    'tauri://localhost',
    'https://centcom.thelyceum.io'
  ];

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin || '') ? origin! : '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
