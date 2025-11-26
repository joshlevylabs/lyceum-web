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
    console.log('📧 User:', { id: user.id, email: user.email });

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
      subscription: session.subscription?.id,
      success_url: session.success_url,
      metadata: session.metadata
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

        // Create native app subscription record for desktop app
        const subscriptionDetails = subscription as any;
        const trialEnd = subscriptionDetails.trial_end
          ? new Date(subscriptionDetails.trial_end * 1000).toISOString()
          : null;

        console.log('Creating native app subscription record for desktop app subscription');

        // First, cancel any existing active native_app subscriptions for this user
        const { error: cancelError } = await dbOperations.supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('subscription_category', 'native_app')
          .eq('status', 'active');

        if (cancelError) {
          console.warn('⚠️ Failed to cancel existing subscriptions (might not exist):', cancelError);
          // Don't throw - it's ok if there are no existing subscriptions to cancel
        } else {
          console.log('✅ Cancelled any existing active native_app subscriptions');
        }

        // Now insert the new subscription
        const subscriptionInsertData = {
          user_id: user.id,
          subscription_category: 'native_app',
          plugin_type: null,
          subscription_type: trialEnd ? 'trial' : 'paid', // Trial if trial_end_date exists
          status: 'active',
          amount_paid_cents: 0, // $0 during trial
          currency: 'usd',
          trial_start_date: trialEnd ? new Date().toISOString() : null,
          trial_end_date: trialEnd,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        };

        const { error: subscriptionError } = await dbOperations.supabaseAdmin
          .from('subscriptions')
          .insert(subscriptionInsertData);

        // Query for the created subscription separately
        let createdSubscription = null;
        if (!subscriptionError) {
          const { data: subDataArray } = await dbOperations.supabaseAdmin
            .from('subscriptions')
            .select('id, user_id, status')
            .eq('user_id', user.id)
            .eq('subscription_category', 'native_app')
            .eq('stripe_subscription_id', subscriptionId)
            .limit(1);
          createdSubscription = subDataArray?.[0];
        }

        if (subscriptionError) {
          console.error('❌ Failed to create subscription:', subscriptionError);
          throw new Error(`Failed to create subscription: ${subscriptionError.message}`);
        }

        console.log('✅ Created native app subscription record:', {
          id: createdSubscription?.id,
          user_id: createdSubscription?.user_id,
          status: createdSubscription?.status
        });

        // Check if user already has a license, create if not
        const { data: existingLicense, error: existingLicenseError } = await dbOperations.supabaseAdmin
          .from('license_keys')
          .select('*')
          .eq('assigned_to', user.id)
          .eq('license_type', 'main-application')
          .eq('status', 'active')
          .maybeSingle();

        if (existingLicenseError) {
          console.error('❌ Failed to check existing license:', existingLicenseError);
          throw new Error(`Failed to check existing license: ${existingLicenseError.message}`);
        }

        if (!existingLicense) {
          console.log('Creating main-application license for user');

          // Get user profile for brand determination
          const { data: userProfileData, error: profileError } = await dbOperations.supabaseAdmin
            .from('user_profiles')
            .select('company, email')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('❌ Failed to fetch user profile:', profileError);
            throw new Error(`Failed to fetch user profile: ${profileError.message}`);
          }

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
          const licenseInsertData = {
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
          };

          const { error: licenseError } = await dbOperations.supabaseAdmin
            .from('license_keys')
            .insert(licenseInsertData);

          // Query for the created license separately
          let createdLicense = null;
          if (!licenseError) {
            const { data: licenseDataArray } = await dbOperations.supabaseAdmin
              .from('license_keys')
              .select('id, key_code, license_type, status, assigned_to, expires_at')
              .eq('key_code', keyCode)
              .limit(1);
            createdLicense = licenseDataArray?.[0];
          }

          if (licenseError) {
            console.error('❌ Failed to create license:', licenseError);
            throw new Error(`Failed to create license: ${licenseError.message}`);
          }

          console.log('✅ Created main-application license:', {
            keyCode,
            id: createdLicense?.id,
            assigned_to: createdLicense?.assigned_to,
            expires_at: createdLicense?.expires_at
          });

          // Create relationship between license and subscription
          if (createdLicense && createdSubscription) {
            const { error: relationshipError } = await dbOperations.supabaseAdmin
              .from('license_subscription_relationships')
              .insert({
                license_id: createdLicense.id,
                subscription_id: createdSubscription.id,
                relationship_type: 'standard',
                notes: 'Auto-created on Stripe checkout (process-session)'
              });

            if (relationshipError) {
              console.error('⚠️ Failed to create license-subscription relationship:', relationshipError);
            } else {
              console.log('✅ Created license-subscription relationship');
            }
          }
        } else {
          console.log('✅ User already has main-application license:', existingLicense.key_code);
        }
      } else if (priceId) {
        // Check if this is a plugin subscription
        const pluginPriceIds = [
          process.env.STRIPE_PLUGIN_APX500_PRICE_ID,
          process.env.STRIPE_PLUGIN_KLIPPEL_QC_PRICE_ID,
        ].filter(Boolean); // Remove undefined values

        if (pluginPriceIds.includes(priceId)) {
          productType = 'plugin';
          console.log('Processing plugin subscription:', subscriptionId);

          // Get plugin metadata from session
          const pluginType = session.metadata?.plugin_type;
          const pluginSlug = session.metadata?.plugin_slug;
          const subscriptionType = session.metadata?.subscription_type || 'trial';

          if (!pluginType) {
            console.error('❌ No plugin_type in session metadata');
            throw new Error('Missing plugin_type in session metadata');
          }

          console.log('Plugin subscription details:', {
            pluginType,
            pluginSlug,
            subscriptionType,
            stripeSubscriptionId: subscriptionId
          });

          // Get subscription details to get trial end date
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const now = new Date();
          const trialEndDate = subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : (subscriptionType === 'trial'
              ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
              : null);

          // Check if subscription already exists
          const { data: existingPluginSub } = await dbOperations.supabaseAdmin
            .from('subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('subscription_category', 'plugin')
            .eq('plugin_type', pluginType)
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle();

          if (existingPluginSub) {
            console.log('✅ Plugin subscription already exists:', existingPluginSub.id);
          } else {
            // Create plugin subscription record
            const { data: pluginSubscription, error: pluginSubError } = await dbOperations.supabaseAdmin
              .from('subscriptions')
              .insert({
                user_id: user.id,
                subscription_category: 'plugin',
                plugin_type: pluginType,
                subscription_type: subscriptionType,
                status: 'active',
                stripe_customer_id: customerId,
                stripe_session_id: session.id,
                stripe_subscription_id: subscriptionId,
                trial_start_date: subscriptionType === 'trial' ? now.toISOString() : null,
                trial_end_date: trialEndDate,
              })
              .select()
              .single();

            if (pluginSubError) {
              console.error('❌ Error creating plugin subscription:', pluginSubError);
              throw new Error(`Failed to create plugin subscription: ${pluginSubError.message}`);
            }

            console.log('✅ Plugin subscription created:', pluginSubscription.id);

            // Check if license already exists
            const { data: existingLicense } = await dbOperations.supabaseAdmin
              .from('license_keys')
              .select('*')
              .eq('assigned_to', user.id)
              .eq('license_type', pluginType)
              .eq('status', 'active')
              .maybeSingle();

            if (existingLicense) {
              console.log('✅ Plugin license already exists:', existingLicense.key_code);
            } else {
              // Generate license key for the plugin
              const generateKeyCode = () => {
                const prefix = pluginType === 'klippel_qc' ? 'LYC-KLIPPEL' : 'LYC-APX500';
                const year = new Date().getFullYear();
                const random = Math.random().toString(36).substr(2, 8).toUpperCase();
                return `${prefix}-${year}-${random}`;
              };

              const licenseKey = generateKeyCode();
              const isTrialLicense = subscriptionType === 'trial';
              const timeLimitType = isTrialLicense ? 'trial_30' : 'unlimited';

              // Get plugin-specific features
              const getPluginFeatures = (pluginType: string) => {
                const baseFeatures = [
                  'plugin_access',
                  'data_integration',
                  ...(isTrialLicense ? ['trial_license'] : ['paid_license'])
                ];

                if (pluginType === 'klippel_qc') {
                  return [
                    ...baseFeatures,
                    'klippel_qc_analysis',
                    'klippel_qc_reporting',
                    'klippel_qc_export'
                  ];
                } else if (pluginType === 'apx500') {
                  return [
                    ...baseFeatures,
                    'apx500_measurements',
                    'apx500_analysis',
                    'apx500_export'
                  ];
                }

                return baseFeatures;
              };

              const { data: license, error: licenseError } = await dbOperations.supabaseAdmin
                .from('license_keys')
                .insert({
                  key_code: licenseKey,
                  license_type: pluginType,
                  status: isTrialLicense ? 'trial' : 'active',
                  license_category: 'plugin',
                  tier: 'basic',
                  max_users: 1,
                  max_projects: 100,
                  max_storage_gb: 50,
                  features: getPluginFeatures(pluginType),
                  expires_at: trialEndDate,
                  assigned_to: user.id,
                  assigned_at: now.toISOString(),
                  created_by: user.id,
                  time_limit_type: timeLimitType,
                  custom_trial_days: isTrialLicense ? 30 : null,
                  enabled_plugins: [pluginType], // ✅ Set plugin as enabled
                  plugin_permissions: {},
                  allowed_user_types: ['engineer', 'operator', 'admin'],
                  access_level: 'standard',
                  restrictions: {},
                  license_config: {
                    plugin_type: pluginType,
                    license_category: 'plugin',
                    auto_generated: true,
                    generated_via: 'stripe_checkout_manual',
                    subscription_type: subscriptionType,
                    version: '2.0',
                    stripe_subscription_id: subscriptionId,
                    created_at: now.toISOString()
                  },
                  usage_stats: {
                    generated_at: now.toISOString(),
                    user_email: user.email
                  }
                })
                .select()
                .single();

              if (licenseError) {
                console.error('❌ Error creating plugin license:', licenseError);
                throw new Error(`Failed to create plugin license: ${licenseError.message}`);
              }

              console.log('✅ Plugin license generated:', license.key_code);

              // Auto-create onboarding sessions for the plugin
              try {
                console.log('🎓 Creating onboarding sessions for plugin:', pluginType);
                const onboardingResponse = await fetch(`${request.headers.get('origin') || 'http://localhost:3594'}/api/admin/onboarding/auto-create-sessions`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    user_id: user.id,
                    license_key_id: license.id,
                    trigger_type: 'license_assigned',
                    triggered_by: 'stripe_checkout_manual'
                  })
                });

                if (onboardingResponse.ok) {
                  const onboardingData = await onboardingResponse.json();
                  console.log('✅ Onboarding sessions created:', onboardingData.sessions_created);
                } else {
                  const errorData = await onboardingResponse.json();
                  console.warn('⚠️ Failed to create onboarding sessions:', errorData.error);
                }
              } catch (onboardingError) {
                console.warn('⚠️ Failed to create onboarding sessions:', onboardingError);
                // Don't fail the whole process if onboarding creation fails
              }

              // Create relationship between license and subscription
              const { error: relationshipError } = await dbOperations.supabaseAdmin
                .from('license_subscription_relationships')
                .insert({
                  license_id: license.id,
                  subscription_id: pluginSubscription.id,
                  relationship_type: subscriptionType === 'trial' ? 'trial_conversion' : 'standard',
                  notes: `Auto-created on ${pluginType} Stripe checkout (manual processing)`
                });

              if (relationshipError) {
                console.error('⚠️ Failed to create license-subscription relationship:', relationshipError);
              } else {
                console.log('✅ Created license-subscription relationship');
              }
            }
          }

          console.log('✅ Completed plugin subscription processing');
        } else {
          productType = 'cloud_cluster'; // or other, but for now we assume cluster
        }
      }

      // Note: subscription_id column no longer exists in user_profiles
      // Subscription details are now stored in the subscriptions table
      const { error: profileUpdateError } = await dbOperations.supabaseAdmin
        .from('user_profiles')
        .update({
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileUpdateError) {
        console.error('⚠️ Failed to update user profile subscription status:', profileUpdateError);
        // Don't throw here - subscription is already created, this is just a status update
      } else {
        console.log('✅ Updated user profile subscription status');
      }

      console.log('✅ Completed subscription processing:', subscriptionId, 'Product type:', productType);
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




