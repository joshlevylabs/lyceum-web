import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { stripe } from '@/lib/stripe';
import * as dbOperations from '@/lib/supabase-direct';

export async function POST(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    console.log('🔄 Processing Stripe session:', sessionId);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['setup_intent', 'subscription', 'payment_intent']
    });

    console.log('📋 Session details:', {
      id: session.id,
      mode: session.mode,
      payment_status: session.payment_status,
      customer: session.customer,
      setup_intent: session.setup_intent?.id,
      subscription: session.subscription?.id
    });

    if (session.payment_status !== 'paid' && session.mode !== 'setup') {
      return NextResponse.json({ error: 'Session not completed successfully' }, { status: 400 });
    }

    // Ensure customer exists in our database
    const customerId = session.customer as string;
    
    // Update user profile with Stripe customer ID
    await dbOperations.supabaseAdmin
      .from('user_profiles')
      .update({
        stripe_customer_id: customerId,
        subscription_status: session.mode === 'subscription' ? 'active' : 'setup_complete',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    console.log('✅ Updated user profile with customer ID:', customerId);

    // If this was a subscription checkout, save subscription details
    let productType = 'unknown';
    if (session.mode === 'subscription' && session.subscription) {
      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id;

      // Retrieve full subscription details to get the price ID
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price.id;

      // Determine product type from price ID
      const desktopAppPriceIds = [
        process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
      ];

      if (priceId && desktopAppPriceIds.includes(priceId)) {
        productType = 'desktop_app';

        // Create user_subscriptions_native_app record for desktop app
        const subscriptionDetails = subscription as any;
        const trialEnd = subscriptionDetails.trial_end
          ? new Date(subscriptionDetails.trial_end * 1000).toISOString()
          : null;

        console.log('Creating user_subscriptions_native_app record for desktop app subscription');

        await dbOperations.supabaseAdmin
          .from('user_subscriptions_native_app')
          .upsert({
            user_id: user.id,
            subscription_type: 'paid', // Even with trial, it's a paid subscription
            status: 'active',
            amount_paid_cents: 0, // $0 during trial
            currency: 'usd',
            trial_start_date: trialEnd ? new Date().toISOString() : null,
            trial_end_date: trialEnd,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          });

        console.log('✅ Created user_subscriptions_native_app record');

        // Check if user already has a license, create if not
        const { data: existingLicense } = await dbOperations.supabaseAdmin
          .from('license_keys')
          .select('*')
          .eq('assigned_to', user.id)
          .eq('license_type', 'main-application')
          .eq('status', 'active')
          .maybeSingle();

        if (!existingLicense) {
          console.log('Creating main-application license for user');

          // Get user profile for brand determination
          const { data: userProfileData } = await dbOperations.supabaseAdmin
            .from('user_profiles')
            .select('company, email')
            .eq('id', user.id)
            .single();

          const centcomCompanies = [
            'centcom', 'sonance', 'blaze', 'iport',
            'danainnovations', 'dana innovations', 'james', 'trufig'
          ];

          const companyLower = userProfileData?.company?.toLowerCase() || '';
          const isCentcom = centcomCompanies.some(name => companyLower.includes(name));
          const brandType = isCentcom ? 'centcom' : 'lyceum';

          // Generate license key
          const keyCode = `LYC-APP-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

          // Create license (paid subscription, no expiration)
          await dbOperations.supabaseAdmin
            .from('license_keys')
            .insert({
              key_code: keyCode,
              license_type: 'main-application',
              status: 'active',
              max_users: 1,
              max_projects: 100,
              max_storage_gb: 50,
              features: [
                'desktop_app_access',
                'local_cluster_support',
                'data_sync',
                'offline_mode',
                'auto_updates',
                brandType === 'centcom' ? 'centcom_branding' : 'lyceum_branding',
                'paid_license'
              ],
              expires_at: trialEnd, // License expires when trial ends
              assigned_to: user.id,
              assigned_at: new Date().toISOString(),
              created_by: user.id,
              time_limit_type: trialEnd ? 'trial_30' : 'unlimited',
              custom_trial_days: trialEnd ? 30 : null,
              enabled_plugins: [],
              plugin_permissions: {},
              allowed_user_types: ['engineer', 'operator', 'admin'],
              access_level: 'standard',
              restrictions: {},
              license_config: {
                brand_type: brandType,
                auto_generated: true,
                generated_via: 'stripe_checkout',
                subscription_type: 'paid',
                version: '2.0',
                created_at: new Date().toISOString()
              },
              usage_stats: {
                generated_at: new Date().toISOString(),
                user_email: userProfileData?.email || user.email
              }
            });

          console.log('✅ Created main-application license:', keyCode);
        } else {
          console.log('✅ User already has main-application license:', existingLicense.key_code);
        }
      } else if (priceId) {
        productType = 'cloud_cluster'; // or plugin, but for now we assume cluster
      }

      await dbOperations.supabaseAdmin
        .from('user_profiles')
        .update({
          subscription_id: subscriptionId,
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      console.log('✅ Updated subscription details:', subscriptionId, 'Product type:', productType);
    }

    // Verify payment methods are attached to customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    console.log('💳 Payment methods found:', paymentMethods.data.length);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      customerId,
      paymentMethodsCount: paymentMethods.data.length,
      subscriptionId: session.subscription,
      mode: session.mode,
      productType,
      message: 'Session processed successfully'
    });

  } catch (error: any) {
    console.error('❌ Session processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process session', details: error.message },
      { status: 500 }
    );
  }
}




