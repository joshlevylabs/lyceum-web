import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/stripe/charges
 * Fetch all charges from Stripe for the authenticated user's customer
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
        charges: [],
        message: 'No Stripe customer found'
      })
    }

    const customerId = profile.stripe_customer_id

    // Fetch charges from Stripe
    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 100, // Get last 100 charges
    })

    // Format charges for frontend
    const formattedCharges = charges.data.map(charge => ({
      id: charge.id,
      amount: charge.amount,
      amount_captured: charge.amount_captured,
      amount_refunded: charge.amount_refunded,
      currency: charge.currency,
      status: charge.status,
      paid: charge.paid,
      refunded: charge.refunded,
      description: charge.description,
      receipt_url: charge.receipt_url,
      receipt_email: charge.receipt_email,
      created: charge.created,
      payment_method_details: {
        type: charge.payment_method_details?.type,
        card: charge.payment_method_details?.card ? {
          brand: charge.payment_method_details.card.brand,
          last4: charge.payment_method_details.card.last4,
          exp_month: charge.payment_method_details.card.exp_month,
          exp_year: charge.payment_method_details.card.exp_year,
        } : null,
      },
      metadata: charge.metadata,
    }))

    return NextResponse.json({
      success: true,
      charges: formattedCharges,
      total: formattedCharges.length,
    })

  } catch (error: any) {
    console.error('Error fetching Stripe charges:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch charges' },
      { status: 500 }
    )
  }
}
