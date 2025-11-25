import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/stripe/refund
 * Create a refund REQUEST for a specific charge (does not process refund immediately)
 * Refunds require admin approval before being processed in Stripe
 */
export async function POST(request: NextRequest) {
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

    // Get user profile to check role and customer ID
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { charge_id, amount, reason } = body

    if (!charge_id) {
      return NextResponse.json(
        { error: 'charge_id is required' },
        { status: 400 }
      )
    }

    // Retrieve the charge to verify ownership and get details
    const charge = await stripe.charges.retrieve(charge_id)

    // Check if charge belongs to user's customer
    const isOwnCharge = charge.customer === profile.stripe_customer_id

    if (!isOwnCharge) {
      return NextResponse.json(
        { error: 'Unauthorized to request refund for this charge' },
        { status: 403 }
      )
    }

    // Check if charge is already fully refunded
    if (charge.refunded) {
      return NextResponse.json(
        { error: 'Charge is already fully refunded' },
        { status: 400 }
      )
    }

    // Check if there's already a pending refund request for this charge
    const { data: existingRequest, error: existingError } = await supabase
      .from('refund_requests')
      .select('id, status')
      .eq('charge_id', charge_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingRequest) {
      return NextResponse.json(
        { error: 'A refund request for this charge is already pending' },
        { status: 400 }
      )
    }

    // Determine refund amount (partial or full)
    const refundAmount = (amount && amount < charge.amount) ? amount : charge.amount

    // Create refund request in database (does NOT process refund in Stripe yet)
    const { data: refundRequest, error: insertError } = await supabase
      .from('refund_requests')
      .insert({
        user_id: user.id,
        charge_id: charge_id,
        refund_id: null, // Will be populated when admin approves
        amount_refunded: refundAmount,
        currency: charge.currency,
        status: 'pending',
        reason: reason || null,
        requested_by: user.id,
        approved_by: null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create refund request:', insertError)
      return NextResponse.json(
        { error: 'Failed to create refund request' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      request: {
        id: refundRequest.id,
        charge_id: charge_id,
        amount: refundAmount,
        currency: charge.currency,
        status: 'pending',
        reason: reason || null,
        created_at: refundRequest.created_at,
      },
      message: 'Refund request submitted successfully. An administrator will review your request.'
    })

  } catch (error: any) {
    console.error('Error processing refund request:', error)

    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to process refund request' },
      { status: 500 }
    )
  }
}
