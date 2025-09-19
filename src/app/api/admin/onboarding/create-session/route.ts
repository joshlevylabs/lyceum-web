import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force explicit values to avoid environment variable loading issues
const supabaseUrl = 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST /api/admin/onboarding/create-session - Create a new onboarding session
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/admin/onboarding/create-session - Starting request...')
    
    const body = await request.json()
    console.log('Creating session with data:', body)

    const {
      user_id,
      license_key_id,
      template_id,
      scheduled_at,
      assigned_admin_id,
      custom_title,
      custom_description,
      custom_duration_minutes,
      session_notes
    } = body

    // Validate required fields
    if (!user_id) {
      return NextResponse.json({
        error: 'User ID is required'
      }, { status: 400 })
    }

    if (!license_key_id) {
      return NextResponse.json({
        error: 'License Key ID is required'
      }, { status: 400 })
    }

    // Clean up timestamp fields - convert empty strings to null
    const cleanScheduledAt = scheduled_at && scheduled_at.trim() !== '' ? scheduled_at : null
    const cleanAssignedAdminId = assigned_admin_id && assigned_admin_id.trim() !== '' ? assigned_admin_id : null

    let sessionData: any = {
      user_id,
      license_key_id,
      assigned_admin_id: cleanAssignedAdminId,
      scheduled_at: cleanScheduledAt,
      status: cleanScheduledAt ? 'scheduled' : 'pending',
      notes: session_notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // If using a template, fetch template data
    if (template_id) {
      console.log('Fetching template data for:', template_id)
      
      const { data: template, error: templateError } = await supabase
        .from('onboarding_session_templates')
        .select('*')
        .eq('id', template_id)
        .single()

      if (templateError) {
        console.error('Error fetching template:', templateError)
        return NextResponse.json({
          error: `Failed to fetch template: ${templateError.message}`
        }, { status: 500 })
      }

      if (template) {
        sessionData = {
          ...sessionData,
          template_id,
          plugin_id: template.plugin_id,
          session_type: template.session_type,
          title: custom_title || template.title,
          description: custom_description || template.description,
          duration_minutes: custom_duration_minutes || template.duration_minutes,
          is_mandatory: template.is_mandatory,
          session_objectives: template.objectives,
          session_materials: template.preparation_materials || [],
          session_number: 1 // Will be updated based on existing sessions
        }
      }
    } else {
      // Custom session without template
      sessionData = {
        ...sessionData,
        plugin_id: 'centcom',
        session_type: 'standard',
        title: custom_title || 'Custom Onboarding Session',
        description: custom_description || '',
        duration_minutes: custom_duration_minutes || 30,
        is_mandatory: true,
        session_number: 1
      }
    }

    // Get the next session number for this user/license combination
    const { data: existingSessions, error: sessionCountError } = await supabase
      .from('onboarding_sessions')
      .select('session_number')
      .eq('user_id', user_id)
      .eq('license_key_id', license_key_id)
      .order('session_number', { ascending: false })
      .limit(1)

    if (!sessionCountError && existingSessions && existingSessions.length > 0) {
      sessionData.session_number = existingSessions[0].session_number + 1
    }

    console.log('Creating session with final data:', sessionData)

    // Create the session
    const { data: newSession, error: createError } = await supabase
      .from('onboarding_sessions')
      .insert([sessionData])
      .select()
      .single()

    if (createError) {
      console.error('Error creating session:', createError)
      return NextResponse.json({
        error: `Failed to create session: ${createError.message}`,
        details: createError
      }, { status: 500 })
    }

    // Update onboarding progress if it exists
    const { data: existingProgress, error: progressFetchError } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', user_id)
      .eq('license_key_id', license_key_id)
      .single()

    if (progressFetchError && progressFetchError.code !== 'PGRST116') {
      console.warn('Error fetching existing progress:', progressFetchError)
    }

    if (existingProgress) {
      // Update existing progress
      const { error: progressUpdateError } = await supabase
        .from('onboarding_progress')
        .update({
          total_sessions_required: existingProgress.total_sessions_required + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .eq('license_key_id', license_key_id)

      if (progressUpdateError) {
        console.warn('Error updating progress:', progressUpdateError)
      }
    } else {
      // Create new progress record
      const { error: progressCreateError } = await supabase
        .from('onboarding_progress')
        .insert([{
          user_id,
          license_key_id: license_key_id,
          total_sessions_required: 1,
          sessions_completed: 0,
          overall_status: 'in_progress',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (progressCreateError) {
        console.warn('Error creating progress:', progressCreateError)
      }
    }

    console.log('Session created successfully:', newSession)
    return NextResponse.json({
      session: newSession,
      message: 'Session created successfully'
    })

  } catch (error) {
    console.error('Unexpected error creating session:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}