import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type PluginType = 'klippel_qc' | 'apx500'

/**
 * GET /api/subscriptions/plugin?plugin_type=klippel_qc
 * Check plugin subscription and license status
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

    // Get plugin_type from query params
    const searchParams = request.nextUrl.searchParams
    const pluginType = searchParams.get('plugin_type') as PluginType

    if (!pluginType || !['klippel_qc', 'apx500'].includes(pluginType)) {
      return NextResponse.json(
        { error: 'Invalid or missing plugin_type parameter. Must be klippel_qc or apx500' },
        { status: 400 }
      )
    }

    // Get the most recent subscription for this plugin (regardless of status)
    const { data: subscription, error: subError } = await supabase
      .from('plugin_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('plugin_type', pluginType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      console.error('Error checking plugin subscription:', subError)
      return NextResponse.json(
        { error: 'Failed to check subscription status' },
        { status: 500 }
      )
    }

    // If no subscription exists at all
    if (!subscription) {
      return NextResponse.json({
        hasSubscription: false,
        subscription: null,
        hasValidLicense: false,
        pluginType
      })
    }

    // Check if there's a valid license for this user and plugin
    const { data: license, error: licenseError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('assigned_to', user.id)
      .eq('license_type', pluginType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (licenseError && licenseError.code !== 'PGRST116') {
      console.error('Error checking plugin license:', licenseError)
    }

    // Check if license is valid (not expired and status is active)
    let hasValidLicense = false
    let licenseExpired = false

    if (license) {
      const now = new Date()
      const expiresAt = license.expires_at ? new Date(license.expires_at) : null

      // License is valid if status is active and not expired
      hasValidLicense = license.status === 'active' && (!expiresAt || now < expiresAt)
      licenseExpired = expiresAt && now >= expiresAt

      // If license has expired, update both license and subscription status
      if (licenseExpired && license.status === 'active') {
        await supabase
          .from('license_keys')
          .update({ status: 'expired' })
          .eq('id', license.id)

        await supabase
          .from('plugin_subscriptions')
          .update({ status: 'expired' })
          .eq('id', subscription.id)
      }
    }

    return NextResponse.json({
      hasSubscription: subscription.status === 'active',
      subscription: subscription,
      hasValidLicense: hasValidLicense,
      license: license || null,
      licenseExpired: licenseExpired,
      pluginType
    })

  } catch (error) {
    console.error('Error in plugin subscription check:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/subscriptions/plugin
 * Create new plugin subscription
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
    const { plugin_type, subscription_type, stripe_session_id } = body

    // Validate plugin_type
    if (!plugin_type || !['klippel_qc', 'apx500'].includes(plugin_type)) {
      return NextResponse.json(
        { error: 'Invalid plugin_type. Must be klippel_qc or apx500' },
        { status: 400 }
      )
    }

    // Validate subscription_type
    if (!subscription_type || !['trial', 'paid'].includes(subscription_type)) {
      return NextResponse.json(
        { error: 'Invalid subscription type. Must be "trial" or "paid"' },
        { status: 400 }
      )
    }

    // Check if user already has an active subscription for this plugin
    const { data: existingSubscription } = await supabase
      .from('plugin_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('plugin_type', plugin_type)
      .eq('status', 'active')
      .single()

    if (existingSubscription) {
      return NextResponse.json(
        {
          error: `You already have an active subscription for ${plugin_type}`,
          subscription: existingSubscription
        },
        { status: 400 }
      )
    }

    // Check if user already had a trial for this plugin
    if (subscription_type === 'trial') {
      const { data: previousTrial } = await supabase
        .from('plugin_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('plugin_type', plugin_type)
        .eq('subscription_type', 'trial')
        .single()

      if (previousTrial) {
        return NextResponse.json(
          {
            error: `You have already used your trial for ${plugin_type}. Please subscribe to a paid plan.`,
            can_use_trial: false
          },
          { status: 400 }
        )
      }
    }

    // Calculate trial dates (30 days from now)
    const now = new Date()
    const trialStartDate = subscription_type === 'trial' ? now.toISOString() : null
    const trialEndDate = subscription_type === 'trial'
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null

    // Create subscription
    const { data: subscription, error: createError } = await supabase
      .from('plugin_subscriptions')
      .insert({
        user_id: user.id,
        plugin_type,
        subscription_type,
        status: 'active',
        stripe_session_id,
        trial_start_date: trialStartDate,
        trial_end_date: trialEndDate
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating plugin subscription:', createError)
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subscription,
      message: subscription_type === 'trial'
        ? `Trial subscription for ${plugin_type} activated! Valid for 30 days.`
        : `Paid subscription for ${plugin_type} activated!`
    })

  } catch (error) {
    console.error('Error in plugin subscription creation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
