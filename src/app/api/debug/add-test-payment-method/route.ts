import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId') || 'cus_T7cUNqUwcWxVHV';
    
    console.log('💳 Add test payment method - Starting for customer:', customerId);

    // Create a test payment method (using Stripe test card)
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: '4242424242424242', // Visa test card
        exp_month: 12,
        exp_year: 2028,
        cvc: '123',
      },
    });

    console.log('💳 Add test payment method - Created payment method:', paymentMethod.id);

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customerId,
    });

    console.log('💳 Add test payment method - Attached to customer');

    // Create another test payment method (Mastercard)
    const paymentMethod2 = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: '5555555555554444', // Mastercard test card
        exp_month: 6,
        exp_year: 2026,
        cvc: '456',
      },
    });

    await stripe.paymentMethods.attach(paymentMethod2.id, {
      customer: customerId,
    });

    console.log('💳 Add test payment method - Added second payment method');

    // Set the first payment method as default
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });

    // Get all payment methods for verification
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    // Get customer details
    const customer = await stripe.customers.retrieve(customerId);

    return NextResponse.json({
      success: true,
      message: 'Test payment methods added successfully',
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        default_payment_method: customer.invoice_settings?.default_payment_method
      },
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        last4: pm.card?.last4,
        brand: pm.card?.brand,
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year,
        is_default: customer.invoice_settings?.default_payment_method === pm.id
      })),
      paymentMethodsCount: paymentMethods.data.length
    });

  } catch (error: any) {
    console.error('💳 Add test payment method - Error:', error);
    return NextResponse.json(
      { error: 'Failed to add test payment methods', details: error.message },
      { status: 500 }
    );
  }
}
