import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as dbOperations from '@/lib/supabase-direct';
import { stripe } from '@/lib/stripe';

// Use browser-based auth for admin pages
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTU0MTYsImV4cCI6MjA2ODQ3MTQxNn0.5Wzzoat1TsoLLbsqjuoUEKyawJgYmvrMYbJ-uvosdu0'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug endpoint - Starting request')
    
    // This endpoint is designed to be accessed via browser, so we'll skip auth for now
    // In production, you'd want proper auth here
    
    console.log('🔍 Debug endpoint - Proceeding without auth check for debugging')

    console.log('🔍 Debug - Checking all user profiles and Stripe data')

    // Get ALL user profiles to see what we have
    const { data: allProfiles, error: allProfilesError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, stripe_customer_id, subscription_status, subscription_id')
      .order('created_at', { ascending: false });

    console.log('🔍 Debug - Total user profiles found:', allProfiles?.length || 0)

    // Get profiles with Stripe customer IDs
    const { data: profiles, error: profilesError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, stripe_customer_id, subscription_status')
      .not('stripe_customer_id', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    console.log('🔍 Debug - Found profiles with customer IDs:', profiles?.length || 0)

    const customerData = [];

    for (const profile of profiles || []) {
      try {
        console.log('🔍 Debug - Checking customer:', profile.stripe_customer_id, 'for user:', profile.email)
        
        // Get customer details from Stripe
        const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
        
        // Get payment methods for this customer
        const paymentMethods = await stripe.paymentMethods.list({
          customer: profile.stripe_customer_id,
          type: 'card',
        });

        customerData.push({
          userProfile: {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            subscription_status: profile.subscription_status
          },
          stripeCustomer: {
            id: customer.id,
            email: customer.email,
            name: customer.name,
          },
          paymentMethods: paymentMethods.data.map(pm => ({
            id: pm.id,
            last4: pm.card?.last4,
            brand: pm.card?.brand,
            exp_month: pm.card?.exp_month,
            exp_year: pm.card?.exp_year
          })),
          paymentMethodsCount: paymentMethods.data.length
        });

      } catch (stripeError) {
        console.error('Error fetching Stripe data for customer:', profile.stripe_customer_id, stripeError);
        customerData.push({
          userProfile: {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            subscription_status: profile.subscription_status
          },
          stripeCustomer: null,
          paymentMethods: [],
          paymentMethodsCount: 0,
          error: stripeError.message
        });
      }
    }

    // Also get a sample of ALL Stripe customers to see what exists
    console.log('🔍 Debug - Fetching all Stripe customers')
    let allStripeCustomers = [];
    try {
      const stripeCustomers = await stripe.customers.list({ limit: 10 });
      allStripeCustomers = stripeCustomers.data.map(customer => ({
        id: customer.id,
        email: customer.email,
        name: customer.name,
        created: customer.created
      }));
      console.log('🔍 Debug - Found Stripe customers:', allStripeCustomers.length)
    } catch (stripeError) {
      console.error('🔍 Debug - Error fetching Stripe customers:', stripeError);
    }

    return NextResponse.json({
      success: true,
      totalUserProfiles: allProfiles?.length || 0,
      totalProfilesWithCustomerIds: profiles?.length || 0,
      allUserProfiles: allProfiles?.map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        stripe_customer_id: p.stripe_customer_id,
        subscription_status: p.subscription_status,
        subscription_id: p.subscription_id
      })) || [],
      profilesWithCustomerIds: customerData,
      allStripeCustomers,
      debug: {
        message: 'Comprehensive debug data retrieved',
        profilesError: profilesError?.message,
        allProfilesError: allProfilesError?.message
      }
    });

  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Debug endpoint failed', details: error.message },
      { status: 500 }
    );
  }
}
