import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import * as dbOperations from '@/lib/supabase-direct';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userKey: string }> }
) {
  try {
    console.log('🔑 User key resolution API - Starting request...')

    // Log the authorization header for debugging
    const authHeader = request.headers.get('authorization')
    console.log('🔑 Authorization header present:', !!authHeader)
    console.log('🔑 Authorization header preview:', authHeader?.substring(0, 30) + '...')

    const { success, user, response } = await requireAuth(request);
    console.log('🔑 User key resolution API - Auth result:', { success, userId: user?.id, userEmail: user?.email })

    if (!success) {
      console.log('🔑 User key resolution API - Auth failed, returning 401')
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userKey } = await params;
    console.log('🔑 User key resolution API - Requested userKey:', userKey)

    if (!userKey || !userKey.startsWith('USER-')) {
      return NextResponse.json({ error: 'Invalid user key format. Expected USER-{number}' }, { status: 400 });
    }

    // Query the database directly for the user with this key
    const { data: targetUser, error: userError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select(`
        id,
        email,
        username,
        full_name,
        role,
        user_key,
        created_at,
        is_active
      `)
      .eq('user_key', userKey)
      .single();

    if (userError || !targetUser) {
      console.error('Error fetching user by key:', userError);
      return NextResponse.json({
        error: 'User not found for the given key',
        details: userError?.message
      }, { status: 404 });
    }

    console.log('✅ User key resolved successfully:', {
      user_key: targetUser.user_key,
      user_id: targetUser.id,
      email: targetUser.email
    });

    return NextResponse.json({
      success: true,
      user_id: targetUser.id,
      user_key: targetUser.user_key,
      user_info: {
        email: targetUser.email,
        username: targetUser.username,
        full_name: targetUser.full_name
      }
    });

  } catch (error: any) {
    console.error('Error resolving user key:', error);
    return NextResponse.json(
      { error: 'Failed to resolve user key', details: error.message },
      { status: 500 }
    );
  }
}
