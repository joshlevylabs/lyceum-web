import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force explicit values to avoid environment variable loading issues
const supabaseUrl = 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST /api/admin/onboarding/auto-initialize - Auto-initialize onboarding for trial licenses
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, license_id, license_key_id, force = false } = body

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

    // Only initialize for trial licenses
    if (licenseData.license_type !== 'trial') {
      return NextResponse.json({
        message: 'Onboarding initialization is only required for trial licenses',
        license_type: licenseData.license_type,
        initialized: false
      })
    }

    // Check if onboarding progress already exists
    let existingQuery = supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', user_id)

    if (license_id) {
      existingQuery = existingQuery.eq('license_id', license_id)
    } else if (license_key_id) {
      existingQuery = existingQuery.eq('license_key_id', license_key_id)
    }

    const { data: existingProgress } = await existingQuery.single()

    if (existingProgress && !force) {
      return NextResponse.json({
        message: 'Onboarding progress already exists',
        existing_progress: existingProgress,
        initialized: false
      })
    }

    // Calculate onboarding requirements
    const requirementsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/onboarding/calculate-requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id,
        license_id,
        license_key_id
      })
    })

    if (!requirementsResponse.ok) {
      return NextResponse.json({ error: 'Failed to calculate requirements' }, { status: 500 })
    }

    const requirements = await requirementsResponse.json()

    // Create or update onboarding progress
    const progressData = {
      user_id,
      license_id: license_id || null,
      license_key_id: license_key_id || null,
      total_sessions_required: requirements.total_sessions_required,
      plugin_sessions_required: requirements.plugin_sessions_required,
      sessions_completed: 0,
      plugin_sessions_completed: {},
      overall_status: 'pending',
      onboarding_deadline: requirements.onboarding_deadline,
      license_active_status: true,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    let progressResult
    if (existingProgress && force) {
      // Update existing
      const { data, error } = await supabase
        .from('onboarding_progress')
        .update(progressData)
        .eq('id', existingProgress.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      progressResult = data
    } else {
      // Create new
      const { data, error } = await supabase
        .from('onboarding_progress')
        .insert([progressData])
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      progressResult = data
    }

    // Create initial onboarding sessions based on requirements
    const sessions = []
    
    // Base centcom sessions
    const baseSessions = requirements.requirements.find((r: any) => r.plugin_id === 'centcom')?.required_sessions || 3
    for (let i = 1; i <= baseSessions; i++) {
      sessions.push({
        user_id,
        license_id: license_id || null,
        license_key_id: license_key_id || null,
        plugin_id: 'centcom',
        session_type: i === 1 ? 'initial' : 'standard',
        session_number: i,
        title: `Centcom Onboarding Session ${i}`,
        description: `${i === 1 ? 'Initial introduction and setup' : `Session ${i} - Advanced features and workflows`}`,
        duration_minutes: 30,
        status: 'pending'
      })
    }

    // Plugin-specific sessions
    if (requirements.enabled_plugins && requirements.enabled_plugins.length > 0) {
      for (const plugin of requirements.enabled_plugins) {
        if (plugin !== 'centcom') {
          const pluginRequirement = requirements.requirements.find((r: any) => r.plugin_id === plugin)
          if (pluginRequirement) {
            for (let i = 1; i <= pluginRequirement.required_sessions; i++) {
              sessions.push({
                user_id,
                license_id: license_id || null,
                license_key_id: license_key_id || null,
                plugin_id: plugin,
                session_type: 'plugin_specific',
                session_number: i,
                title: `${plugin.charAt(0).toUpperCase() + plugin.slice(1)} Plugin Onboarding`,
                description: `Onboarding for ${plugin} plugin features and functionality`,
                duration_minutes: 30,
                status: 'pending'
              })
            }
          }
        }
      }
    }

    // Insert all sessions
    let createdSessions = []
    if (sessions.length > 0) {
      const { data: sessionData, error: sessionError } = await supabase
        .from('onboarding_sessions')
        .insert(sessions)
        .select()

      if (sessionError) {
        console.error('Error creating sessions:', sessionError)
      } else {
        createdSessions = sessionData || []
      }
    }

    // Create initial reminders
    const reminders = [
      {
        user_id,
        progress_id: progressResult.id,
        reminder_type: 'license_at_risk',
        reminder_method: 'email',
        scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        subject: 'Trial License - Onboarding Required',
        message: 'Your trial license requires completed onboarding sessions to remain active. Please contact your administrator to schedule your sessions.'
      },
      {
        user_id,
        progress_id: progressResult.id,
        reminder_type: 'session_due',
        reminder_method: 'email',
        scheduled_for: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        subject: 'Onboarding Sessions Required',
        message: 'Please schedule your onboarding sessions to maintain your trial license active status.'
      }
    ]

    const { data: reminderData } = await supabase
      .from('onboarding_reminders')
      .insert(reminders)
      .select()

    return NextResponse.json({
      message: 'Onboarding initialized successfully',
      initialized: true,
      progress: progressResult,
      requirements: requirements,
      sessions_created: createdSessions.length,
      sessions: createdSessions,
      reminders_created: reminderData?.length || 0,
      reminders: reminderData || []
    })

  } catch (error) {
    console.error('Error initializing onboarding:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/admin/onboarding/auto-initialize - Check what would be initialized
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    const license_id = searchParams.get('license_id')
    const license_key_id = searchParams.get('license_key_id')

    if (!user_id || (!license_id && !license_key_id)) {
      return NextResponse.json(
        { error: 'user_id and either license_id or license_key_id are required' },
        { status: 400 }
      )
    }

    // Calculate what would be created without actually creating it
    const requirementsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/onboarding/calculate-requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id,
        license_id,
        license_key_id
      })
    })

    if (!requirementsResponse.ok) {
      return NextResponse.json({ error: 'Failed to calculate requirements' }, { status: 500 })
    }

    const requirements = await requirementsResponse.json()

    // Check if onboarding already exists
    let existingQuery = supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', user_id)

    if (license_id) {
      existingQuery = existingQuery.eq('license_id', license_id)
    } else if (license_key_id) {
      existingQuery = existingQuery.eq('license_key_id', license_key_id)
    }

    const { data: existingProgress } = await existingQuery.single()

    return NextResponse.json({
      already_initialized: !!existingProgress,
      existing_progress: existingProgress,
      requirements: requirements,
      would_create: {
        sessions: requirements.total_sessions_required,
        reminders: 2,
        progress_record: !existingProgress
      }
    })

  } catch (error) {
    console.error('Error checking initialization:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/onboarding/auto-initialize - Bulk initialize onboarding for multiple users
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_licenses, force = false } = body

    if (!user_licenses || !Array.isArray(user_licenses)) {
      return NextResponse.json(
        { error: 'user_licenses array is required' },
        { status: 400 }
      )
    }

    const results = []

    for (const userLicense of user_licenses) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/onboarding/auto-initialize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userLicense.user_id,
            license_id: userLicense.license_id,
            license_key_id: userLicense.license_key_id,
            force
          })
        })

        const result = await response.json()
        results.push({
          user_id: userLicense.user_id,
          license_id: userLicense.license_id,
          license_key_id: userLicense.license_key_id,
          success: response.ok,
          ...result
        })

      } catch (error) {
        results.push({
          user_id: userLicense.user_id,
          license_id: userLicense.license_id,
          license_key_id: userLicense.license_key_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success && r.initialized).length
    const alreadyExisted = results.filter(r => r.success && !r.initialized).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `Processed ${results.length} users: ${successCount} initialized, ${alreadyExisted} already existed, ${failureCount} failed`,
      summary: {
        total: results.length,
        initialized: successCount,
        already_existed: alreadyExisted,
        failed: failureCount
      },
      results
    })

  } catch (error) {
    console.error('Error bulk initializing onboarding:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
