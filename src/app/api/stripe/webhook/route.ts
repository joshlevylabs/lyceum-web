import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import * as dbOperations from '@/lib/supabase-direct';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature') as string;

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Stripe webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as any);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as any);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as any);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as any);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as any);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as any);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: any) {
  console.log('Checkout completed:', session.id);

  const userId = session.metadata.userId;
  const clusterId = session.metadata.clusterId;

  if (userId) {
    // Update user payment status
    await dbOperations.supabaseAdmin
      .from('user_profiles')
      .update({
        stripe_customer_id: session.customer,
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Update user_subscriptions_native_app with Stripe data
    await dbOperations.supabaseAdmin
      .from('user_subscriptions_native_app')
      .update({
        stripe_customer_id: session.customer,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string || null,
        stripe_subscription_id: session.subscription as string || null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'active');

    // If payment method is available, save it
    if (session.payment_intent) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
        if (paymentIntent.payment_method) {
          const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);

          if (paymentMethod.card) {
            // Save payment method to stored_payment_methods table
            await dbOperations.supabaseAdmin
              .from('stored_payment_methods')
              .upsert({
                user_id: userId,
                card_last_four: paymentMethod.card.last4,
                card_brand: paymentMethod.card.brand,
                card_exp_month: paymentMethod.card.exp_month,
                card_exp_year: paymentMethod.card.exp_year,
                billing_zip: paymentMethod.billing_details?.address?.postal_code || '',
                is_default: true,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id,card_last_four,card_exp_month,card_exp_year',
                ignoreDuplicates: false
              });

            console.log('✅ Payment method saved for user:', userId);
          }
        }
      } catch (error) {
        console.error('Error saving payment method:', error);
        // Don't fail the whole webhook if payment method save fails
      }
    }

    // Create payment transaction record
    if (session.amount_total) {
      try {
        await dbOperations.supabaseAdmin
          .from('payment_transactions')
          .insert({
            user_id: userId,
            subscription_type: 'paid',
            amount: session.amount_total / 100, // Convert cents to dollars
            currency: session.currency?.toUpperCase() || 'USD',
            status: 'completed',
            transaction_id: session.id,
            processed_at: new Date().toISOString(),
          });

        console.log('✅ Payment transaction recorded for user:', userId);
      } catch (error) {
        console.error('Error recording payment transaction:', error);
        // Don't fail the whole webhook if transaction record fails
      }
    }

    // If cluster specified, update cluster billing
    if (clusterId) {
      await dbOperations.supabaseAdmin
        .from('database_clusters')
        .update({
          billing_status: 'active',
          stripe_subscription_id: session.subscription,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clusterId);
    }
  }
}

async function handleSubscriptionCreated(subscription: any) {
  console.log('Subscription created:', subscription.id);
  
  const customer = await stripe.customers.retrieve(subscription.customer);
  if (customer && !customer.deleted && customer.metadata.userId) {
    await dbOperations.supabaseAdmin
      .from('user_profiles')
      .update({
        subscription_id: subscription.id,
        subscription_status: subscription.status,
        plan_name: subscription.items.data[0]?.price?.lookup_key || 'unknown',
        updated_at: new Date().toISOString(),
      })
      .eq('id', customer.metadata.userId);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log('Subscription updated:', subscription.id);
  
  const customer = await stripe.customers.retrieve(subscription.customer);
  if (customer && !customer.deleted && customer.metadata.userId) {
    await dbOperations.supabaseAdmin
      .from('user_profiles')
      .update({
        subscription_status: subscription.status,
        plan_name: subscription.items.data[0]?.price?.lookup_key || 'unknown',
        updated_at: new Date().toISOString(),
      })
      .eq('id', customer.metadata.userId);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('Subscription deleted:', subscription.id);

  const customer = await stripe.customers.retrieve(subscription.customer);
  if (customer && !customer.deleted && customer.metadata.userId) {
    const userId = customer.metadata.userId;

    // Update user subscription status
    await dbOperations.supabaseAdmin
      .from('user_profiles')
      .update({
        subscription_status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Expire all active licenses for this user
    const { data: licenses, error: licensesError } = await dbOperations.supabaseAdmin
      .from('licenses')
      .select('id, license_key')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!licensesError && licenses && licenses.length > 0) {
      // Set licenses to expired status
      await dbOperations.supabaseAdmin
        .from('licenses')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      console.log(`✅ Expired ${licenses.length} license(s) for user:`, userId);
    }

    // Update native app subscription status
    await dbOperations.supabaseAdmin
      .from('user_subscriptions_native_app')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('stripe_subscription_id', subscription.id);

    console.log('✅ Subscription cancelled and licenses expired for user:', userId);
  }
}

async function handlePaymentSucceeded(invoice: any) {
  console.log('Payment succeeded:', invoice.id);
  // Could log payment history or send confirmation emails
}

async function handlePaymentFailed(invoice: any) {
  console.log('Payment failed:', invoice.id);
  // Could send payment failure notifications
}
