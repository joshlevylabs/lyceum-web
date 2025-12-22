import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { stripe } from '@/lib/stripe';
import * as dbOperations from '@/lib/supabase-direct';

/**
 * Create a Stripe Checkout session for plugin trial
 * POST /api/stripe/create-plugin-trial-checkout
 */
export async function POST(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { plugin_slug, plugin_type } = body;

    if (!plugin_slug || !plugin_type) {
      return NextResponse.json(
        { error: 'Plugin slug and type are required' },
        { status: 400 }
      );
    }

    console.log('Creating Stripe Checkout session for plugin trial:', {
      userId: user.id,
      userEmail: user.email,
      plugin_slug,
      plugin_type
    });

    // Check if user already has a trial for this plugin (prevent duplicate trials)
    const { data: previousTrials, error: trialCheckError } = await dbOperations.supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('subscription_category', 'plugin')
      .eq('plugin_type', plugin_type)
      .eq('subscription_type', 'trial');

    if (trialCheckError) {
      console.error('Error checking for previous trials:', trialCheckError);
    }

    // If user has ANY previous trial (started, completed, or cancelled), they cannot start another
    if (previousTrials && previousTrials.length > 0) {
      console.log('❌ User has already used their trial for this plugin:', {
        userId: user.id,
        plugin_type,
        previousTrials: previousTrials.length
      });
      return NextResponse.json(
        {
          error: 'You have already used your free trial for this plugin. Please subscribe to continue.',
          can_use_trial: false,
          previous_trial_count: previousTrials.length
        },
        { status: 400 }
      );
    }

    // Get plugin price ID from environment variables
    // Plugin price IDs are stored as STRIPE_PLUGIN_<PLUGIN_TYPE>_PRICE_ID
    const pluginPriceMap: Record<string, string | undefined> = {
      'apx500': process.env.STRIPE_PLUGIN_APX500_PRICE_ID,
      'klippel_qc': process.env.STRIPE_PLUGIN_KLIPPEL_QC_PRICE_ID,
      'preen_psu': process.env.STRIPE_PLUGIN_PREEN_PSU_PRICE_ID,
      'keysight_daq': process.env.STRIPE_PLUGIN_KEYSIGHT_DAQ_PRICE_ID,
      'kwikwai': process.env.STRIPE_PLUGIN_KWIKWAI_PRICE_ID,
      'grl_pd': process.env.STRIPE_PLUGIN_GRL_PD_PRICE_ID,
      'sifos_poe': process.env.STRIPE_PLUGIN_SIFOS_POE_PRICE_ID,
      'time_machines': process.env.STRIPE_PLUGIN_TIME_MACHINES_PRICE_ID,
    };

    const priceId = pluginPriceMap[plugin_type];

    if (!priceId) {
      console.error(`❌ Stripe price ID not configured for plugin: ${plugin_type}`);
      return NextResponse.json(
        { error: `Plugin subscription price not configured for ${plugin_type}. Please contact support.` },
        { status: 500 }
      );
    }

    // Create Stripe Checkout session for plugin trial (subscription with trial period)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      metadata: {
        userId: user.id,
        plugin_type,
        plugin_slug,
        subscription_type: 'trial',
        product_type: 'plugin'
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 30, // 30-day trial
        metadata: {
          userId: user.id,
          plugin_type,
          plugin_slug,
          subscription_type: 'trial',
          product_type: 'plugin'
        },
      },
      success_url: `${request.headers.get('origin')}/plugins/${plugin_slug}/trial-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/plugins/${plugin_slug}?cancelled=true`,
      allow_promotion_codes: true,
    });

    console.log('✅ Stripe Checkout session created for plugin trial:', {
      sessionId: session.id,
      checkoutUrl: session.url,
      plugin_type
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
    });

  } catch (error: any) {
    console.error('❌ Error creating Stripe Checkout session for plugin trial:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    );
  }
}
