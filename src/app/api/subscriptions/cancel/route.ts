import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

// POST /api/subscriptions/cancel - Cancel a subscription
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const body = await request.json()
    const { subscription_id } = body

    if (!subscription_id) {
      return NextResponse.json({
        error: 'Missing required field: subscription_id'
      }, { status: 400 })
    }

    // Get subscription from database
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .eq('user_id', user.id) // Ensure user owns this subscription
      .single()

    if (subError || !subscription) {
      return NextResponse.json({
        error: 'Subscription not found or access denied'
      }, { status: 404 })
    }

    // Check if subscription is already cancelled or inactive
    if (subscription.status === 'cancelled' || subscription.status === 'inactive') {
      return NextResponse.json({
        error: 'Subscription is already cancelled or inactive'
      }, { status: 400 })
    }

    // Cancel the Stripe subscription (if exists)
    let stripeCancelledAt = null
    if (subscription.stripe_subscription_id) {
      try {
        const stripeSubscription = await stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          {
            cancel_at_period_end: true // Cancel at end of billing period (no refund)
          }
        )

        stripeCancelledAt = stripeSubscription.cancel_at
          ? new Date(stripeSubscription.cancel_at * 1000).toISOString()
          : null

        console.log('✅ Stripe subscription set to cancel at period end:', subscription.stripe_subscription_id)
      } catch (stripeError) {
        console.error('Error cancelling Stripe subscription:', stripeError)
        return NextResponse.json({
          error: 'Failed to cancel subscription in Stripe',
          details: stripeError instanceof Error ? stripeError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // Update subscription status in database
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription_id)

    if (updateError) {
      console.error('Error updating subscription status:', updateError)
      return NextResponse.json({
        error: 'Failed to update subscription status',
        details: updateError.message
      }, { status: 500 })
    }

    console.log('✅ Subscription cancelled successfully:', subscription_id)

    // Note: License remains active until expiration date
    // License status is NOT changed - it will expire naturally

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully. Your license will remain active until the expiration date.',
      subscription: {
        id: subscription_id,
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        stripe_cancel_at: stripeCancelledAt
      }
    })

  } catch (error) {
    console.error('Unexpected error cancelling subscription:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
