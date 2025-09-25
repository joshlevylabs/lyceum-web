import { NextRequest, NextResponse } from 'next/server';
import * as dbOperations from '@/lib/supabase-direct';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Link Stripe customer - Starting request')
    
    const { userEmail, stripeCustomerId } = await request.json();
    
    if (!userEmail || !stripeCustomerId) {
      return NextResponse.json({ 
        error: 'userEmail and stripeCustomerId are required' 
      }, { status: 400 });
    }

    console.log('🔗 Link Stripe customer - Request:', { userEmail, stripeCustomerId })

    // Verify the Stripe customer exists
    let customer;
    try {
      customer = await stripe.customers.retrieve(stripeCustomerId);
      console.log('🔗 Link Stripe customer - Stripe customer verified:', {
        id: customer.id,
        email: customer.email,
        name: customer.name
      });
    } catch (stripeError) {
      console.error('🔗 Link Stripe customer - Stripe customer not found:', stripeError);
      return NextResponse.json({ 
        error: 'Stripe customer not found',
        details: stripeError.message 
      }, { status: 404 });
    }

    // Find the user profile by email
    const { data: profile, error: profileError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, stripe_customer_id')
      .eq('email', userEmail)
      .single();

    if (profileError || !profile) {
      console.error('🔗 Link Stripe customer - User profile not found:', profileError);
      return NextResponse.json({ 
        error: 'User profile not found',
        details: profileError?.message 
      }, { status: 404 });
    }

    console.log('🔗 Link Stripe customer - User profile found:', {
      id: profile.id,
      email: profile.email,
      currentCustomerId: profile.stripe_customer_id
    });

    // Update the user profile with the Stripe customer ID
    const { data: updatedProfile, error: updateError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .update({
        stripe_customer_id: stripeCustomerId,
        subscription_status: 'setup_complete',
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
      .select('id, email, stripe_customer_id, subscription_status')
      .single();

    if (updateError) {
      console.error('🔗 Link Stripe customer - Update failed:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update user profile',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('🔗 Link Stripe customer - Successfully linked:', updatedProfile);

    // Get payment methods for verification
    let paymentMethods;
    try {
      paymentMethods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: 'card',
      });
    } catch (stripeError) {
      console.error('🔗 Link Stripe customer - Error fetching payment methods:', stripeError);
      paymentMethods = { data: [] };
    }

    return NextResponse.json({
      success: true,
      message: 'Stripe customer linked successfully',
      userProfile: updatedProfile,
      paymentMethodsCount: paymentMethods.data.length,
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        last4: pm.card?.last4,
        brand: pm.card?.brand,
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year
      }))
    });

  } catch (error: any) {
    console.error('🔗 Link Stripe customer - Error:', error);
    return NextResponse.json(
      { error: 'Failed to link Stripe customer', details: error.message },
      { status: 500 }
    );
  }
}
