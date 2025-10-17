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
    const { session_id, version, instance_id, user_agent, platform, build, timestamp } = body;

    console.log('Session update request received:', {
      session_id: session_id ? `${session_id.substring(0, 20)}...` : 'missing',
      version,
      platform,
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

    // Decode Lyceum JWT token to get user ID
    const userId = getUserIdFromToken(token);
    if (!userId) {
      console.warn('Session update: Invalid or expired token');
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('Session update for user:', userId);

    // Create Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);

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

    console.log('✅ Session updated successfully for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Session updated successfully'
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
