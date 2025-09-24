import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { createCheckoutSession, getCustomerByEmail, createCustomer } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { priceId, clusterId, plan } = body;

    if (!priceId || !plan) {
      return NextResponse.json({ error: 'Price ID and plan are required' }, { status: 400 });
    }

    // Check if customer exists, create if not
    let customer = await getCustomerByEmail(user.email);
    if (!customer) {
      customer = await createCustomer({
        email: user.email,
        name: user.full_name || user.email,
        userId: user.id,
      });
    }

    // Create checkout session
    const session = await createCheckoutSession({
      priceId,
      userId: user.id,
      userEmail: user.email,
      clusterId,
      successUrl: `${request.headers.get('origin')}/admin/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${request.headers.get('origin')}/admin/billing/canceled`,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });

  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    );
  }
}
