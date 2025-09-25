import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import * as dbOperations from '@/lib/supabase-direct';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    console.log('User profile API - Starting request...')
    
    const { success, user, response } = await requireAuth(request);
    console.log('User profile API - Auth result:', { success, userId: user?.id, userEmail: user?.email })
    
    if (!success) {
      console.log('User profile API - Auth failed, returning 401')
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = await params;
    console.log('User profile API - Requested userId:', userId)

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select(`
        id,
        email,
        username,
        full_name,
        avatar_url,
        company,
        role,
        created_at,
        updated_at,
        last_sign_in,
        is_active,
        stripe_customer_id,
        subscription_status,
        subscription_id,
        plan_name
      `)
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ 
        error: 'User not found',
        details: profileError.message 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: userProfile
    });

  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile', details: error.message },
      { status: 500 }
    );
  }
}
