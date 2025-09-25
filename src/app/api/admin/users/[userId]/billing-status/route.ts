import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import * as dbOperations from '@/lib/supabase-direct';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user billing information from user_profiles
    const { data: userProfile, error: profileError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select(`
        id,
        email,
        stripe_customer_id,
        subscription_status,
        subscription_id,
        plan_name
      `)
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile for billing:', profileError);
      return NextResponse.json({ 
        error: 'User not found',
        details: profileError.message 
      }, { status: 404 });
    }

    // Check if user has payment methods (simplified check)
    const payment_method_verified = !!(userProfile.stripe_customer_id && userProfile.subscription_status);

    return NextResponse.json({
      success: true,
      billing: {
        stripe_customer_id: userProfile.stripe_customer_id,
        subscription_status: userProfile.subscription_status,
        subscription_id: userProfile.subscription_id,
        plan_name: userProfile.plan_name,
        payment_method_verified
      }
    });

  } catch (error: any) {
    console.error('Error fetching user billing status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user billing status', details: error.message },
      { status: 500 }
    );
  }
}
