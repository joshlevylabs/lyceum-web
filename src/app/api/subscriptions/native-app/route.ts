import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: Check subscription status
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

    // Check for active subscription
    const { data: subscription, error: subError } = await supabase
      .from('native_app_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      console.error('Error checking subscription:', subError)
      return NextResponse.json(
        { error: 'Failed to check subscription status' },
        { status: 500 }
      )
    }

    // Check if trial has expired
    if (subscription && subscription.subscription_type === 'trial' && subscription.expires_at) {
      const expiresAt = new Date(subscription.expires_at)
      const now = new Date()

      if (now > expiresAt) {
        // Mark as expired
        await supabase
          .from('native_app_subscriptions')
          .update({ status: 'expired' })
          .eq('id', subscription.id)

        return NextResponse.json({
          hasSubscription: false,
          subscription: null,
          message: 'Trial subscription has expired'
        })
      }
    }

    return NextResponse.json({
      hasSubscription: !!subscription,
      subscription: subscription || null
    })

  } catch (error) {
    console.error('Error in subscription check:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create new subscription
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
    const { subscription_type } = body

    if (!subscription_type || !['trial', 'paid'].includes(subscription_type)) {
      return NextResponse.json(
        { error: 'Invalid subscription type. Must be "trial" or "paid"' },
        { status: 400 }
      )
    }

    // Check if user already has an active subscription
    const { data: existingSubscription } = await supabase
      .from('native_app_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (existingSubscription) {
      return NextResponse.json(
        {
          error: 'You already have an active subscription',
          subscription: existingSubscription
        },
        { status: 400 }
      )
    }

    // Check if user already had a trial
    if (subscription_type === 'trial') {
      const { data: previousTrial } = await supabase
        .from('native_app_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('subscription_type', 'trial')
        .single()

      if (previousTrial) {
        return NextResponse.json(
          {
            error: 'You have already used your trial. Please subscribe to a paid plan.',
            can_use_trial: false
          },
          { status: 400 }
        )
      }
    }

    // Calculate expiration date for trial (30 days from now)
    const expiresAt = subscription_type === 'trial'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null

    // Create subscription
    const { data: subscription, error: createError } = await supabase
      .from('native_app_subscriptions')
      .insert({
        user_id: user.id,
        subscription_type,
        status: 'active',
        expires_at: expiresAt
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating subscription:', createError)
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subscription,
      message: subscription_type === 'trial'
        ? 'Trial subscription activated! Valid for 30 days.'
        : 'Paid subscription activated!'
    })

  } catch (error) {
    console.error('Error in subscription creation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
