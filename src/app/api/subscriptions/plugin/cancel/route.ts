import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/subscriptions/plugin/cancel
 * Cancel a plugin subscription (marks as cancelled but keeps license valid until expiration)
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
    const { plugin_type, cancellation_reason } = body

    if (!plugin_type || !['klippel_qc', 'apx500'].includes(plugin_type)) {
      return NextResponse.json(
        { error: 'Invalid or missing plugin_type' },
        { status: 400 }
      )
    }

    // Get the active subscription for this plugin
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('subscription_category', 'plugin')
      .eq('plugin_type', plugin_type)
      .eq('status', 'active')
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'No active subscription found for this plugin' },
        { status: 404 }
      )
    }

    // Mark subscription as cancelled
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: cancellation_reason || null
      })
      .eq('id', subscription.id)

    if (updateError) {
      console.error('Error cancelling plugin subscription:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel subscription' },
        { status: 500 }
      )
    }

    console.log('Plugin subscription cancelled:', {
      user_id: user.id,
      plugin_type,
      subscription_id: subscription.id
    })

    // Calculate remaining days
    let remainingMessage = ''
    if (subscription.subscription_type === 'trial' && subscription.trial_end_date) {
      const now = new Date()
      const trialEnd = new Date(subscription.trial_end_date)
      const remainingDays = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

      if (remainingDays > 0) {
        remainingMessage = `You will continue to have access to ${plugin_type} for the remaining ${remainingDays} day${remainingDays !== 1 ? 's' : ''} of your trial period.`
      }
    } else if (subscription.subscription_type === 'paid') {
      remainingMessage = `You will continue to have access to ${plugin_type} as it is a lifetime purchase.`
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      remainingMessage,
      subscription: {
        ...subscription,
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in plugin subscription cancellation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
