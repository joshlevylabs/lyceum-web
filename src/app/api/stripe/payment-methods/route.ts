import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/stripe/payment-methods
 * Fetch payment methods directly from Stripe for the authenticated user's customer
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token or user not found' },
        { status: 401 }
      )
    }

    // Get user profile to find Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.stripe_customer_id) {
      console.log('No Stripe customer ID found for user:', user.id)
      return NextResponse.json({
        success: true,
        payment_methods: [],
        message: 'No Stripe customer found'
      })
    }

    const customerId = profile.stripe_customer_id

    // Fetch payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card', // Can be extended to include other types
    })

    // Get customer to check default payment method
    const customer = await stripe.customers.retrieve(customerId) as any

    // Format payment methods for frontend
    const formattedPaymentMethods = paymentMethods.data.map(pm => ({
      id: pm.id,
      type: pm.type,
      is_default: customer.invoice_settings?.default_payment_method === pm.id,
      card: pm.card ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
        funding: pm.card.funding,
        country: pm.card.country,
      } : null,
      billing_details: {
        email: pm.billing_details.email,
        name: pm.billing_details.name,
        phone: pm.billing_details.phone,
        address: pm.billing_details.address,
      },
      created: pm.created,
    }))

    return NextResponse.json({
      success: true,
      payment_methods: formattedPaymentMethods,
      total: formattedPaymentMethods.length,
    })

  } catch (error: any) {
    console.error('Error fetching Stripe payment methods:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment methods' },
      { status: 500 }
    )
  }
}
