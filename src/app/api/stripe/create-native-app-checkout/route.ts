import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { stripe } from '@/lib/stripe';
import * as dbOperations from '@/lib/supabase-direct';

/**
 * Create a Stripe Checkout session for native app purchase
 * POST /api/stripe/create-native-app-checkout
 */
export async function POST(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, subscription_type, priceId } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (subscription_type !== 'paid') {
      return NextResponse.json(
        { error: 'Invalid subscription type. Only "paid" subscriptions require payment.' },
        { status: 400 }
      );
    }

    // Check if user has already had a trial for this product (prevent duplicate trials)
    const { data: previousTrials, error: trialCheckError } = await dbOperations.supabaseAdmin
      .from('user_subscriptions_native_app')
      .select('*')
      .eq('user_id', user.id)
      .eq('subscription_type', 'trial');

    if (trialCheckError) {
      console.error('Error checking for previous trials:', trialCheckError);
    }

    // If user has ANY previous trial (started, completed, or cancelled), they cannot start another
    if (previousTrials && previousTrials.length > 0) {
      console.log('❌ User has already used their trial:', {
        userId: user.id,
        previousTrials: previousTrials.length
      });
      return NextResponse.json(
        {
          error: 'You have already used your free trial for this product. Please subscribe to continue.',
          can_use_trial: false,
          previous_trial_count: previousTrials.length
        },
        { status: 400 }
      );
    }

    // Get monthly recurring price ID from environment or use provided priceId
    const monthlyPriceId = priceId || process.env.STRIPE_NATIVE_APP_MONTHLY_PRICE_ID;

    if (!monthlyPriceId) {
      console.error('❌ STRIPE_NATIVE_APP_MONTHLY_PRICE_ID not configured');
      return NextResponse.json(
        { error: 'Monthly subscription price not configured. Please contact support.' },
        { status: 500 }
      );
    }

    console.log('Creating Stripe Checkout session for native app:', {
      userId: user.id,
      userEmail: user.email,
      priceId: monthlyPriceId,
      subscription_type
    });

    // Create Stripe Checkout session for RECURRING monthly subscription
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription', // RECURRING subscription, not one-time payment
      customer_email: user.email,
      metadata: {
        userId: user.id,
        subscription_type,
        product_type: 'native_app_license',
      },
      line_items: [
        {
          price: monthlyPriceId, // Use pre-created monthly recurring price
          quantity: 1,
        },
      ],
      success_url: `${request.headers.get('origin')}/native-app/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/native-app/subscribe?cancelled=true`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          userId: user.id,
          subscription_type,
          product_type: 'native_app_license',
        },
      },
    });

    console.log('✅ Stripe Checkout session created:', {
      sessionId: session.id,
      checkoutUrl: session.url,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
    });

  } catch (error: any) {
    console.error('❌ Error creating Stripe Checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    );
  }
}
