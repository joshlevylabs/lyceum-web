import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { createBillingPortalSession, getCustomerByEmail } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get customer from Stripe
    const customer = await getCustomerByEmail(user.email);
    if (!customer) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
    }

    // Create billing portal session
    const session = await createBillingPortalSession(
      customer.id,
      `${request.headers.get('origin')}/admin/billing`
    );

    return NextResponse.json({
      success: true,
      portalUrl: session.url,
    });

  } catch (error: any) {
    console.error('Billing portal error:', error);
    return NextResponse.json(
      { error: 'Failed to create billing portal session', details: error.message },
      { status: 500 }
    );
  }
}
