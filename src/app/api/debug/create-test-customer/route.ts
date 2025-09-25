import { NextRequest, NextResponse } from 'next/server';
import * as dbOperations from '@/lib/supabase-direct';
import { stripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail') || 'joshual@sonance.com';
    
    console.log('🆕 Create test customer - Starting for email:', userEmail);

    // First, check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customer;
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      console.log('🆕 Create test customer - Using existing customer:', customer.id);
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: userEmail,
        name: userEmail.split('@')[0],
        description: `Test customer for ${userEmail}`,
      });
      console.log('🆕 Create test customer - Created new customer:', customer.id);
    }

    // Create a test payment method (using Stripe test card)
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: '4242424242424242', // Stripe test card
        exp_month: 12,
        exp_year: 2028,
        cvc: '123',
      },
    });

    console.log('🆕 Create test customer - Created payment method:', paymentMethod.id);

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customer.id,
    });

    console.log('🆕 Create test customer - Attached payment method to customer');

    // Update the user profile with the customer ID
    const { data: updatedProfile, error: updateError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .update({
        stripe_customer_id: customer.id,
        subscription_status: 'setup_complete',
        updated_at: new Date().toISOString(),
      })
      .eq('email', userEmail)
      .select('id, email, full_name, stripe_customer_id, subscription_status')
      .single();

    if (updateError) {
      console.error('🆕 Create test customer - Profile update failed:', updateError);
    } else {
      console.log('🆕 Create test customer - Profile updated:', updatedProfile);
    }

    // Get all payment methods for verification
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
    });

    return NextResponse.json({
      success: true,
      message: 'Test customer and payment method created successfully',
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name
      },
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        last4: pm.card?.last4,
        brand: pm.card?.brand,
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year
      })),
      paymentMethodsCount: paymentMethods.data.length,
      userProfile: updatedProfile,
      profileUpdateError: updateError?.message
    });

  } catch (error: any) {
    console.error('🆕 Create test customer - Error:', error);
    return NextResponse.json(
      { error: 'Failed to create test customer', details: error.message },
      { status: 500 }
    );
  }
}
