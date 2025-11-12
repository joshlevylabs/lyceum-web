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

    // Check if user already has a main-application license
    const { data: existingLicense, error: checkError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('assigned_to', user.id)
      .eq('license_type', 'main-application')
      .eq('status', 'active')
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing license:', checkError)
    }

    // If user already has an active main-application license, return it
    if (existingLicense) {
      console.log('User already has main-application license:', existingLicense.key_code)
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

    // Prepare license data for main application
    const licenseData = {
      key_code: keyCode,
      license_type: 'main-application',
      status: 'active',
      max_users: 1, // Personal license
      max_projects: 100,
      max_storage_gb: 50,
      features: [
        'desktop_app_access',
        'local_cluster_support',
        'data_sync',
        'offline_mode',
        'auto_updates',
        brandType === 'centcom' ? 'centcom_branding' : 'lyceum_branding'
      ],
      expires_at: null, // No expiration for main app license
      assigned_to: user.id,
      assigned_at: new Date().toISOString(),
      created_by: user.id, // Self-generated

      // Enhanced licensing fields
      time_limit_type: 'unlimited',
      custom_trial_days: null,
      trial_extension_reason: null,
      enabled_plugins: [], // No plugins enabled by default
      plugin_permissions: {},
      allowed_user_types: ['engineer', 'operator', 'admin'],
      access_level: 'standard',
      restrictions: {},
      license_config: {
        brand_type: brandType,
        auto_generated: true,
        generated_via: 'license_agreement',
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

    console.log('Main-application license created:', {
      user_id: user.id,
      email: user.email,
      key_code: license.key_code,
      brand_type: brandType
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
