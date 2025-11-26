import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/auth/sessions/revoke
 *
 * Revoke a specific session
 * Body: { session_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.warn('Session revoke: Missing or invalid authorization header');
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
      console.warn('Session revoke: Invalid token or user not found');
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Get session_id from request body
    const body = await request.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json(
        { success: false, error: 'Missing session_id' },
        { status: 400 }
      );
    }

    console.log('Revoking session:', session_id, 'for user:', userId);

    // Verify the session belongs to this user
    const { data: session, error: checkError } = await supabase
      .from('user_sessions')
      .select('user_id, session_id')
      .eq('session_id', session_id)
      .single();

    if (checkError || !session) {
      console.warn('Session not found or error:', checkError);
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.user_id !== userId) {
      console.warn('Unauthorized revoke attempt: session belongs to different user');
      return NextResponse.json(
        { success: false, error: 'Unauthorized - session belongs to another user' },
        { status: 403 }
      );
    }

    // Revoke the session by setting revoked_at timestamp
    const { error: revokeError } = await supabase
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('session_id', session_id);

    if (revokeError) {
      console.error('Error revoking session:', revokeError);
      return NextResponse.json(
        { success: false, error: 'Failed to revoke session' },
        { status: 500 }
      );
    }

    // Also update session_activity to mark as inactive
    await supabase
      .from('session_activity')
      .update({ status: 'idle' })
      .eq('session_id', session_id);

    console.log('✅ Session revoked successfully:', session_id);

    return NextResponse.json({
      success: true,
      message: 'Session revoked successfully',
      session_id
    });

  } catch (error: any) {
    console.error('Session revoke exception:', error);
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
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
