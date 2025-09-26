import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { stripe } from '@/lib/stripe';
import * as dbOperations from '@/lib/supabase-direct';

/**
 * Process payment for an invoice
 * POST /api/billing/process-payment
 */
export async function POST(request: NextRequest) {
  try {
    console.log('💳 Process payment - Starting request');
    
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response;
    }

    const body = await request.json();
    const { invoice_id, payment_method_id, save_payment_method = true } = body;

    if (!invoice_id) {
      return NextResponse.json(
        { error: 'invoice_id is required' },
        { status: 400 }
      );
    }

    console.log('💳 Processing payment for invoice:', invoice_id);

    // Get invoice details
    const { data: invoice, error: invoiceError } = await dbOperations.supabaseAdmin
      .from('invoices')
      .select(`
        *,
        user_profiles (
          email,
          full_name,
          stripe_customer_id
        )
      `)
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (invoice.user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access to this invoice' },
        { status: 403 }
      );
    }

    // Check if invoice is payable
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      );
    }

    const userProfile = invoice.user_profiles;
    let stripeCustomerId = userProfile.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userProfile.email,
        name: userProfile.full_name,
        metadata: {
          user_id: invoice.user_id
        }
      });

      stripeCustomerId = customer.id;

      // Update user profile with customer ID
      await dbOperations.supabaseAdmin
        .from('user_profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', invoice.user_id);

      console.log('✅ Created Stripe customer:', stripeCustomerId);
    }

    // Create or retrieve Stripe invoice
    let stripeInvoice;
    if (invoice.stripe_invoice_id) {
      // Retrieve existing Stripe invoice
      stripeInvoice = await stripe.invoices.retrieve(invoice.stripe_invoice_id);
    } else {
      // Create new Stripe invoice
      stripeInvoice = await createStripeInvoice(invoice, stripeCustomerId);
      
      // Update our invoice with Stripe invoice ID
      await dbOperations.supabaseAdmin
        .from('invoices')
        .update({ stripe_invoice_id: stripeInvoice.id })
        .eq('id', invoice_id);
    }

    // Process payment
    let paymentResult;
    if (payment_method_id) {
      // Pay with specific payment method
      paymentResult = await stripe.invoices.pay(stripeInvoice.id, {
        payment_method: payment_method_id
      });
    } else {
      // Attempt to pay with default payment method
      paymentResult = await stripe.invoices.pay(stripeInvoice.id);
    }

    console.log('💳 Payment processed:', paymentResult.status);

    // Update our invoice based on payment result
    const updateData: any = {};
    if (paymentResult.status === 'paid') {
      updateData.status = 'paid';
      updateData.paid_date = new Date().toISOString();
    }

    if (paymentResult.payment_intent) {
      updateData.stripe_payment_intent_id = paymentResult.payment_intent;
    }

    if (Object.keys(updateData).length > 0) {
      await dbOperations.supabaseAdmin
        .from('invoices')
        .update(updateData)
        .eq('id', invoice_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        payment_status: paymentResult.status,
        stripe_invoice_id: stripeInvoice.id,
        payment_intent_id: paymentResult.payment_intent
      }
    });

  } catch (error: any) {
    console.error('💳 Process payment - Error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { 
          error: 'Payment failed', 
          details: error.message,
          decline_code: error.decline_code
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Payment processing failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Create a Stripe invoice from our internal invoice
 */
async function createStripeInvoice(invoice: any, customerId: string) {
  console.log('📄 Creating Stripe invoice for:', invoice.invoice_number);

  // Get line items
  const { data: lineItems, error: lineItemsError } = await dbOperations.supabaseAdmin
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoice.id)
    .order('line_order');

  if (lineItemsError) {
    throw new Error(`Failed to get line items: ${lineItemsError.message}`);
  }

  // Create invoice in Stripe
  const stripeInvoice = await stripe.invoices.create({
    customer: customerId,
    description: `Invoice ${invoice.invoice_number} - ${invoice.billing_periods?.period_label || 'Monthly Usage'}`,
    due_date: Math.floor(new Date(invoice.due_date).getTime() / 1000),
    metadata: {
      internal_invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      billing_period_id: invoice.billing_period_id
    },
    auto_advance: false // Don't auto-finalize
  });

  // Add line items to Stripe invoice
  for (const lineItem of lineItems) {
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: stripeInvoice.id,
      description: lineItem.description,
      quantity: lineItem.quantity,
      unit_amount: lineItem.unit_price_cents,
      metadata: {
        item_type: lineItem.item_type,
        internal_line_item_id: lineItem.id
      }
    });
  }

  // Finalize the invoice to make it payable
  const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id);

  console.log('✅ Stripe invoice created and finalized:', finalizedInvoice.id);
  
  return finalizedInvoice;
}


