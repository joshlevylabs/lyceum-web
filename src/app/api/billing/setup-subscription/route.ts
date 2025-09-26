import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { stripe } from '@/lib/stripe';
import * as dbOperations from '@/lib/supabase-direct';

/**
 * Set up recurring billing subscription for a user
 * POST /api/billing/setup-subscription
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Setup subscription - Starting request');
    
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response;
    }

    const body = await request.json();
    const { 
      user_id, 
      payment_method_id, 
      billing_anchor_day = 1, // Day of month to bill (1-28)
      trial_days = 0 
    } = body;

    // Determine target user ID
    let targetUserId = user.id;
    if (user_id && user.role === 'admin') {
      targetUserId = user_id;
      console.log('🔑 Admin setting up subscription for user:', user_id);
    }

    console.log('🔄 Setting up subscription for user:', targetUserId);

    // Get user profile
    const { data: userProfile, error: profileError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    let stripeCustomerId = userProfile.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userProfile.email,
        name: userProfile.full_name,
        metadata: {
          user_id: targetUserId
        }
      });

      stripeCustomerId = customer.id;

      // Update user profile
      await dbOperations.supabaseAdmin
        .from('user_profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', targetUserId);

      console.log('✅ Created Stripe customer:', stripeCustomerId);
    }

    // Attach payment method if provided
    if (payment_method_id) {
      await stripe.paymentMethods.attach(payment_method_id, {
        customer: stripeCustomerId
      });

      // Set as default payment method
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: payment_method_id
        }
      });

      console.log('✅ Payment method attached and set as default');
    }

    // Calculate billing anchor date
    const now = new Date();
    const billingAnchorDate = new Date(now.getFullYear(), now.getMonth(), billing_anchor_day);
    if (billingAnchorDate <= now) {
      billingAnchorDate.setMonth(billingAnchorDate.getMonth() + 1);
    }

    // Create subscription for usage-based billing
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      billing_cycle_anchor: Math.floor(billingAnchorDate.getTime() / 1000),
      collection_method: 'charge_automatically',
      description: 'Lyceum Monthly Usage-Based Billing',
      metadata: {
        user_id: targetUserId,
        billing_type: 'usage_based'
      },
      // Start with a minimal subscription - actual billing will be done via invoices
      items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Lyceum Platform Access',
              description: 'Base platform access fee'
            },
            unit_amount: 1000, // $10.00 base fee
            recurring: {
              interval: 'month'
            }
          }
        }
      ],
      trial_period_days: trial_days > 0 ? trial_days : undefined,
      automatic_tax: {
        enabled: true
      }
    });

    // Update user payment status
    await dbOperations.supabaseAdmin
      .from('user_payment_status')
      .upsert({
        user_id: targetUserId,
        payment_status: trial_days > 0 ? 'pending' : 'active',
        subscription_type: 'monthly',
        billing_cycle: 'monthly',
        next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
        stripe_customer_id: stripeCustomerId
      });

    // Create initial billing period
    const { BillingPeriodService } = await import('@/lib/billing-service');
    const billingPeriod = await BillingPeriodService.createBillingPeriod(targetUserId);

    console.log('✅ Subscription setup completed:', subscription.id);

    return NextResponse.json({
      success: true,
      message: 'Subscription setup completed successfully',
      data: {
        subscription_id: subscription.id,
        customer_id: stripeCustomerId,
        billing_period_id: billingPeriod.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        trial_end: subscription.trial_end
      }
    });

  } catch (error: any) {
    console.error('🔄 Setup subscription - Error:', error);

    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { 
          error: 'Payment method validation failed', 
          details: error.message,
          decline_code: error.decline_code
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Subscription setup failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Cancel a subscription
 * DELETE /api/billing/setup-subscription
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Cancel subscription - Starting request');
    
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || user.id;
    const immediate = searchParams.get('immediate') === 'true';

    // Admin check for cross-user access
    if (userId !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    console.log('🗑️ Cancelling subscription for user:', userId);

    // Get user's Stripe customer ID
    const { data: userProfile, error: profileError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: userProfile.stripe_customer_id,
      status: 'active'
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Cancel the subscription
    const subscription = subscriptions.data[0];
    const cancelledSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: !immediate,
      ...(immediate && { cancel_at: Math.floor(Date.now() / 1000) })
    });

    // Update payment status
    await dbOperations.supabaseAdmin
      .from('user_payment_status')
      .update({
        payment_status: immediate ? 'cancelled' : 'pending'
      })
      .eq('user_id', userId);

    console.log('✅ Subscription cancelled:', subscription.id);

    return NextResponse.json({
      success: true,
      message: immediate ? 'Subscription cancelled immediately' : 'Subscription will cancel at period end',
      data: {
        subscription_id: cancelledSubscription.id,
        status: cancelledSubscription.status,
        cancel_at_period_end: cancelledSubscription.cancel_at_period_end,
        current_period_end: cancelledSubscription.current_period_end
      }
    });

  } catch (error: any) {
    console.error('🗑️ Cancel subscription - Error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription', details: error.message },
      { status: 500 }
    );
  }
}


