import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { stripe } from '@/lib/stripe';

/**
 * Verify a Stripe Checkout session was completed successfully
 * POST /api/stripe/verify-checkout-session
 */
export async function POST(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      );
    }

    console.log('Verifying Stripe Checkout session:', {
      sessionId: session_id,
      userId: user.id,
    });

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    console.log('Stripe session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      customer_email: session.customer_email,
    });

    // Verify the session belongs to this user
    if (session.customer_email !== user.email && session.metadata?.userId !== user.id) {
      return NextResponse.json(
        { error: 'Checkout session does not belong to this user' },
        { status: 403 }
      );
    }

    // Verify payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: `Payment not completed. Status: ${session.payment_status}` },
        { status: 400 }
      );
    }

    // Get payment intent details
    let paymentIntent = null;
    if (session.payment_intent) {
      paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_email,
        payment_intent_id: session.payment_intent,
      },
      payment_intent: paymentIntent ? {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        receipt_url: paymentIntent.charges?.data[0]?.receipt_url,
      } : null,
    });

  } catch (error: any) {
    console.error('❌ Error verifying checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to verify checkout session', details: error.message },
      { status: 500 }
    );
  }
}
