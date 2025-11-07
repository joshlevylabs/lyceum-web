import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-direct'
import { getCustomerByEmail, stripe } from '@/lib/stripe'

/**
 * GET /api/payment-methods
 * Returns user's payment methods from Stripe
 */
export async function GET(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user profile with stripe_customer_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customer = null
    let customerId = profile?.stripe_customer_id

    // Try to get customer by stored ID first
    if (customerId) {
      try {
        customer = await stripe.customers.retrieve(customerId)
      } catch (stripeError) {
        console.error('Failed to retrieve customer by stored ID:', stripeError)
        customer = null
      }
    }

    // Fallback: search by email
    if (!customer) {
      customer = await getCustomerByEmail(user.email)
      customerId = customer?.id
    }

    if (!customer) {
      return NextResponse.json({
        success: true,
        hasPaymentMethod: false,
        paymentMethods: []
      })
    }

    // Get payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card'
    })

    // Format payment methods for frontend
    const formattedMethods = paymentMethods.data.map(method => ({
      id: method.id,
      type: method.type,
      last4: method.card?.last4 || '',
      exp_month: method.card?.exp_month || 0,
      exp_year: method.card?.exp_year || 0,
      brand: method.card?.brand || '',
      is_default: customer.invoice_settings?.default_payment_method === method.id
    }))

    return NextResponse.json({
      success: true,
      hasPaymentMethod: formattedMethods.length > 0,
      paymentMethods: formattedMethods
    })

  } catch (error: any) {
    console.error('Payment methods API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment methods', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/payment-methods
 * Add a new payment method (via Stripe Checkout or Setup Intent)
 * This typically returns a checkout URL for the user to complete payment setup
 */
export async function POST(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get or create Stripe customer
    let customer = await getCustomerByEmail(user.email)

    if (!customer) {
      // Create new Stripe customer
      customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id
        }
      })

      // Store customer ID in user profile
      await supabaseAdmin
        .from('user_profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', user.id)
    }

    // Create a SetupIntent for adding payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card']
    })

    return NextResponse.json({
      success: true,
      clientSecret: setupIntent.client_secret,
      customerId: customer.id
    })

  } catch (error: any) {
    console.error('Add payment method API error:', error)
    return NextResponse.json(
      { error: 'Failed to setup payment method', details: error.message },
      { status: 500 }
    )
  }
}
