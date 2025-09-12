import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/onboarding/calculate-requirements - Calculate onboarding requirements for a user's license
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, license_id, license_key_id } = body

    if (!user_id || (!license_id && !license_key_id)) {
      return NextResponse.json(
        { error: 'user_id and either license_id or license_key_id are required' },
        { status: 400 }
      )
    }

    // Get license information
    let licenseData: any = null
    if (license_id) {
      const { data } = await supabase
        .from('licenses')
        .select('*')
        .eq('id', license_id)
        .single()
      licenseData = data
    } else if (license_key_id) {
      const { data } = await supabase
        .from('license_keys')
        .select('*')
        .eq('id', license_key_id)
        .single()
      licenseData = data
    }

    if (!licenseData) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 })
    }

    // Only calculate for trial licenses
    if (licenseData.license_type !== 'trial') {
      return NextResponse.json({
        total_sessions_required: 0,
        plugin_sessions_required: {},
        requirements: [],
        message: 'Onboarding is only required for trial licenses'
      })
    }

    // Get base requirements for centcom
    const { data: centcomRequirement } = await supabase
      .from('onboarding_requirements')
      .select('*')
      .eq('license_type', 'trial')
      .eq('plugin_id', 'centcom')
      .eq('is_active', true)
      .single()

    let totalSessions = centcomRequirement?.required_sessions || 3
    const pluginSessionsRequired: Record<string, number> = {}
    const requirements: any[] = []

    if (centcomRequirement) {
      requirements.push(centcomRequirement)
    }

    // Get enabled plugins from license
    let enabledPlugins: string[] = []
    if (licenseData.enabled_plugins && Array.isArray(licenseData.enabled_plugins)) {
      enabledPlugins = licenseData.enabled_plugins
    } else if (licenseData.features && Array.isArray(licenseData.features)) {
      // Map features to plugins if needed
      enabledPlugins = licenseData.features.filter((f: string) => f !== 'basic_access')
    }

    // Get requirements for each enabled plugin
    if (enabledPlugins.length > 0) {
      const { data: pluginRequirements } = await supabase
        .from('onboarding_requirements')
        .select('*')
        .eq('license_type', 'trial')
        .in('plugin_id', enabledPlugins)
        .eq('is_active', true)

      if (pluginRequirements) {
        pluginRequirements.forEach(req => {
          totalSessions += req.required_sessions
          pluginSessionsRequired[req.plugin_id] = req.required_sessions
          requirements.push(req)
        })
      }
    }

    // Calculate deadline (30 days from now for trial licenses)
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 30)

    const result = {
      user_id,
      license_id,
      license_key_id,
      license_type: licenseData.license_type,
      enabled_plugins: enabledPlugins,
      total_sessions_required: totalSessions,
      plugin_sessions_required: pluginSessionsRequired,
      onboarding_deadline: deadline.toISOString(),
      requirements,
      calculation_details: {
        base_sessions: centcomRequirement?.required_sessions || 3,
        plugin_sessions: Object.values(pluginSessionsRequired).reduce((a: number, b: number) => a + b, 0),
        plugins_with_requirements: Object.keys(pluginSessionsRequired)
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error calculating onboarding requirements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/onboarding/calculate-requirements/bulk - Calculate requirements for multiple users
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_ids, license_type = 'trial' } = body

    if (!user_ids || !Array.isArray(user_ids)) {
      return NextResponse.json(
        { error: 'user_ids array is required' },
        { status: 400 }
      )
    }

    const results = []

    // Get all trial licenses for the users
    const { data: licenses } = await supabase
      .from('licenses')
      .select('*')
      .in('user_id', user_ids)
      .eq('license_type', license_type)

    const { data: licenseKeys } = await supabase
      .from('license_keys')
      .select('*')
      .in('assigned_to', user_ids)
      .eq('license_type', license_type)

    // Process each user's licenses
    for (const userId of user_ids) {
      const userLicenses = licenses?.filter(l => l.user_id === userId) || []
      const userLicenseKeys = licenseKeys?.filter(l => l.assigned_to === userId) || []

      for (const license of userLicenses) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/onboarding/calculate-requirements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              license_id: license.id
            })
          })

          if (response.ok) {
            const calculation = await response.json()
            results.push(calculation)
          }
        } catch (error) {
          console.error(`Error calculating for user ${userId}, license ${license.id}:`, error)
        }
      }

      for (const licenseKey of userLicenseKeys) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/onboarding/calculate-requirements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              license_key_id: licenseKey.id
            })
          })

          if (response.ok) {
            const calculation = await response.json()
            results.push(calculation)
          }
        } catch (error) {
          console.error(`Error calculating for user ${userId}, license key ${licenseKey.id}:`, error)
        }
      }
    }

    return NextResponse.json({
      calculations: results,
      summary: {
        users_processed: user_ids.length,
        calculations_completed: results.length,
        average_sessions_required: results.length > 0 
          ? Math.round(results.reduce((sum, r) => sum + r.total_sessions_required, 0) / results.length)
          : 0
      }
    })

  } catch (error) {
    console.error('Error in bulk requirements calculation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
