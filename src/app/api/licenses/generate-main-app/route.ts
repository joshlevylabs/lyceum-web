import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/licenses/generate-main-app
 *
 * Check if user has an existing main-application license
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authenticated user
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({
        error: 'Not authenticated'
      }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({
        error: 'Invalid authentication'
      }, { status: 401 })
    }

    // Check if user has a main-application license
    const { data: existingLicense, error: checkError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('assigned_to', user.id)
      .eq('license_type', 'main-application')
      .eq('status', 'active')
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing license:', checkError)
      return NextResponse.json({
        error: 'Failed to check license'
      }, { status: 500 })
    }

    if (existingLicense) {
      // Check if subscription record exists, create if missing (backfill)
      const { data: existingSubscription } = await supabase
        .from('user_subscriptions_native_app')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (!existingSubscription) {
        console.log('GET: Creating missing subscription record for existing license')
        // Determine subscription type from license expiration
        const isExistingTrial = !!existingLicense.expires_at
        const subscriptionData = {
          user_id: user.id,
          subscription_type: isExistingTrial ? 'trial' : 'paid',
          status: 'active',
          amount_paid_cents: isExistingTrial ? 0 : 4900,
          currency: 'usd',
          trial_start_date: isExistingTrial ? existingLicense.created_at : null,
          trial_end_date: isExistingTrial ? existingLicense.expires_at : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        await supabase
          .from('user_subscriptions_native_app')
          .insert([subscriptionData])
      }

      return NextResponse.json({
        hasLicense: true,
        license: {
          key_code: existingLicense.key_code,
          license_type: existingLicense.license_type,
          status: existingLicense.status,
          created_at: existingLicense.created_at,
          expires_at: existingLicense.expires_at,
          features: existingLicense.features
        }
      })
    }

    return NextResponse.json({
      hasLicense: false,
      license: null
    })

  } catch (error) {
    console.error('License check error:', error)
    return NextResponse.json({
      error: 'Failed to check license',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/licenses/generate-main-app
 *
 * Generates a main-application license for the authenticated user
 * This is called when a user accepts the license agreement before downloading the app
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authenticated user
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({
        error: 'Not authenticated'
      }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({
        error: 'Invalid authentication'
      }, { status: 401 })
    }

    // Get request body to check for license_type
    const body = await request.json().catch(() => ({}))
    let requestedLicenseType = body.license_type // 'trial' or 'paid'

    // If no license type specified, check user's active subscription to determine type
    if (!requestedLicenseType) {
      console.log('No license_type provided, checking user subscription...')
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions_native_app')
        .select('subscription_type, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (subError) {
        console.error('Error checking subscription:', subError)
      }

      if (subscription) {
        requestedLicenseType = subscription.subscription_type // Use subscription type ('trial' or 'paid')
        console.log('Detected subscription type from database:', requestedLicenseType)
      } else {
        // No active subscription found - default to paid
        requestedLicenseType = 'paid'
        console.log('No active subscription found, defaulting to paid license')
      }
    }

    // Check if user already has a main-application license
    // Use limit(1) to handle race conditions where multiple licenses might exist
    const { data: existingLicense, error: checkError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('assigned_to', user.id)
      .eq('license_type', 'main-application')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing license:', checkError)
    }

    // If user already has an active main-application license, return it
    if (existingLicense) {
      console.log('User already has main-application license:', existingLicense.key_code)

      // Check if subscription record exists, create if missing
      const { data: existingSubscription } = await supabase
        .from('user_subscriptions_native_app')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (!existingSubscription) {
        console.log('Creating missing subscription record for existing license')
        // Determine subscription type from license expiration
        const isExistingTrial = !!existingLicense.expires_at
        const subscriptionData = {
          user_id: user.id,
          subscription_type: isExistingTrial ? 'trial' : 'paid',
          status: 'active',
          amount_paid_cents: isExistingTrial ? 0 : 4900,
          currency: 'usd',
          trial_start_date: isExistingTrial ? existingLicense.created_at : null,
          trial_end_date: isExistingTrial ? existingLicense.expires_at : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        await supabase
          .from('user_subscriptions_native_app')
          .insert([subscriptionData])
      }

      return NextResponse.json({
        success: true,
        message: 'License already exists',
        license: {
          key_code: existingLicense.key_code,
          license_type: existingLicense.license_type,
          status: existingLicense.status,
          created_at: existingLicense.created_at,
          expires_at: existingLicense.expires_at,
          features: existingLicense.features
        },
        is_new: false
      })
    }

    // Generate new license key
    const generateKeyCode = () => {
      const prefix = `LYC-APP-${new Date().getFullYear()}`
      const random = Math.random().toString(36).substr(2, 8).toUpperCase()
      return `${prefix}-${random}`
    }

    const keyCode = generateKeyCode()

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

    // Determine license expiration based on type
    const isTrialLicense = requestedLicenseType === 'trial'
    const expiresAt = isTrialLicense
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      : null // No expiration for paid license

    const timeLimitType = isTrialLicense ? 'trial_30' : 'unlimited'
    const customTrialDays = isTrialLicense ? 30 : null

    console.log('Creating license:', {
      requestedType: requestedLicenseType,
      isTrialLicense,
      expiresAt,
      timeLimitType
    })

    // Prepare license data for main application
    const licenseData = {
      key_code: keyCode,
      license_type: 'main-application',
      status: isTrialLicense ? 'trial' : 'active',
      max_users: 1, // Personal license
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
      created_by: user.id, // Self-generated

      // Enhanced licensing fields
      time_limit_type: timeLimitType,
      custom_trial_days: customTrialDays,
      trial_extension_reason: null,
      enabled_plugins: [], // No plugins enabled by default
      plugin_permissions: {},
      allowed_user_types: ['engineer', 'operator', 'admin'],
      access_level: 'standard',
      restrictions: {},
      license_config: {
        brand_type: brandType,
        auto_generated: true,
        generated_via: 'subscription_flow',
        subscription_type: requestedLicenseType,
        version: '2.0',
        created_at: new Date().toISOString()
      },
      usage_stats: {
        generated_at: new Date().toISOString(),
        user_email: user.email
      }
    }

    // Insert the license
    const { data: license, error: insertError } = await supabase
      .from('license_keys')
      .insert([licenseData])
      .select()
      .single()

    if (insertError) {
      console.error('License creation error:', insertError)
      return NextResponse.json({
        error: 'Failed to create license',
        details: insertError.message
      }, { status: 400 })
    }

    // Also create a subscription record for tracking
    const subscriptionData = {
      user_id: user.id,
      subscription_type: requestedLicenseType, // 'trial' or 'paid'
      status: 'active',
      amount_paid_cents: isTrialLicense ? 0 : 4900, // $49.00 for paid, $0 for trial
      currency: 'usd',
      trial_start_date: isTrialLicense ? new Date().toISOString() : null,
      trial_end_date: isTrialLicense ? expiresAt : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { error: subscriptionError } = await supabase
      .from('user_subscriptions_native_app')
      .insert([subscriptionData])

    if (subscriptionError) {
      console.error('Subscription creation error:', subscriptionError)
      // Don't fail the whole operation - license is already created
    }

    console.log('Main-application license created:', {
      user_id: user.id,
      email: user.email,
      key_code: license.key_code,
      brand_type: brandType,
      subscription_created: !subscriptionError
    })

    return NextResponse.json({
      success: true,
      message: 'Main-application license created successfully',
      license: {
        key_code: license.key_code,
        license_type: license.license_type,
        status: license.status,
        created_at: license.created_at,
        expires_at: license.expires_at,
        features: license.features,
        brand_type: brandType
      },
      is_new: true
    })

  } catch (error) {
    console.error('License generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate license',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
