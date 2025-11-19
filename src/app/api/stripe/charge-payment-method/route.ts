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
      subscription_type: subscription_type || 'paid',
      status: 'active',
      amount_paid_cents: amount,
      currency: 'usd',
      stripe_payment_intent_id: paymentIntent.id,
      stripe_customer_id: customerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { error: subError } = await supabase
      .from('user_subscriptions_native_app')
      .insert([subscriptionData])

    if (subError) {
      console.error('Error creating subscription record:', subError)
      // Don't fail the whole operation - payment was successful
    }

    return NextResponse.json({
      success: true,
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount
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
