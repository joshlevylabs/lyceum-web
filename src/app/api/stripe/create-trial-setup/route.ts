import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { stripe, getCustomerByEmail, createCustomer } from '@/lib/stripe';

/**
 * Create a Stripe Checkout session in setup mode for free trial
 * This collects payment method but doesn't charge
 * POST /api/stripe/create-trial-setup
 */
export async function POST(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { subscription_type } = body;

    if (subscription_type !== 'trial') {
      return NextResponse.json(
        { error: 'Invalid subscription type. This endpoint is for trial subscriptions only.' },
        { status: 400 }
      );
    }

    console.log('Creating Stripe setup session for trial:', {
      userId: user.id,
      userEmail: user.email,
      subscription_type
    });

    // Check if customer exists, create if not
    let customer = await getCustomerByEmail(user.email);
    if (!customer) {
      customer = await createCustomer({
        email: user.email,
        name: user.full_name || user.email,
        userId: user.id,
      });
      console.log('✅ Created new Stripe customer:', customer.id);
    }

    // Create Stripe Checkout session in setup mode
    // This collects payment method but doesn't charge
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customer.id,
      payment_method_types: ['card'],
      metadata: {
        userId: user.id,
        subscription_type: 'trial',
        product_type: 'native_app_trial',
      },
      success_url: `${request.headers.get('origin')}/native-app/trial-setup-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/native-app/subscribe?cancelled=true`,
    });

    console.log('✅ Stripe setup session created:', {
      sessionId: session.id,
      setupUrl: session.url,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      setupUrl: session.url,
    });

  } catch (error: any) {
    console.error('❌ Error creating Stripe setup session:', error);
    return NextResponse.json(
      { error: 'Failed to create setup session', details: error.message },
      { status: 500 }
    );
  }
}
