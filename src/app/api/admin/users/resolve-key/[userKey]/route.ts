import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import * as dbOperations from '@/lib/supabase-direct';

// Recreate the same stable user key generation logic from the frontend
async function generateStableUserKeys(users: any[]): Promise<any[]> {
  return users.map((user, index) => ({
    ...user,
    user_key: `USER-${index + 1}`
  }))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userKey: string }> }
) {
  try {
    console.log('🔑 User key resolution API - Starting request...')
    
    const { success, user, response } = await requireAuth(request);
    console.log('🔑 User key resolution API - Auth result:', { success, userId: user?.id, userEmail: user?.email })
    
    if (!success) {
      console.log('User key resolution API - Auth failed, returning 401')
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userKey } = await params;
    console.log('User key resolution API - Requested userKey:', userKey)

    if (!userKey || !userKey.startsWith('USER-')) {
      return NextResponse.json({ error: 'Invalid user key format. Expected USER-{number}' }, { status: 400 });
    }

    // Extract the number from USER-X format
    const userIndex = parseInt(userKey.replace('USER-', '')) - 1; // Convert to 0-based index
    
    if (isNaN(userIndex) || userIndex < 0) {
      return NextResponse.json({ error: 'Invalid user key number' }, { status: 400 });
    }

    // Get all users in the same order as the frontend
    const { data: allUsers, error: usersError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select(`
        id,
        email,
        username,
        full_name,
        company,
        role,
        created_at,
        is_active
      `)
      .order('created_at', { ascending: true }); // Same ordering as frontend

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ 
        error: 'Failed to fetch users',
        details: usersError.message 
      }, { status: 500 });
    }

    if (!allUsers || allUsers.length === 0) {
      return NextResponse.json({ error: 'No users found' }, { status: 404 });
    }

    // Generate user keys for all users to maintain consistency
    const usersWithKeys = await generateStableUserKeys(allUsers);
    
    // Find the user at the specified index
    if (userIndex >= usersWithKeys.length) {
      return NextResponse.json({ error: 'User key not found' }, { status: 404 });
    }

    const targetUser = usersWithKeys[userIndex];
    
    if (!targetUser || targetUser.user_key !== userKey) {
      return NextResponse.json({ error: 'User key mismatch' }, { status: 404 });
    }

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
