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
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('subscription_category', 'plugin')
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
          .from('subscriptions')
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
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('subscription_category', 'plugin')
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
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('subscription_category', 'plugin')
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
      .from('subscriptions')
      .insert({
        user_id: user.id,
        subscription_category: 'plugin',
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

    // Auto-create plugin license for this subscription
    let createdLicense = null
    try {
      // Generate license key
      const generateKeyCode = () => {
        const prefix = plugin_type === 'klippel_qc' ? 'LYC-KLIPPEL' : 'LYC-APX500'
        const year = new Date().getFullYear()
        const random = Math.random().toString(36).substr(2, 8).toUpperCase()
        return `${prefix}-${year}-${random}`
      }

      const keyCode = generateKeyCode()

      // Determine license expiration based on subscription type
      const isTrialLicense = subscription_type === 'trial'
      const expiresAt = isTrialLicense
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        : null // No expiration for paid

      const timeLimitType = isTrialLicense ? 'trial_30' : 'unlimited'
      const customTrialDays = isTrialLicense ? 30 : null

      // Get plugin-specific features
      const getPluginFeatures = (pluginType: PluginType) => {
        const baseFeatures = [
          'plugin_access',
          'data_integration',
          ...(isTrialLicense ? ['trial_license'] : ['paid_license'])
        ]

        if (pluginType === 'klippel_qc') {
          return [
            ...baseFeatures,
            'klippel_qc_analysis',
            'klippel_qc_reporting',
            'klippel_qc_export'
          ]
        } else if (pluginType === 'apx500') {
          return [
            ...baseFeatures,
            'apx500_measurements',
            'apx500_analysis',
            'apx500_export'
          ]
        }

        return baseFeatures
      }

      // Create plugin license
      const licenseData = {
        key_code: keyCode,
        license_type: plugin_type,
        status: isTrialLicense ? 'trial' : 'active',
        license_category: 'plugin',
        tier: 'basic',
        max_users: 1,
        max_projects: 100,
        max_storage_gb: 50,
        features: getPluginFeatures(plugin_type),
        expires_at: expiresAt,
        assigned_to: user.id,
        assigned_at: new Date().toISOString(),
        created_by: user.id,
        time_limit_type: timeLimitType,
        custom_trial_days: customTrialDays,
        trial_extension_reason: null,
        enabled_plugins: [],
        plugin_permissions: {},
        allowed_user_types: ['engineer', 'operator', 'admin'],
        access_level: 'standard',
        restrictions: {},
        license_config: {
          plugin_type: plugin_type,
          license_category: 'plugin',
          auto_generated: true,
          generated_via: 'subscription_creation',
          subscription_type: subscription_type,
          version: '2.0',
          created_at: new Date().toISOString()
        },
        usage_stats: {
          generated_at: new Date().toISOString(),
          user_email: user.email
        }
      }

      const { data: license, error: licenseError } = await supabase
        .from('license_keys')
        .insert([licenseData])
        .select()
        .single()

      if (licenseError) {
        console.error('⚠️ Failed to auto-create plugin license:', licenseError)
      } else {
        createdLicense = license

        // Create relationship between license and subscription
        await supabase
          .from('license_subscription_relationships')
          .insert({
            license_id: license.id,
            subscription_id: subscription.id,
            relationship_type: subscription_type === 'trial' ? 'trial_conversion' : 'standard',
            notes: `Auto-created on ${plugin_type} subscription creation`
          })

        console.log('✅ Auto-created plugin license and relationship:', {
          license_id: license.id,
          key_code: license.key_code,
          subscription_id: subscription.id,
          plugin_type,
          type: subscription_type
        })
      }
    } catch (licenseError) {
      // Don't fail the subscription creation if license creation fails
      console.error('⚠️ Failed to auto-create plugin license:', licenseError)
    }

    return NextResponse.json({
      success: true,
      subscription,
      license: createdLicense ? {
        key_code: createdLicense.key_code,
        license_type: createdLicense.license_type,
        status: createdLicense.status,
        expires_at: createdLicense.expires_at,
        features: createdLicense.features
      } : null,
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
