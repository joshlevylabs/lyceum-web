import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import * as dbOperations from '@/lib/supabase-direct';
import { getCustomerByEmail, getActiveSubscriptions } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user profile from database
    const { data: profile, error: profileError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('stripe_customer_id, subscription_id, subscription_status, plan_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    // If we have Stripe customer ID, get latest info from Stripe
    let stripeInfo = null;
    if (profile?.stripe_customer_id) {
      try {
        const subscriptions = await getActiveSubscriptions(profile.stripe_customer_id);
        if (subscriptions.length > 0) {
          const subscription = subscriptions[0];
          stripeInfo = {
            subscription_id: subscription.id,
            subscription_status: subscription.status,
            plan_name: subscription.items.data[0]?.price?.lookup_key || 'unknown',
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
          };
        }
      } catch (stripeError) {
        console.error('Error fetching Stripe data:', stripeError);
        // Continue with database data if Stripe fails
      }
    }

    // Return combined data (Stripe data takes precedence if available)
    const billingData = {
      stripe_customer_id: profile?.stripe_customer_id,
      subscription_id: stripeInfo?.subscription_id || profile?.subscription_id,
      subscription_status: stripeInfo?.subscription_status || profile?.subscription_status,
      plan_name: stripeInfo?.plan_name || profile?.plan_name,
      current_period_end: stripeInfo?.current_period_end,
      cancel_at_period_end: stripeInfo?.cancel_at_period_end,
    };

    return NextResponse.json(billingData);

  } catch (error: any) {
    console.error('User billing status error:', error);
    return NextResponse.json(
      { error: 'Failed to get billing status', details: error.message },
      { status: 500 }
    );
  }
}
