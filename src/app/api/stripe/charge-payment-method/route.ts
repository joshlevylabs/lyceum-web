import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authenticated user
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { amount, description, subscription_type } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    console.log('💳 Charging existing payment method:', {
      user_id: user.id,
      email: user.email,
      amount,
      description
    })

    // Get user's Stripe customer ID
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!userProfile?.stripe_customer_id) {
      return NextResponse.json({
        error: 'No Stripe customer found. Please add a payment method first.'
      }, { status: 400 })
    }

    const customerId = userProfile.stripe_customer_id

    // Get customer's default payment method
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer

    if (!customer.invoice_settings?.default_payment_method) {
      return NextResponse.json({
        error: 'No default payment method found. Please add a payment method first.'
      }, { status: 400 })
    }

    const paymentMethodId = customer.invoice_settings.default_payment_method as string

    // Create and confirm payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      description: description || `Payment for ${subscription_type} subscription`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        subscription_type: subscription_type || 'paid'
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    })

    console.log('✅ Payment successful:', {
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount
    })

    // Create subscription record in database
    const subscriptionData = {
      user_id: user.id,
      subscription_category: 'native_app',
      plugin_type: null,
      subscription_type: subscription_type || 'paid',
      status: 'active',
      amount_paid_cents: amount,
      currency: 'usd',
      stripe_payment_intent_id: paymentIntent.id,
      stripe_customer_id: customerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert([subscriptionData])
      .select()
      .single()

    if (subError) {
      console.error('Error creating subscription record:', subError)
      // Don't fail the whole operation - payment was successful
    }

    // Auto-create license for the subscription
    let createdLicense = null
    if (subscription) {
      try {
        // Get user's company to determine brand type
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('company')
          .eq('id', user.id)
          .single()

        const centcomCompanies = [
          'centcom',
          'sonance',
          'blaze',
          'iport',
          'danainnovations',
          'dana innovations',
          'james',
          'trufig'
        ]

        const companyLower = userProfile?.company?.toLowerCase() || ''
        const isCentcom = centcomCompanies.some(name => companyLower.includes(name))
        const brandType = isCentcom ? 'centcom' : 'lyceum'

        // Generate license key
        const generateKeyCode = () => {
          const prefix = `LYC-APP-${new Date().getFullYear()}`
          const random = Math.random().toString(36).substr(2, 8).toUpperCase()
          return `${prefix}-${random}`
        }

        const keyCode = generateKeyCode()
        const subType = subscription_type || 'paid'
        const isTrialLicense = subType === 'trial'
        const expiresAt = isTrialLicense
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null

        const timeLimitType = isTrialLicense ? 'trial_30' : 'unlimited'
        const customTrialDays = isTrialLicense ? 30 : null

        // Create license
        const licenseData = {
          key_code: keyCode,
          license_type: 'main-application',
          status: isTrialLicense ? 'trial' : 'active',
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
            ...(isTrialLicense ? ['trial_license'] : ['paid_license'])
          ],
          expires_at: expiresAt,
          assigned_to: user.id,
          assigned_at: new Date().toISOString(),
          created_by: user.id,
          time_limit_type: timeLimitType,
          custom_trial_days: customTrialDays,
          trial_extension_reason: null,
          enabled_plugins: [],
          plugin_permissions: {},
          allowed_user_types: ['engineer', 'operator', 'admin'],
          access_level: 'standard',
          restrictions: {},
          license_config: {
            brand_type: brandType,
            auto_generated: true,
            generated_via: 'charge_payment_method',
            subscription_type: subType,
            version: '2.0',
            created_at: new Date().toISOString()
          },
          usage_stats: {
            generated_at: new Date().toISOString(),
            user_email: user.email
          }
        }

        const { data: license, error: licenseError } = await supabase
          .from('license_keys')
          .insert([licenseData])
          .select()
          .single()

        if (licenseError) {
          console.error('⚠️ Failed to auto-create license:', licenseError)
        } else {
          createdLicense = license

          // Create relationship between license and subscription
          await supabase
            .from('license_subscription_relationships')
            .insert({
              license_id: license.id,
              subscription_id: subscription.id,
              relationship_type: subType === 'trial' ? 'trial_conversion' : 'standard',
              notes: 'Auto-created on payment charge'
            })

          console.log('✅ Auto-created license via charge-payment-method:', {
            license_id: license.id,
            key_code: license.key_code,
            subscription_id: subscription.id
          })
        }
      } catch (licenseError) {
        console.error('⚠️ Failed to auto-create license:', licenseError)
      }
    }

    return NextResponse.json({
      success: true,
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      license: createdLicense ? {
        key_code: createdLicense.key_code,
        license_type: createdLicense.license_type,
        status: createdLicense.status,
        expires_at: createdLicense.expires_at
      } : null
    })

  } catch (error: any) {
    console.error('Payment error:', error)

    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json({
        error: 'Card declined',
        details: error.message
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to process payment',
      details: error.message
    }, { status: 500 })
  }
}
