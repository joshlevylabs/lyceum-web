import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import * as dbOperations from '@/lib/supabase-direct';
import { getCustomerByEmail } from '@/lib/stripe';
import { stripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // If userId is provided and user is admin, check that user's payment methods
    let targetUser = user;
    if (userId && user.role === 'admin') {
      const { data: profile, error: profileError } = await dbOperations.supabaseAdmin
        .from('user_profiles')
        .select('id, email, subscription_status')
        .eq('id', userId)
        .single();

      if (!profileError && profile) {
        targetUser = { ...user, id: profile.id, email: profile.email };
      }
    }

    // Get customer from Stripe
    const customer = await getCustomerByEmail(targetUser.email);
    if (!customer) {
      return NextResponse.json({
        success: true,
        paymentMethods: [],
        subscriptionStatus: 'none',
      });
    }

    // Get payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
    });

    // Get subscription status
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
    });

    const subscriptionStatus = subscriptions.data.length > 0 ? subscriptions.data[0].status : 'none';

    // Format payment methods for frontend
    const formattedMethods = paymentMethods.data.map(method => ({
      id: method.id,
      type: method.type,
      last4: method.card?.last4 || '',
      exp_month: method.card?.exp_month || 0,
      exp_year: method.card?.exp_year || 0,
      brand: method.card?.brand || '',
      is_default: customer.invoice_settings?.default_payment_method === method.id,
    }));

    return NextResponse.json({
      success: true,
      paymentMethods: formattedMethods,
      subscriptionStatus,
    });

  } catch (error: any) {
    console.error('Payment methods error:', error);
    return NextResponse.json(
      { error: 'Failed to get payment methods', details: error.message },
      { status: 500 }
    );
  }
}
