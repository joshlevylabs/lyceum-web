import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type PluginType = 'klippel_qc' | 'apx500'

/**
 * GET /api/licenses/generate-plugin?plugin_type=klippel_qc
 *
 * Check if user has an existing plugin license
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

    // Get plugin_type from query params
    const searchParams = request.nextUrl.searchParams
    const pluginType = searchParams.get('plugin_type') as PluginType

    if (!pluginType || !['klippel_qc', 'apx500'].includes(pluginType)) {
      return NextResponse.json({
        error: 'Invalid or missing plugin_type parameter. Must be klippel_qc or apx500'
      }, { status: 400 })
    }

    // Check if user has a plugin license
    const { data: existingLicense, error: checkError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('assigned_to', user.id)
      .eq('license_type', pluginType)
      .eq('status', 'active')
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing plugin license:', checkError)
      return NextResponse.json({
        error: 'Failed to check license'
      }, { status: 500 })
    }

    if (existingLicense) {
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
    console.error('Plugin license check error:', error)
    return NextResponse.json({
      error: 'Failed to check license',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/licenses/generate-plugin
 *
 * Generates a plugin license for the authenticated user
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

    // Get request body
    const body = await request.json().catch(() => ({}))
    const { plugin_type, license_type } = body

    // Validate plugin_type
    if (!plugin_type || !['klippel_qc', 'apx500'].includes(plugin_type)) {
      return NextResponse.json({
        error: 'Invalid or missing plugin_type. Must be klippel_qc or apx500'
      }, { status: 400 })
    }

    let requestedLicenseType = license_type // 'trial' or 'paid'

    // If no license type specified, check user's active subscription for this plugin
    if (!requestedLicenseType) {
      console.log('No license_type provided, checking plugin subscription...')
      const { data: subscription, error: subError } = await supabase
        .from('plugin_subscriptions')
        .select('subscription_type, status')
        .eq('user_id', user.id)
        .eq('plugin_type', plugin_type)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (subError) {
        console.error('Error checking plugin subscription:', subError)
      }

      if (subscription) {
        requestedLicenseType = subscription.subscription_type
        console.log('Detected subscription type from database:', requestedLicenseType)
      } else {
        // No active subscription found - default to paid
        requestedLicenseType = 'paid'
        console.log('No active subscription found, defaulting to paid license')
      }
    }

    // Check if user already has a license for this plugin
    const { data: existingLicense, error: checkError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('assigned_to', user.id)
      .eq('license_type', plugin_type)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing plugin license:', checkError)
    }

    // If user already has an active plugin license, return it
    if (existingLicense) {
      console.log('User already has plugin license:', existingLicense.key_code)

      // Check if subscription record exists, create if missing
      const { data: existingSubscription } = await supabase
        .from('plugin_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('plugin_type', plugin_type)
        .eq('status', 'active')
        .maybeSingle()

      if (!existingSubscription) {
        console.log('Creating missing subscription record for existing license')
        // Determine subscription type from license expiration
        const isExistingTrial = !!existingLicense.expires_at
        const subscriptionData = {
          user_id: user.id,
          plugin_type: plugin_type,
          subscription_type: isExistingTrial ? 'trial' : 'paid',
          status: 'active',
          amount_paid_cents: isExistingTrial ? 0 : 4900,
          currency: 'usd',
          trial_start_date: isExistingTrial ? existingLicense.created_at : null,
          trial_end_date: isExistingTrial ? existingLicense.expires_at : null
        }

        await supabase
          .from('plugin_subscriptions')
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
      const prefix = plugin_type === 'klippel_qc' ? 'LYC-KLIPPEL' : 'LYC-APX500'
      const year = new Date().getFullYear()
      const random = Math.random().toString(36).substr(2, 8).toUpperCase()
      return `${prefix}-${year}-${random}`
    }

    const keyCode = generateKeyCode()

    // Determine license expiration based on type
    const isTrialLicense = requestedLicenseType === 'trial'
    const expiresAt = isTrialLicense
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      : null // No expiration for paid license

    const timeLimitType = isTrialLicense ? 'trial_30' : 'unlimited'
    const customTrialDays = isTrialLicense ? 30 : null

    console.log('Creating plugin license:', {
      plugin_type,
      requestedType: requestedLicenseType,
      isTrialLicense,
      expiresAt,
      timeLimitType
    })

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

    // Prepare license data for plugin
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

      // Enhanced licensing fields
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
      console.error('Plugin license creation error:', insertError)
      return NextResponse.json({
        error: 'Failed to create license',
        details: insertError.message
      }, { status: 400 })
    }

    // Also create a plugin subscription record
    const subscriptionData = {
      user_id: user.id,
      plugin_type: plugin_type,
      subscription_type: requestedLicenseType,
      status: 'active',
      amount_paid_cents: isTrialLicense ? 0 : 4900, // $49.00 for paid, $0 for trial
      currency: 'usd',
      trial_start_date: isTrialLicense ? new Date().toISOString() : null,
      trial_end_date: isTrialLicense ? expiresAt : null
    }

    const { error: subscriptionError } = await supabase
      .from('plugin_subscriptions')
      .insert([subscriptionData])
      .select()
      .single()

    if (subscriptionError) {
      console.error('Plugin subscription creation error:', subscriptionError)
      // Note: We don't fail the whole operation if subscription creation fails
      // The license is already created, which is the critical part
    }

    console.log('Plugin license created:', {
      user_id: user.id,
      email: user.email,
      key_code: license.key_code,
      plugin_type,
      subscription_created: !subscriptionError
    })

    return NextResponse.json({
      success: true,
      message: `${plugin_type} license created successfully`,
      license: {
        key_code: license.key_code,
        license_type: license.license_type,
        status: license.status,
        created_at: license.created_at,
        expires_at: license.expires_at,
        features: license.features
      },
      is_new: true
    })

  } catch (error) {
    console.error('Plugin license generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate license',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
