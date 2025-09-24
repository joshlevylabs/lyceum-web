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
    await dbOperations.supabaseAdmin
      .from('user_profiles')
      .update({
        subscription_status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', customer.metadata.userId);
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
