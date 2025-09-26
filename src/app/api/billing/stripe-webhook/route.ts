import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import * as dbOperations from '@/lib/supabase-direct';

// Stripe webhook endpoint secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Handle Stripe webhook events for billing
 * POST /api/billing/stripe-webhook
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ Missing Stripe signature');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('✅ Webhook signature verified:', event.type);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'invoice.created':
        await handleInvoiceCreated(event.data.object);
        break;

      case 'invoice.finalized':
        await handleInvoiceFinalized(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object);
        break;

      default:
        console.log(`🔔 Unhandled event type: ${event.type}`);
    }

    // Log the webhook event
    await logWebhookEvent(event);

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    
    await logWebhookEvent(event, 'error', error.message);
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// ====================================
// WEBHOOK EVENT HANDLERS
// ====================================

async function handleInvoicePaymentSucceeded(invoice: any) {
  console.log('💰 Processing invoice payment succeeded:', invoice.id);

  try {
    // Find our invoice by Stripe invoice ID
    const { data: ourInvoice, error } = await dbOperations.supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('stripe_invoice_id', invoice.id)
      .single();

    if (error || !ourInvoice) {
      console.log('📋 No matching invoice found for Stripe invoice:', invoice.id);
      return;
    }

    // Get detailed payment information
    let paymentDetails = {
      status: 'paid',
      paid_date: new Date().toISOString(),
      stripe_payment_intent_id: invoice.payment_intent,
      payment_method_last4: null,
      payment_method_brand: null,
      stripe_charge_id: null,
      stripe_receipt_url: null,
      stripe_transaction_id: null
    };

    // If we have a payment intent, get detailed charge information
    if (invoice.payment_intent) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent);
        const charge = paymentIntent.charges?.data?.[0];
        
        if (charge) {
          paymentDetails.stripe_charge_id = charge.id;
          paymentDetails.stripe_receipt_url = charge.receipt_url;
          paymentDetails.stripe_transaction_id = charge.balance_transaction;
          paymentDetails.payment_method_last4 = charge.payment_method_details?.card?.last4;
          paymentDetails.payment_method_brand = charge.payment_method_details?.card?.brand;
          
          console.log('💳 Captured payment details from charge:', {
            charge_id: charge.id,
            receipt_url: charge.receipt_url ? 'available' : 'none',
            transaction_id: charge.balance_transaction
          });
        }
      } catch (error) {
        console.error('❌ Error retrieving payment intent details:', error);
        // Continue with basic details if enhanced details fail
      }
    }

    // Update invoice status to paid with all available details
    const { error: updateError } = await dbOperations.supabaseAdmin
      .from('invoices')
      .update(paymentDetails)
      .eq('id', ourInvoice.id);

    if (updateError) {
      console.error('❌ Error updating invoice status:', updateError);
      throw updateError;
    }

    console.log('✅ Invoice marked as paid:', ourInvoice.invoice_number);

    // TODO: Send payment confirmation email
    // TODO: Update user subscription status if needed

  } catch (error) {
    console.error('❌ Error handling payment succeeded:', error);
    throw error;
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  console.log('💸 Processing invoice payment failed:', invoice.id);

  try {
    // Find our invoice by Stripe invoice ID
    const { data: ourInvoice, error } = await dbOperations.supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('stripe_invoice_id', invoice.id)
      .single();

    if (error || !ourInvoice) {
      console.log('📋 No matching invoice found for Stripe invoice:', invoice.id);
      return;
    }

    // Update invoice status to overdue
    const { error: updateError } = await dbOperations.supabaseAdmin
      .from('invoices')
      .update({
        status: 'overdue'
      })
      .eq('id', ourInvoice.id);

    if (updateError) {
      console.error('❌ Error updating invoice status:', updateError);
      throw updateError;
    }

    console.log('🚨 Invoice marked as overdue:', ourInvoice.invoice_number);

    // TODO: Send payment failure notification email
    // TODO: Implement retry logic or account suspension

  } catch (error) {
    console.error('❌ Error handling payment failed:', error);
    throw error;
  }
}

async function handleInvoiceCreated(invoice: any) {
  console.log('📄 Processing invoice created:', invoice.id);
  
  // This is typically handled by our own billing process
  // But we can use this to sync any external invoice creation
}

async function handleInvoiceFinalized(invoice: any) {
  console.log('🔒 Processing invoice finalized:', invoice.id);

  try {
    // Update our invoice status to sent if it exists
    const { error } = await dbOperations.supabaseAdmin
      .from('invoices')
      .update({ status: 'sent' })
      .eq('stripe_invoice_id', invoice.id);

    if (error && error.code !== 'PGRST116') { // Ignore not found
      console.error('❌ Error updating invoice status to sent:', error);
    } else {
      console.log('✅ Invoice status updated to sent');
    }

  } catch (error) {
    console.error('❌ Error handling invoice finalized:', error);
  }
}

async function handleSubscriptionCreated(subscription: any) {
  console.log('📅 Processing subscription created:', subscription.id);

  try {
    // Get customer to find user
    const customer = await stripe.customers.retrieve(subscription.customer);
    if (!customer || customer.deleted) {
      console.error('❌ Customer not found for subscription:', subscription.customer);
      return;
    }

    // Find user by customer email
    const { data: user, error } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('email', customer.email)
      .single();

    if (error || !user) {
      console.error('❌ User not found for customer email:', customer.email);
      return;
    }

    // Create or update subscription record
    const { error: upsertError } = await dbOperations.supabaseAdmin
      .from('user_payment_status')
      .upsert({
        user_id: user.id,
        payment_status: 'active',
        subscription_type: 'monthly',
        billing_cycle: 'monthly',
        stripe_customer_id: customer.id,
        next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
        last_payment_date: new Date().toISOString()
      });

    if (upsertError) {
      console.error('❌ Error updating payment status:', upsertError);
      throw upsertError;
    }

    console.log('✅ Subscription status updated for user:', user.id);

  } catch (error) {
    console.error('❌ Error handling subscription created:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log('🔄 Processing subscription updated:', subscription.id);
  
  // Similar to subscription created, but for updates
  // Handle status changes, period updates, etc.
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('🗑️ Processing subscription deleted:', subscription.id);

  try {
    // Update payment status to cancelled
    const { error } = await dbOperations.supabaseAdmin
      .from('user_payment_status')
      .update({
        payment_status: 'cancelled'
      })
      .eq('stripe_customer_id', subscription.customer);

    if (error) {
      console.error('❌ Error updating payment status to cancelled:', error);
      throw error;
    }

    console.log('✅ Subscription status updated to cancelled');

  } catch (error) {
    console.error('❌ Error handling subscription deleted:', error);
    throw error;
  }
}

async function handlePaymentMethodAttached(paymentMethod: any) {
  console.log('💳 Processing payment method attached:', paymentMethod.id);
  
  // We can use this to sync payment method information
  // The existing payment method setup should handle this
}

// ====================================
// HELPER FUNCTIONS
// ====================================

async function logWebhookEvent(event: any, status: 'success' | 'error' = 'success', errorMessage?: string) {
  try {
    await dbOperations.supabaseAdmin
      .from('billing_automation_log')
      .insert({
        event_type: 'stripe_webhook',
        event_status: status,
        trigger_type: 'webhook',
        processor: 'stripe_webhook',
        event_data: {
          stripe_event_id: event.id,
          stripe_event_type: event.type,
          created: event.created
        },
        error_message: errorMessage
      });
  } catch (error) {
    console.error('❌ Failed to log webhook event:', error);
  }
}


