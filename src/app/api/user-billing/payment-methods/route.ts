import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import * as dbOperations from '@/lib/supabase-direct';
import { getCustomerByEmail, stripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    console.log('💳 Payment methods API - Starting request')
    const { success, user, response } = await requireAuth(request);
    if (!success) {
      console.log('💳 Payment methods API - Auth failed')
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    console.log('💳 Payment methods API - Request details:', { 
      requestingUserId: user.id, 
      requestingUserEmail: user.email,
      requestingUserRole: user.role,
      targetUserId: userId 
    })

    // If userId is provided and user is admin, check that user's payment methods
    let targetUser = user;
    if (userId && user.role === 'admin') {
      console.log('💳 Payment methods API - Looking up target user profile for userId:', userId)
      const { data: profile, error: profileError } = await dbOperations.supabaseAdmin
        .from('user_profiles')
        .select('id, email, subscription_status')
        .eq('id', userId)
        .single();

      console.log('💳 Payment methods API - Profile lookup result:', { 
        profile: !!profile, 
        profileEmail: profile?.email,
        error: profileError?.message 
      })

      if (!profileError && profile) {
        targetUser = { ...user, id: profile.id, email: profile.email };
        console.log('💳 Payment methods API - Using target user:', { id: targetUser.id, email: targetUser.email })
      } else {
        console.log('💳 Payment methods API - Profile lookup failed, using requesting user')
      }
    }

    console.log('💳 Payment methods API - Final target user:', { id: targetUser.id, email: targetUser.email })

    // First, check if the user profile has a stored stripe_customer_id
    console.log('💳 Payment methods API - Checking for stored Stripe customer ID in profile')
    const { data: profileWithCustomerId, error: customerIdError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', targetUser.id)
      .single();

    let customer = null;
    let customerId = null;

    if (!customerIdError && profileWithCustomerId?.stripe_customer_id) {
      customerId = profileWithCustomerId.stripe_customer_id;
      console.log('💳 Payment methods API - Found stored customer ID:', customerId)
      
      // Get customer details from Stripe using the stored ID
      try {
        customer = await stripe.customers.retrieve(customerId);
        console.log('💳 Payment methods API - Retrieved customer by ID:', { id: customer.id, email: customer.email })
      } catch (stripeError) {
        console.error('💳 Payment methods API - Failed to retrieve customer by ID:', stripeError)
        customer = null;
      }
    }

    // Fallback: search by email if no stored customer ID or retrieval failed
    if (!customer) {
      console.log('💳 Payment methods API - No stored customer ID found, searching by email:', targetUser.email)
      customer = await getCustomerByEmail(targetUser.email);
      console.log('💳 Payment methods API - Email search result:', { 
        customerFound: !!customer,
        customerId: customer?.id,
        customerEmail: customer?.email 
      })
    }
    
    if (!customer) {
      console.log('💳 Payment methods API - No Stripe customer found, returning empty results')
      return NextResponse.json({
        success: true,
        paymentMethods: [],
        subscriptionStatus: 'none',
        debug: {
          targetEmail: targetUser.email,
          customerFound: false,
          storedCustomerId: customerId,
          searchMethod: 'both_id_and_email_failed'
        }
      });
    }

    // Get payment methods from Stripe
    console.log('💳 Payment methods API - Querying Stripe payment methods for customer:', customer.id)
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
    });
    console.log('💳 Payment methods API - Stripe payment methods result:', { 
      paymentMethodsCount: paymentMethods.data.length,
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        last4: pm.card?.last4,
        brand: pm.card?.brand
      }))
    })

    // Get subscription status
    console.log('💳 Payment methods API - Querying Stripe subscriptions for customer:', customer.id)
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
    });
    console.log('💳 Payment methods API - Stripe subscriptions result:', { 
      subscriptionsCount: subscriptions.data.length,
      subscriptions: subscriptions.data.map(sub => ({
        id: sub.id,
        status: sub.status
      }))
    })

    const subscriptionStatus = subscriptions.data.length > 0 ? subscriptions.data[0].status : 'none';

    // Format payment methods for frontend
    const formattedMethods = paymentMethods.data.map(method => ({
      id: method.id,
      type: method.type,
      last4: method.card?.last4 || '',
      exp_month: method.card?.exp_month || 0,
      exp_year: method.card?.exp_year || 0,
      brand: method.card?.brand || '',
      is_default: customer.invoice_settings?.default_payment_method === method.id,
    }));

    console.log('💳 Payment methods API - Final formatted methods:', formattedMethods)
    
    return NextResponse.json({
      success: true,
      paymentMethods: formattedMethods,
      subscriptionStatus,
      debug: {
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
        storedCustomerId: customerId,
        actualCustomerId: customer.id,
        customerEmail: customer.email,
        searchMethod: customerId ? 'database_stored_id' : 'email_fallback',
        rawPaymentMethodsCount: paymentMethods.data.length,
        formattedMethodsCount: formattedMethods.length
      }
    });

  } catch (error: any) {
    console.error('Payment methods error:', error);
    return NextResponse.json(
      { error: 'Failed to get payment methods', details: error.message },
      { status: 500 }
    );
  }
}
