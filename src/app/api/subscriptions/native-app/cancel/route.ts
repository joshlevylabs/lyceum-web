import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/subscriptions/native-app/cancel
 * Cancel a native app subscription (trial or paid)
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

    const body = await request.json()
    const { subscription_id, reason } = body

    // If subscription_id is provided, cancel that specific subscription
    // Otherwise, cancel the user's active subscription
    let subscriptionToCancel

    if (subscription_id) {
      // Get specific subscription
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscription_id)
        .eq('user_id', user.id) // Ensure user owns this subscription
        .eq('subscription_category', 'native_app')
        .single()

      if (fetchError || !subscription) {
        return NextResponse.json(
          { error: 'Subscription not found or access denied' },
          { status: 404 }
        )
      }

      subscriptionToCancel = subscription
    } else {
      // Get user's active subscription
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('subscription_category', 'native_app')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fetchError || !subscription) {
        return NextResponse.json(
          { error: 'No active subscription found' },
          { status: 404 }
        )
      }

      subscriptionToCancel = subscription
    }

    // Check if already cancelled
    if (subscriptionToCancel.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Subscription is already cancelled' },
        { status: 400 }
      )
    }

    // Update subscription status to cancelled
    const now = new Date().toISOString()
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: now,
        metadata: {
          ...subscriptionToCancel.metadata,
          cancellation_reason: reason || 'User requested cancellation',
          cancelled_by_user_id: user.id
        }
      })
      .eq('id', subscriptionToCancel.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error cancelling subscription:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel subscription' },
        { status: 500 }
      )
    }

    // Also revoke/deactivate the associated license
    const { data: revokedLicenses, error: licenseUpdateError } = await supabase
      .from('license_keys')
      .update({
        status: 'revoked'
      })
      .eq('assigned_to', user.id)
      .eq('license_type', 'main-application')
      .eq('status', 'active')
      .select()

    if (licenseUpdateError) {
      console.error('Error revoking license:', licenseUpdateError)
      // Don't fail the request - subscription is already cancelled
    } else {
      console.log('Revoked licenses:', revokedLicenses?.length || 0, 'licenses')
    }

    console.log('Subscription cancelled:', {
      subscription_id: subscriptionToCancel.id,
      user_id: user.id,
      subscription_type: subscriptionToCancel.subscription_type,
      cancelled_at: now,
      licenses_revoked: revokedLicenses?.length || 0
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription: {
        id: updatedSubscription.id,
        subscription_type: updatedSubscription.subscription_type,
        status: updatedSubscription.status,
        cancelled_at: updatedSubscription.cancelled_at
      }
    })

  } catch (error) {
    console.error('Error in subscription cancellation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
