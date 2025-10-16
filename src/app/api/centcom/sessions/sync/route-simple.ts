import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/centcom/sessions/sync
 *
 * Simple session sync endpoint that matches Centcom's expected format
 * Called by: Centcom lyceumSessionSync.ts every 8 minutes (active) or 24 hours (idle)
 *
 * Expected Request Body:
 * {
 *   "session_id": "eyJhbGci...",
 *   "user_id": "2c3d4747-8d67-45af-90f5-b5e9058ec246",
 *   "status": "active" | "idle",
 *   "last_activity": "2025-10-16T12:34:56.789Z",
 *   "platform": "Windows",
 *   "version": "1.0.0"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, user_id, status, last_activity, platform, version } = body;

    console.log('🔄 Session sync request:', {
      user_id,
      status,
      platform,
      session_id: session_id ? `${session_id.substring(0, 20)}...` : 'missing'
    });

    // Validate required fields
    if (!session_id || !user_id || !status) {
      console.warn('❌ Missing required fields');
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate status
    if (!['active', 'idle'].includes(status)) {
      console.warn('❌ Invalid status value:', status);
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('❌ Missing or invalid authorization header');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || user.id !== user_id) {
      console.warn('❌ Invalid token or user mismatch');
      return NextResponse.json(
        { success: false, error: 'Invalid token or user mismatch' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Update session activity
    const { error: updateError } = await supabase
      .from('session_activity')
      .upsert({
        session_id,
        user_id,
        status,
        last_activity: last_activity || new Date().toISOString(),
        platform,
        version,
        synced_at: new Date().toISOString()
      }, {
        onConflict: 'session_id'
      });

    if (updateError) {
      console.error('❌ Session sync error:', updateError);

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

      return NextResponse.json(
        { success: false, error: 'Failed to sync session data' },
        { status: 500 }
      );
    }

    const serverTime = new Date().toISOString();
    console.log('✅ Session synced successfully at', serverTime);

    return NextResponse.json({
      success: true,
      message: 'Session synced successfully',
      server_time: serverTime
    });

  } catch (error: any) {
    console.error('❌ Session sync exception:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync session data' },
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
