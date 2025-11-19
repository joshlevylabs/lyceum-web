import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { stripe } from '@/lib/stripe';

/**
 * Verify a Stripe Setup session was completed successfully
 * POST /api/stripe/verify-setup-session
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

    console.log('Verifying Stripe Setup session:', {
      sessionId: session_id,
      userId: user.id,
    });

    // Retrieve the setup session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    console.log('Stripe setup session retrieved:', {
      id: session.id,
      status: session.status,
      setup_intent: session.setup_intent,
      customer: session.customer,
    });

    // Verify the session belongs to this user
    if (session.metadata?.userId !== user.id) {
      return NextResponse.json(
        { error: 'Setup session does not belong to this user' },
        { status: 403 }
      );
    }

    // Verify setup was successful
    if (session.status !== 'complete') {
      return NextResponse.json(
        { error: `Setup not completed. Status: ${session.status}` },
        { status: 400 }
      );
    }

    // Get setup intent details
    let setupIntent = null;
    let paymentMethod = null;

    if (session.setup_intent) {
      setupIntent = await stripe.setupIntents.retrieve(session.setup_intent as string);

      // Get payment method details
      if (setupIntent.payment_method) {
        paymentMethod = await stripe.paymentMethods.retrieve(setupIntent.payment_method as string);
      }
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        customer: session.customer,
        setup_intent_id: session.setup_intent,
      },
      setup_intent: setupIntent ? {
        id: setupIntent.id,
        status: setupIntent.status,
        payment_method_id: setupIntent.payment_method,
      } : null,
      payment_method: paymentMethod ? {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year,
        } : null,
      } : null,
    });

  } catch (error: any) {
    console.error('❌ Error verifying setup session:', error);
    return NextResponse.json(
      { error: 'Failed to verify setup session', details: error.message },
      { status: 500 }
    );
  }
}
