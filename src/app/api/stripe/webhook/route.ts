import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import * as dbOperations from '@/lib/supabase-direct';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature') as string;

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Stripe webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as any);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as any);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as any);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as any);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as any);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as any);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: any) {
  console.log('Checkout completed:', session.id);

  const userId = session.metadata.userId;
  const clusterId = session.metadata.clusterId;
  const productType = session.metadata.product_type;

  if (userId) {
    // Handle plugin checkout (plugin trials)
    if (productType === 'plugin') {
      const pluginType = session.metadata.plugin_type;
      const pluginSlug = session.metadata.plugin_slug;
      const subscriptionType = session.metadata.subscription_type;

      console.log('Processing plugin checkout:', {
        userId,
        pluginType,
        pluginSlug,
        subscriptionType,
        stripeSubscriptionId: session.subscription
      });

      // Calculate trial end date (30 days from now for trials)
      const now = new Date();
      const trialStartDate = subscriptionType === 'trial' ? now.toISOString() : null;
      const trialEndDate = subscriptionType === 'trial'
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Create plugin subscription record
      const { data: pluginSubscription, error: pluginSubError } = await dbOperations.supabaseAdmin
        .from('plugin_subscriptions')
        .insert({
          user_id: userId,
          plugin_type: pluginType,
          subscription_type: subscriptionType,
          status: 'active',
          stripe_customer_id: session.customer,
          stripe_session_id: session.id,
          stripe_subscription_id: session.subscription as string || null,
          trial_start_date: trialStartDate,
          trial_end_date: trialEndDate,
        })
        .select()
        .single();

      if (pluginSubError) {
        console.error('Error creating plugin subscription:', pluginSubError);
      } else {
        console.log('✅ Plugin subscription created:', pluginSubscription.id);

        // Generate license key for the plugin
        const licenseKey = `PLUGIN-${pluginType.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        const features = subscriptionType === 'trial'
          ? ['plugin_license', 'trial_license', pluginType]
          : ['plugin_license', 'paid_license', pluginType];

        const { data: license, error: licenseError } = await dbOperations.supabaseAdmin
          .from('license_keys')
          .insert({
            key_code: licenseKey,
            license_type: 'plugin',
            assigned_to: userId,
            status: 'active',
            expires_at: trialEndDate, // Will be null for paid subscriptions
            time_limit_type: subscriptionType === 'trial' ? 'trial' : 'unlimited',
            custom_trial_days: subscriptionType === 'trial' ? 30 : null,
            features: features,
            license_config: {
              plugin_type: pluginType,
              plugin_slug: pluginSlug,
              subscription_type: subscriptionType,
              stripe_subscription_id: session.subscription,
            },
          })
          .select()
          .single();

        if (licenseError) {
          console.error('Error creating plugin license:', licenseError);
        } else {
          console.log('✅ Plugin license generated:', license.key_code);
        }
      }

      // Save payment method if available
      if (session.setup_intent) {
        try {
          const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent as string);
          if (setupIntent.payment_method) {
            const paymentMethod = await stripe.paymentMethods.retrieve(setupIntent.payment_method as string);

            if (paymentMethod.card) {
              await dbOperations.supabaseAdmin
                .from('stored_payment_methods')
                .upsert({
                  user_id: userId,
                  card_last_four: paymentMethod.card.last4,
                  card_brand: paymentMethod.card.brand,
                  card_exp_month: paymentMethod.card.exp_month,
                  card_exp_year: paymentMethod.card.exp_year,
                  billing_zip: paymentMethod.billing_details?.address?.postal_code || '',
                  is_default: true,
                  updated_at: new Date().toISOString(),
                }, {
                  onConflict: 'user_id,card_last_four,card_exp_month,card_exp_year',
                  ignoreDuplicates: false
                });

              console.log('✅ Payment method saved for plugin trial user:', userId);
            }
          }
        } catch (error) {
          console.error('Error saving payment method from setup intent:', error);
        }
      }

      return; // Exit early for plugin checkouts
    }

    // Handle native app checkout (existing logic)
    // Update user payment status
    await dbOperations.supabaseAdmin
      .from('user_profiles')
      .update({
        stripe_customer_id: session.customer,
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Update user_subscriptions_native_app with Stripe data
    await dbOperations.supabaseAdmin
      .from('user_subscriptions_native_app')
      .update({
        stripe_customer_id: session.customer,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string || null,
        stripe_subscription_id: session.subscription as string || null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'active');

    // If payment method is available, save it
    if (session.payment_intent) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
        if (paymentIntent.payment_method) {
          const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);

          if (paymentMethod.card) {
            // Save payment method to stored_payment_methods table
            await dbOperations.supabaseAdmin
              .from('stored_payment_methods')
              .upsert({
                user_id: userId,
                card_last_four: paymentMethod.card.last4,
                card_brand: paymentMethod.card.brand,
                card_exp_month: paymentMethod.card.exp_month,
                card_exp_year: paymentMethod.card.exp_year,
                billing_zip: paymentMethod.billing_details?.address?.postal_code || '',
                is_default: true,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id,card_last_four,card_exp_month,card_exp_year',
                ignoreDuplicates: false
              });

            console.log('✅ Payment method saved for user:', userId);
          }
        }
      } catch (error) {
        console.error('Error saving payment method:', error);
        // Don't fail the whole webhook if payment method save fails
      }
    }

    // Create payment transaction record
    if (session.amount_total) {
      try {
        await dbOperations.supabaseAdmin
          .from('payment_transactions')
          .insert({
            user_id: userId,
            subscription_type: 'paid',
            amount: session.amount_total / 100, // Convert cents to dollars
            currency: session.currency?.toUpperCase() || 'USD',
            status: 'completed',
            transaction_id: session.id,
            processed_at: new Date().toISOString(),
          });

        console.log('✅ Payment transaction recorded for user:', userId);
      } catch (error) {
        console.error('Error recording payment transaction:', error);
        // Don't fail the whole webhook if transaction record fails
      }
    }

    // If cluster specified, update cluster billing
    if (clusterId) {
      await dbOperations.supabaseAdmin
        .from('database_clusters')
        .update({
          billing_status: 'active',
          stripe_subscription_id: session.subscription,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clusterId);
    }
  }
}

async function handleSubscriptionCreated(subscription: any) {
  console.log('Subscription created:', subscription.id);
  
  const customer = await stripe.customers.retrieve(subscription.customer);
  if (customer && !customer.deleted && customer.metadata.userId) {
    await dbOperations.supabaseAdmin
      .from('user_profiles')
      .update({
        subscription_id: subscription.id,
        subscription_status: subscription.status,
        plan_name: subscription.items.data[0]?.price?.lookup_key || 'unknown',
        updated_at: new Date().toISOString(),
      })
      .eq('id', customer.metadata.userId);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log('Subscription updated:', subscription.id);

  const customer = await stripe.customers.retrieve(subscription.customer);
  if (customer && !customer.deleted && customer.metadata.userId) {
    const userId = customer.metadata.userId;

    // Check if subscription moved from trial to active (trial period ended)
    const previousAttributes = subscription.previous_attributes;
    const wasTrialing = previousAttributes?.status === 'trialing';
    const isNowActive = subscription.status === 'active';

    // Check if this is a plugin subscription
    const productType = subscription.metadata?.product_type;

    if (productType === 'plugin') {
      // Handle plugin subscription updates
      const pluginType = subscription.metadata?.plugin_type;

      console.log('Updating plugin subscription:', {
        userId,
        pluginType,
        subscriptionId: subscription.id,
        status: subscription.status,
        wasTrialing,
        isNowActive
      });

      // Update plugin subscription status
      await dbOperations.supabaseAdmin
        .from('plugin_subscriptions')
        .update({
          status: subscription.status,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      // Handle trial-to-paid conversion for plugins
      if (wasTrialing && isNowActive) {
        console.log('🎉 Plugin trial period ended, converting to paid subscription for user:', userId);

        // Update plugin subscription to paid
        await dbOperations.supabaseAdmin
          .from('plugin_subscriptions')
          .update({
            subscription_type: 'paid',
            status: 'active',
            trial_end_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        // Update plugin license to remove expiration date
        const { data: pluginLicense, error: pluginLicenseError } = await dbOperations.supabaseAdmin
          .from('license_keys')
          .select('*')
          .eq('assigned_to', userId)
          .eq('license_type', 'plugin')
          .eq('status', 'active')
          .contains('license_config', { stripe_subscription_id: subscription.id })
          .maybeSingle();

        if (pluginLicense) {
          const updatedFeatures = pluginLicense.features.filter((f: string) => f !== 'trial_license');
          if (!updatedFeatures.includes('paid_license')) {
            updatedFeatures.push('paid_license');
          }

          await dbOperations.supabaseAdmin
            .from('license_keys')
            .update({
              expires_at: null, // Remove expiration - now unlimited
              time_limit_type: 'unlimited',
              custom_trial_days: null,
              features: updatedFeatures,
              license_config: {
                ...pluginLicense.license_config,
                subscription_type: 'paid',
                trial_converted_at: new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', pluginLicense.id);

          console.log('✅ Plugin license converted from trial to paid:', pluginLicense.key_code);
        } else if (pluginLicenseError) {
          console.error('Error finding plugin license during trial conversion:', pluginLicenseError);
        } else {
          console.warn('⚠️ No plugin license found to convert for user:', userId);
        }
      }

      return; // Exit early for plugin subscriptions
    }

    // Handle native app subscription updates (existing logic)
    // Update user profile with subscription status
    await dbOperations.supabaseAdmin
      .from('user_profiles')
      .update({
        subscription_status: subscription.status,
        plan_name: subscription.items.data[0]?.price?.lookup_key || 'unknown',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (wasTrialing && isNowActive) {
      console.log('🎉 Trial period ended, converting to paid subscription for user:', userId);

      // Update user_subscriptions_native_app to reflect paid status
      await dbOperations.supabaseAdmin
        .from('user_subscriptions_native_app')
        .update({
          subscription_type: 'paid',
          status: 'active',
          trial_end_date: new Date().toISOString(), // Mark trial as ended
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      // Update license to remove expiration date (convert from trial to paid)
      const { data: license, error: licenseError } = await dbOperations.supabaseAdmin
        .from('license_keys')
        .select('*')
        .eq('assigned_to', userId)
        .eq('license_type', 'main-application')
        .eq('status', 'active')
        .maybeSingle();

      if (license) {
        // Remove expiration date and update to paid license
        const updatedFeatures = license.features.filter((f: string) => f !== 'trial_license');
        if (!updatedFeatures.includes('paid_license')) {
          updatedFeatures.push('paid_license');
        }

        await dbOperations.supabaseAdmin
          .from('license_keys')
          .update({
            expires_at: null, // Remove expiration - now it's unlimited
            time_limit_type: 'unlimited',
            custom_trial_days: null,
            features: updatedFeatures,
            license_config: {
              ...license.license_config,
              subscription_type: 'paid',
              trial_converted_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', license.id);

        console.log('✅ License converted from trial to paid:', license.key_code);
      } else if (licenseError) {
        console.error('Error finding license during trial conversion:', licenseError);
      } else {
        console.warn('⚠️ No license found to convert for user:', userId);
      }
    }
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('Subscription deleted:', subscription.id);

  const customer = await stripe.customers.retrieve(subscription.customer);
  if (customer && !customer.deleted && customer.metadata.userId) {
    const userId = customer.metadata.userId;
    const productType = subscription.metadata?.product_type;

    // Handle plugin subscription cancellation
    if (productType === 'plugin') {
      const pluginType = subscription.metadata?.plugin_type;

      console.log('Plugin subscription cancelled:', {
        userId,
        pluginType,
        subscriptionId: subscription.id
      });

      // Update plugin subscription status
      await dbOperations.supabaseAdmin
        .from('plugin_subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      // Expire plugin license
      const { data: pluginLicense } = await dbOperations.supabaseAdmin
        .from('license_keys')
        .select('*')
        .eq('assigned_to', userId)
        .eq('license_type', 'plugin')
        .eq('status', 'active')
        .contains('license_config', { stripe_subscription_id: subscription.id })
        .maybeSingle();

      if (pluginLicense) {
        await dbOperations.supabaseAdmin
          .from('license_keys')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('id', pluginLicense.id);

        console.log('✅ Plugin license expired:', pluginLicense.key_code);
      }

      console.log('✅ Plugin subscription cancelled for user:', userId);
      return; // Exit early for plugin subscriptions
    }

    // Handle native app subscription cancellation (existing logic)
    // Update user subscription status
    await dbOperations.supabaseAdmin
      .from('user_profiles')
      .update({
        subscription_status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Expire all active licenses for this user
    const { data: licenses, error: licensesError } = await dbOperations.supabaseAdmin
      .from('licenses')
      .select('id, license_key')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!licensesError && licenses && licenses.length > 0) {
      // Set licenses to expired status
      await dbOperations.supabaseAdmin
        .from('licenses')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      console.log(`✅ Expired ${licenses.length} license(s) for user:`, userId);
    }

    // Update native app subscription status
    await dbOperations.supabaseAdmin
      .from('user_subscriptions_native_app')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('stripe_subscription_id', subscription.id);

    console.log('✅ Subscription cancelled and licenses expired for user:', userId);
  }
}

async function handlePaymentSucceeded(invoice: any) {
  console.log('Payment succeeded:', invoice.id);

  // Get customer information
  const customer = await stripe.customers.retrieve(invoice.customer);
  if (customer && !customer.deleted && customer.metadata.userId) {
    const userId = customer.metadata.userId;

    // Record payment transaction for payment history
    try {
      const amountPaidCents = invoice.amount_paid;
      const amountPaid = amountPaidCents / 100; // Convert to dollars

      await dbOperations.supabaseAdmin
        .from('payment_transactions')
        .insert({
          user_id: userId,
          subscription_type: 'paid',
          amount: amountPaid,
          currency: invoice.currency?.toUpperCase() || 'USD',
          status: 'completed',
          transaction_id: invoice.id,
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: invoice.subscription as string || null,
          processed_at: new Date(invoice.created * 1000).toISOString(),
          created_at: new Date().toISOString(),
        });

      console.log(`✅ Payment transaction recorded: $${amountPaid} for user:`, userId);

      // Update user_subscriptions_native_app with latest payment amount
      if (invoice.subscription) {
        await dbOperations.supabaseAdmin
          .from('user_subscriptions_native_app')
          .update({
            amount_paid_cents: amountPaidCents,
            last_payment_date: new Date(invoice.created * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', invoice.subscription as string);

        console.log('✅ Updated subscription with payment amount');
      }
    } catch (error) {
      console.error('Error recording payment transaction:', error);
      // Don't fail the webhook if transaction recording fails
    }
  }
}

async function handlePaymentFailed(invoice: any) {
  console.log('Payment failed:', invoice.id);
  // Could send payment failure notifications
}
