import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { stripe, getCustomerByEmail, createCustomer } from '@/lib/stripe';
import * as dbOperations from '@/lib/supabase-direct';

export async function POST(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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

    // Create setup intent for adding payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      usage: 'on_session',
      payment_method_types: ['card'],
    });

    // Get user key for consistent URL format
    let userKey = user.id; // Fallback to UUID
    try {
      const { data: allUsers } = await dbOperations.supabaseAdmin
        .from('user_profiles')
        .select('id, created_at')
        .order('created_at', { ascending: true });
      
      if (allUsers) {
        const userIndex = allUsers.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
          userKey = `USER-${userIndex + 1}`;
        }
      }
    } catch (error) {
      console.error('Error resolving user key:', error);
      // Keep using UUID as fallback
    }

    // Create Stripe Checkout session for setup mode
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customer.id,
      success_url: `${request.headers.get('origin')}/admin/billing/setup-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/admin/users/${userKey}/profile?tab=payment`,
      payment_method_types: ['card'],
    });

    return NextResponse.json({
      success: true,
      setupUrl: session.url,
      setupIntentId: setupIntent.id,
    });

  } catch (error: any) {
    console.error('Setup intent error:', error);
    return NextResponse.json(
      { error: 'Failed to create setup intent', details: error.message },
      { status: 500 }
    );
  }
}
