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

    // Get the most recent subscription (regardless of status)
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('subscription_category', 'native_app')
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

    console.log('🔍 Native app subscription check:', {
      userId: user.id,
      email: user.email,
      hasSubscription: !!subscription,
      subscriptionStatus: subscription?.status,
      subscriptionId: subscription?.id
    })

    // Check if there's a valid license for this user (licenses are linked by user_id, not subscription_id)
    // Check licenses BEFORE returning early for no subscription - user might have a standalone license!
    // Note: license_category identifies the type (main_application, plugin)
    // license_type identifies the tier (standard, professional, enterprise)
    const { data: license, error: licenseError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('assigned_to', user.id)
      .eq('license_category', 'main_application')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (licenseError && licenseError.code !== 'PGRST116') {
      console.error('Error checking license:', licenseError)
    }

    console.log('🔑 License check:', {
      hasLicense: !!license,
      licenseStatus: license?.status,
      licenseKeyCode: license?.key_code,
      expiresAt: license?.expires_at,
      timeLimitType: license?.time_limit_type
    })

    // Check if license is valid (not expired and status is active)
    let hasValidLicense = false
    let licenseExpired = false

    if (license) {
      const now = new Date()
      const expiresAt = license.expires_at ? new Date(license.expires_at) : null

      // License is valid if status is active and not expired
      hasValidLicense = license.status === 'active' && (!expiresAt || now < expiresAt)
      licenseExpired = expiresAt && now >= expiresAt

      console.log('✅ License validation:', {
        status: license.status,
        hasValidLicense,
        licenseExpired,
        now: now.toISOString(),
        expiresAt: expiresAt?.toISOString()
      })

      // If license has expired, update license status
      if (licenseExpired && license.status === 'active') {
        await supabase
          .from('license_keys')
          .update({ status: 'expired' })
          .eq('id', license.id)

        // Also update subscription status if one exists
        if (subscription) {
          await supabase
            .from('subscriptions')
            .update({ status: 'expired' })
            .eq('id', subscription.id)
        }
      }
    }

    return NextResponse.json({
      hasSubscription: subscription ? subscription.status === 'active' : false,
      subscription: subscription || null,
      hasValidLicense: hasValidLicense,
      license: license || null,
      licenseExpired: licenseExpired
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
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('subscription_category', 'native_app')
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

    // Check if user already had a trial (prevent duplicate trials)
    if (subscription_type === 'trial') {
      const { data: previousTrials } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('subscription_category', 'native_app')
        .eq('subscription_type', 'trial')

      // If user has ANY previous trial (started, completed, or cancelled), they cannot start another
      if (previousTrials && previousTrials.length > 0) {
        console.log('❌ User attempted to start duplicate trial:', {
          userId: user.id,
          previousTrialCount: previousTrials.length,
          previousTrialStatuses: previousTrials.map(t => t.status)
        })
        return NextResponse.json(
          {
            error: 'You have already used your free trial for this product. Please subscribe to a paid plan to continue.',
            can_use_trial: false,
            previous_trial_count: previousTrials.length
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
        subscription_category: 'native_app',
        subscription_type,
        status: 'active',
        trial_start_date: trialStartDate,
        trial_end_date: trialEndDate,
        plugin_type: null
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

    // Auto-create license for this subscription
    let createdLicense = null
    try {
      // Get user's company to determine brand type
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('company')
        .eq('id', user.id)
        .single()

      const centcomCompanies = [
        'centcom',
        'sonance',
        'blaze',
        'iport',
        'danainnovations',
        'dana innovations',
        'james',
        'trufig'
      ]

      const companyLower = userProfile?.company?.toLowerCase() || ''
      const isCentcom = centcomCompanies.some(name => companyLower.includes(name))
      const brandType = isCentcom ? 'centcom' : 'lyceum'

      // Generate license key
      const generateKeyCode = () => {
        const prefix = `LYC-APP-${new Date().getFullYear()}`
        const random = Math.random().toString(36).substr(2, 8).toUpperCase()
        return `${prefix}-${random}`
      }

      const keyCode = generateKeyCode()

      // Determine license expiration based on subscription type
      const isTrialLicense = subscription_type === 'trial'
      const expiresAt = isTrialLicense
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        : null // No expiration for paid

      const timeLimitType = isTrialLicense ? 'trial_30' : 'unlimited'
      const customTrialDays = isTrialLicense ? 30 : null

      // Create license
      const licenseData = {
        key_code: keyCode,
        license_type: 'main-application',
        status: isTrialLicense ? 'trial' : 'active',
        max_users: 1,
        max_projects: 100,
        max_storage_gb: 50,
        features: [
          'desktop_app_access',
          'local_cluster_support',
          'data_sync',
          'offline_mode',
          'auto_updates',
          brandType === 'centcom' ? 'centcom_branding' : 'lyceum_branding',
          ...(isTrialLicense ? ['trial_license'] : ['paid_license'])
        ],
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
          brand_type: brandType,
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

      const { data: licenseArray, error: licenseError } = await supabase
        .from('license_keys')
        .insert([licenseData])
        .select('id, key_code, license_type, status, assigned_to, expires_at')

      const license = licenseArray?.[0]

      if (licenseError || !license) {
        console.error('⚠️ Failed to auto-create license:', licenseError)
      } else {
        createdLicense = license

        // Create relationship between license and subscription
        await supabase
          .from('license_subscription_relationships')
          .insert({
            license_id: license.id,
            subscription_id: subscription.id,
            relationship_type: subscription_type === 'trial' ? 'trial_conversion' : 'standard',
            notes: 'Auto-created on subscription creation'
          })

        console.log('✅ Auto-created license and relationship:', {
          license_id: license.id,
          key_code: license.key_code,
          subscription_id: subscription.id,
          type: subscription_type,
          brand_type: brandType
        })
      }
    } catch (licenseError) {
      // Don't fail the subscription creation if license creation fails
      console.error('⚠️ Failed to auto-create license:', licenseError)
    }

    return NextResponse.json({
      success: true,
      subscription,
      license: createdLicense ? {
        key_code: createdLicense.key_code,
        license_type: createdLicense.license_type,
        status: createdLicense.status,
        expires_at: createdLicense.expires_at
      } : null,
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
