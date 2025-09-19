import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force explicit values to avoid environment variable loading issues
const supabaseUrl = 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

console.log('Auto Create Sessions API: Creating Supabase client with URL:', supabaseUrl)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST /api/admin/onboarding/auto-create-sessions - Auto-create sessions for license assignment
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/admin/onboarding/auto-create-sessions - Starting request...')

    const body = await request.json()
    console.log('Request body:', body)

    // Validate required fields
    const requiredFields = ['user_id', 'license_key_id']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          error: `Missing required field: ${field}`,
          required_fields: requiredFields
        }, { status: 400 })
      }
    }

    const { user_id, license_key_id, trigger_type = 'license_assigned', triggered_by } = body

    console.log('Auto-creating sessions for:', { user_id, license_key_id, trigger_type })

    // Check if user already has completed onboarding in the past
    const { data: existingProgress, error: progressError } = await supabase
      .from('onboarding_progress')
      .select('overall_status, completed_at')
      .eq('user_id', user_id)
      .neq('overall_status', 'pending') // Has some progress

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error checking existing progress:', progressError)
      return NextResponse.json({
        error: `Failed to check existing progress: ${progressError.message}`,
        details: progressError
      }, { status: 500 })
    }

    // If user has completed onboarding before, don't auto-create sessions
    if (existingProgress && existingProgress.length > 0) {
      const completedOnboarding = existingProgress.some(p => p.overall_status === 'completed')
      
      if (completedOnboarding) {
        console.log('User has completed onboarding before, skipping auto-creation')
        return NextResponse.json({
          message: 'User has completed onboarding before',
          sessions_created: 0,
          session_ids: [],
          existing_progress: existingProgress
        })
      }
    }

    // Get license information to determine plugins and license type
    const { data: licenseInfo, error: licenseError } = await supabase
      .from('license_keys')
      .select('license_type, enabled_plugins, expires_at')
      .eq('id', license_key_id)
      .single()

    if (licenseError) {
      console.error('License fetch error:', licenseError)
      return NextResponse.json({
        error: `Failed to fetch license: ${licenseError.message}`,
        details: licenseError
      }, { status: 500 })
    }

    if (!licenseInfo) {
      return NextResponse.json({
        error: 'License not found'
      }, { status: 404 })
    }

    console.log('License info:', licenseInfo)

    // Get applicable templates based on license type and enabled plugins
    const enabledPlugins = licenseInfo.enabled_plugins || ['centcom']
    const licenseType = licenseInfo.license_type || 'trial'

    console.log('Looking for templates for plugins:', enabledPlugins, 'license type:', licenseType)

    const { data: applicableTemplates, error: templatesError } = await supabase
      .from('onboarding_session_templates')
      .select('*')
      .eq('is_active', true)
      .eq('auto_create_on_license', true)
      .in('plugin_id', enabledPlugins)
      .contains('license_types', [licenseType])
      .order('priority_order', { ascending: true })

    if (templatesError) {
      console.error('Templates fetch error:', templatesError)
      return NextResponse.json({
        error: `Failed to fetch templates: ${templatesError.message}`,
        details: templatesError
      }, { status: 500 })
    }

    console.log('Found applicable templates:', applicableTemplates?.length || 0)

    if (!applicableTemplates || applicableTemplates.length === 0) {
      return NextResponse.json({
        message: 'No applicable templates found for auto-creation',
        sessions_created: 0,
        session_ids: [],
        license_info: licenseInfo
      })
    }

    // Create sessions from templates
    const createdSessions = []
    const sessionIds = []
    const templateIds = []
    const errors = []

    for (let i = 0; i < applicableTemplates.length; i++) {
      const template = applicableTemplates[i]
      
      try {
        console.log('Creating session from template:', template.template_name)

        // Calculate scheduled date (spread sessions over time)
        const scheduledDate = new Date()
        scheduledDate.setDate(scheduledDate.getDate() + (i * 7)) // Space sessions 1 week apart
        scheduledDate.setHours(10, 0, 0, 0) // Default to 10 AM

        const sessionData = {
          user_id: user_id,
          license_key_id: license_key_id,
          template_id: template.id,
          plugin_id: template.plugin_id,
          session_type: template.session_type,
          session_number: i + 1,
          title: template.title,
          description: template.description,
          duration_minutes: template.duration_minutes,
          is_mandatory: template.is_mandatory,
          session_objectives: template.objectives || [],
          session_materials: template.preparation_materials || [],
          scheduled_at: scheduledDate.toISOString(),
          status: 'scheduled',
          notes: `Auto-created from template: ${template.template_name} (${trigger_type})`
        }

        const { data: sessionResult, error: sessionError } = await supabase
          .from('onboarding_sessions')
          .insert(sessionData)
          .select('id, title, scheduled_at')
          .single()

        if (sessionError) {
          console.error('Session creation error for template:', template.template_name, sessionError)
          errors.push({
            template: template.template_name,
            error: sessionError.message
          })
          continue
        }

        console.log('Session created successfully:', sessionResult.id)
        createdSessions.push(sessionResult)
        sessionIds.push(sessionResult.id)
        templateIds.push(template.id)

      } catch (error) {
        console.error('Unexpected error creating session for template:', template.template_name, error)
        errors.push({
          template: template.template_name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Log the automation event
    try {
      const logData = {
        trigger_type: trigger_type,
        license_key_id: license_key_id,
        user_id: user_id,
        sessions_created: createdSessions.length,
        session_ids: sessionIds,
        templates_used: templateIds,
        status: errors.length === 0 ? 'success' : (createdSessions.length > 0 ? 'partial' : 'failed'),
        error_message: errors.length > 0 ? JSON.stringify(errors) : null,
        triggered_by: triggered_by || null,
        processing_details: {
          license_type: licenseType,
          enabled_plugins: enabledPlugins,
          templates_found: applicableTemplates.length,
          errors: errors
        }
      }

      await supabase
        .from('onboarding_automation_log')
        .insert(logData)

      console.log('Automation event logged successfully')
    } catch (logError) {
      console.warn('Failed to log automation event:', logError)
      // Don't fail the entire request for logging issues
    }

    // Update onboarding progress
    try {
      await updateOnboardingProgress(user_id, license_key_id, licenseInfo)
    } catch (progressError) {
      console.warn('Failed to update onboarding progress:', progressError)
      // Don't fail the entire request for this
    }

    const result = {
      message: `Successfully auto-created ${createdSessions.length} onboarding sessions`,
      sessions_created: createdSessions.length,
      session_ids: sessionIds,
      created_sessions: createdSessions,
      templates_used: applicableTemplates.map(t => ({ id: t.id, name: t.template_name })),
      license_info: {
        type: licenseType,
        plugins: enabledPlugins
      }
    }

    if (errors.length > 0) {
      result.errors = errors
      result.message += ` (${errors.length} failed)`
    }

    console.log('Auto-creation completed:', result)

    return NextResponse.json(result, { 
      status: createdSessions.length > 0 ? 201 : 200 
    })

  } catch (error) {
    console.error('Unexpected error in auto-create sessions:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}

// Helper function to update onboarding progress
async function updateOnboardingProgress(userId: string, licenseKeyId: string, licenseInfo: any) {
  console.log('Updating onboarding progress after auto-creation')

  // Get all sessions for this user/license
  const { data: allSessions, error: sessionsError } = await supabase
    .from('onboarding_sessions')
    .select('status, plugin_id, is_mandatory')
    .eq('user_id', userId)
    .eq('license_key_id', licenseKeyId)

  if (sessionsError) {
    throw sessionsError
  }

  const totalSessions = allSessions?.length || 0
  const mandatorySessions = allSessions?.filter(s => s.is_mandatory).length || 0
  const completedSessions = allSessions?.filter(s => s.status === 'completed').length || 0

  // Set onboarding deadline based on license expiry
  let onboardingDeadline = null
  if (licenseInfo.expires_at) {
    const expiryDate = new Date(licenseInfo.expires_at)
    onboardingDeadline = new Date(expiryDate.getTime() - (7 * 24 * 60 * 60 * 1000)) // 7 days before expiry
  }

  const progressData = {
    user_id: userId,
    license_key_id: licenseKeyId,
    total_sessions_required: Math.max(mandatorySessions, 3), // At least 3 mandatory sessions
    sessions_completed: completedSessions,
    overall_status: 'in_progress', // Just started
    onboarding_deadline: onboardingDeadline?.toISOString() || null,
    license_active_status: true,
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // Check if progress record already exists
  const { data: existingProgress, error: progressFetchError } = await supabase
    .from('onboarding_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('license_key_id', licenseKeyId)
    .single()

  if (progressFetchError && progressFetchError.code !== 'PGRST116') {
    throw progressFetchError
  }

  if (existingProgress) {
    // Update existing progress
    delete progressData.started_at // Don't overwrite started_at
    
    const { error: updateError } = await supabase
      .from('onboarding_progress')
      .update(progressData)
      .eq('user_id', userId)
      .eq('license_key_id', licenseKeyId)

    if (updateError) {
      throw updateError
    }
  } else {
    // Create new progress record
    const { error: insertError } = await supabase
      .from('onboarding_progress')
      .insert(progressData)

    if (insertError) {
      throw insertError
    }
  }

  console.log('Onboarding progress updated after auto-creation')
}
