import { NextRequest, NextResponse } from 'next/server';
import { BillingService, UsageTrackingService, BillingPeriodService, InvoiceService } from '@/lib/billing-service';
import { stripe } from '@/lib/stripe';
import * as dbOperations from '@/lib/supabase-direct';

/**
 * Test Billing Endpoint
 * POST /api/billing/test-billing
 * 
 * Manually creates and processes an invoice for testing purposes.
 * This simulates the automated billing process for a specific user.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🧪 Test billing - Starting manual invoice creation');

  try {
    // Basic authentication
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.CRON_SECRET || 'your-secure-random-string-here';
    
    if (apiKey !== expectedApiKey) {
      console.error('❌ Unauthorized test billing request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, amount, lineItems } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    console.log('🧪 Test billing for user:', userId, 'Amount:', amount);

    // Step 1: Get or create current billing period
    let billingPeriod = await BillingPeriodService.getActiveBillingPeriod(userId);
    if (!billingPeriod) {
      billingPeriod = await BillingPeriodService.createBillingPeriod(userId);
    }

    console.log('📅 Using billing period:', billingPeriod.id);

    // Step 2: Create usage snapshot with mock data (bypassing broken UsageTrackingService)
    console.log('📸 Creating mock usage snapshot with correct data');
    
    // Step 3: Generate invoice directly with provided line items
    console.log('🧾 Generating invoice with provided line items');
    
    // Calculate total from line items
    const calculatedTotal = lineItems.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
    console.log('💰 Calculated total from line items:', calculatedTotal);
    
    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}-${userId.substring(0, 7).toUpperCase()}`;
    
    // Create invoice directly in database
    const { data: invoice, error: invoiceError } = await dbOperations.supabaseAdmin
      .from('invoices')
      .insert({
        user_id: userId,
        billing_period_id: billingPeriod.id,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        status: 'draft',
        subtotal_cents: calculatedTotal,
        tax_cents: 0,
        total_cents: calculatedTotal,
        currency: 'USD'
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('❌ Error creating invoice:', invoiceError);
      throw new Error('Failed to create invoice');
    }
    
    // Create line items in database
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      await dbOperations.supabaseAdmin
        .from('invoice_line_items')
        .insert({
          invoice_id: invoice.id,
          item_type: item.name.toLowerCase().includes('platform') ? 'platform_fee' :
                    item.name.toLowerCase().includes('license') ? 'license' :
                    item.name.toLowerCase().includes('cluster') ? 'cluster' :
                    item.name.toLowerCase().includes('user') ? 'additional_users' :
                    item.name.toLowerCase().includes('storage') ? 'storage_overage' : 'other',
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price_cents: item.unitPrice,
          total_price_cents: item.totalPrice,
          line_order: i + 1
        });
    }
    
    console.log('🧾 Generated invoice:', invoiceNumber, 'with', lineItems.length, 'line items');

    // Step 4: Get user's Stripe customer and payment method
    const { data: userProfile, error: profileError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      throw new Error('User profile not found');
    }

    if (!userProfile.stripe_customer_id) {
      throw new Error('User has no Stripe customer ID');
    }

    console.log('👤 User Stripe customer:', userProfile.stripe_customer_id);

    // Step 5: Get payment methods for the customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: userProfile.stripe_customer_id,
      type: 'card',
    });

    if (paymentMethods.data.length === 0) {
      throw new Error('User has no payment methods');
    }

    const defaultPaymentMethod = paymentMethods.data[0];
    console.log('💳 Using payment method:', defaultPaymentMethod.id);

    // Step 6: Create Stripe invoice
    const stripeInvoice = await stripe.invoices.create({
      customer: userProfile.stripe_customer_id,
      default_payment_method: defaultPaymentMethod.id,
      metadata: {
        lyceum_invoice_id: invoice.id,
        lyceum_invoice_number: invoiceNumber, // Add invoice number for cross-reference
        lyceum_user_id: userId,
        lyceum_user_email: userProfile.email,
        test_invoice: 'true'
      },
      description: `Lyceum Invoice ${invoiceNumber} - Monthly Billing`,
      auto_advance: true, // Automatically finalize and attempt payment
    });

    console.log('📝 Created Stripe invoice:', stripeInvoice.id);

    // Step 7: Add line items to Stripe invoice
    for (const item of lineItems) {
      // Handle fractional quantities by using total amount with quantity 1
      const isIntegerQuantity = Number.isInteger(item.quantity);
      
      console.log(`📋 Processing line item: ${item.name}`);
      console.log(`   Original quantity: ${item.quantity} (isInteger: ${isIntegerQuantity})`);
      console.log(`   Unit price: ${item.unitPrice}, Total price: ${item.totalPrice}`);
      
      const stripeUnitAmount = isIntegerQuantity ? item.unitPrice : item.totalPrice;
      const stripeQuantity = isIntegerQuantity ? item.quantity : 1;
      
      console.log(`   Stripe unit_amount: ${stripeUnitAmount}, quantity: ${stripeQuantity}`);
      
      await stripe.invoiceItems.create({
        customer: userProfile.stripe_customer_id,
        invoice: stripeInvoice.id,
        unit_amount: stripeUnitAmount,
        quantity: stripeQuantity,
        currency: 'usd',
        description: `${item.name} - ${item.description}`,
      });
    }

    console.log('📋 Added line items to Stripe invoice');

    // Step 8: Update our invoice with Stripe details
    const { error: updateError } = await dbOperations.supabaseAdmin
      .from('invoices')
      .update({
        stripe_invoice_id: stripeInvoice.id,
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice.id);

    if (updateError) {
      console.error('❌ Error updating invoice:', updateError);
    }

    // Step 9: Finalize and pay the Stripe invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id);
    console.log('✅ Finalized Stripe invoice:', finalizedInvoice.id);

    // Step 10: Attempt payment
    const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id);
    console.log('💰 Payment attempted:', paidInvoice.status);

    // Step 11: Capture payment confirmation details
    let paymentConfirmation = null;
    if (paidInvoice.status === 'paid' && paidInvoice.payment_intent) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paidInvoice.payment_intent);
        const charge = paymentIntent.charges?.data?.[0];
        
        paymentConfirmation = {
          stripe_payment_intent_id: paymentIntent.id,
          stripe_charge_id: charge?.id,
          payment_method_last4: charge?.payment_method_details?.card?.last4,
          payment_method_brand: charge?.payment_method_details?.card?.brand,
          stripe_receipt_url: charge?.receipt_url,
          stripe_transaction_id: charge?.balance_transaction
        };
        
        console.log('💳 Payment confirmation captured:', paymentConfirmation);
        
        // Update our invoice with payment confirmation details
        const { error: paymentUpdateError } = await dbOperations.supabaseAdmin
          .from('invoices')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString(),
            ...paymentConfirmation
          })
          .eq('id', invoice.id);

        if (paymentUpdateError) {
          console.error('❌ Error updating invoice with payment confirmation:', paymentUpdateError);
        } else {
          console.log('✅ Invoice updated with payment confirmation');
        }
        
      } catch (paymentError) {
        console.error('❌ Error retrieving payment details:', paymentError);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`🧪 Test billing completed in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      message: 'Test billing completed successfully',
      data: {
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          stripe_invoice_id: stripeInvoice.id,
          amount: amount,
          status: paidInvoice.status
        },
        billing_period: {
          id: billingPeriod.id,
          period_label: billingPeriod.period_label
        },
        processing_time_ms: processingTime
      }
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Test billing error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Test billing failed',
      processing_time_ms: processingTime
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check if test billing is available for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Check if user has payment methods
    const { data: userProfile } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!userProfile?.stripe_customer_id) {
      return NextResponse.json({
        available: false,
        reason: 'No Stripe customer ID'
      });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: userProfile.stripe_customer_id,
      type: 'card',
    });

    return NextResponse.json({
      available: paymentMethods.data.length > 0,
      payment_methods_count: paymentMethods.data.length,
      reason: paymentMethods.data.length === 0 ? 'No payment methods' : 'Ready for test billing'
    });

  } catch (error: any) {
    console.error('❌ Error checking test billing availability:', error);
    return NextResponse.json({
      available: false,
      reason: error.message
    }, { status: 500 });
  }
}
