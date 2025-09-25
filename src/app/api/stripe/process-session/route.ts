import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { stripe } from '@/lib/stripe';
import * as dbOperations from '@/lib/supabase-direct';

export async function POST(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    console.log('🔄 Processing Stripe session:', sessionId);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['setup_intent', 'subscription', 'payment_intent']
    });

    console.log('📋 Session details:', {
      id: session.id,
      mode: session.mode,
      payment_status: session.payment_status,
      customer: session.customer,
      setup_intent: session.setup_intent?.id,
      subscription: session.subscription?.id
    });

    if (session.payment_status !== 'paid' && session.mode !== 'setup') {
      return NextResponse.json({ error: 'Session not completed successfully' }, { status: 400 });
    }

    // Ensure customer exists in our database
    const customerId = session.customer as string;
    
    // Update user profile with Stripe customer ID
    await dbOperations.supabaseAdmin
      .from('user_profiles')
      .update({
        stripe_customer_id: customerId,
        subscription_status: session.mode === 'subscription' ? 'active' : 'setup_complete',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    console.log('✅ Updated user profile with customer ID:', customerId);

    // If this was a subscription checkout, save subscription details
    if (session.mode === 'subscription' && session.subscription) {
      const subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription.id;

      await dbOperations.supabaseAdmin
        .from('user_profiles')
        .update({
          subscription_id: subscriptionId,
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      console.log('✅ Updated subscription details:', subscriptionId);
    }

    // Verify payment methods are attached to customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    console.log('💳 Payment methods found:', paymentMethods.data.length);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      customerId,
      paymentMethodsCount: paymentMethods.data.length,
      subscriptionId: session.subscription,
      mode: session.mode,
      message: 'Session processed successfully'
    });

  } catch (error: any) {
    console.error('❌ Session processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process session', details: error.message },
      { status: 500 }
    );
  }
}
