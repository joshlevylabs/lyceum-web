import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { dbOperations } from '@/lib/supabase-direct';

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user and check for admin role
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { user } = authResult;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: userProfile, error: userError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check payment status in multiple ways
    let hasValidPayment = false;
    let paymentDetails: any = {};

    try {
      // First check user's Stripe subscription status
      const { data: profile, error: profileError } = await dbOperations.supabaseAdmin
        .from('user_profiles')
        .select('stripe_customer_id, subscription_status, subscription_id, plan_name')
        .eq('id', userId)
        .single();

      if (!profileError && profile) {
        // Check if user has active subscription
        if (profile.subscription_status === 'active' && profile.subscription_id) {
          hasValidPayment = true;
          paymentDetails = {
            method_type: 'stripe_subscription',
            subscription_status: profile.subscription_status,
            subscription_id: profile.subscription_id,
            plan_name: profile.plan_name
          };
        }
      }
    } catch (error) {
      console.log('Error checking Stripe subscription status:', error);
    }

    // Fallback: check for licenses if no Stripe subscription
    if (!hasValidPayment) {
      try {
        const { data: licenses, error: licenseError } = await dbOperations.supabaseAdmin
          .from('license_keys')
          .select('id')
          .eq('user_id', userId)
          .limit(1);

        if (!licenseError && licenses && licenses.length > 0) {
          hasValidPayment = true;
          paymentDetails = {
            method_type: 'existing_customer',
            source: 'license_history'
          };
        }
      } catch (error) {
        console.log('License check failed, using default payment status');
      }
    }

    return NextResponse.json({
      success: true,
      hasValidPayment,
      paymentDetails,
      user: {
        id: userProfile.id,
        email: userProfile.email
      }
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
