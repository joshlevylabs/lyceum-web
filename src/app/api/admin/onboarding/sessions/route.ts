import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force explicit values to avoid environment variable loading issues
const supabaseUrl = 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

console.log('Onboarding Sessions API: Creating Supabase client with URL:', supabaseUrl)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET /api/admin/onboarding/sessions - Get onboarding sessions with filtering
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/admin/onboarding/sessions - Starting request...')
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const adminId = searchParams.get('admin_id')
    const status = searchParams.get('status')
    const scheduled = searchParams.get('scheduled') === 'true'
    const upcoming = searchParams.get('upcoming') === 'true'
    const past = searchParams.get('past') === 'true'

    console.log('Checking if onboarding_sessions table exists...')
    
    // Check if onboarding_sessions table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('onboarding_sessions')
      .select('id')
      .limit(1)

    console.log('Table check result:', { tableCheck, tableError })

    if (tableError) {
      console.log('Table error detected:', tableError)
      if (tableError.code === '42P01') {
        // Table doesn't exist, return helpful message
        return NextResponse.json({
          sessions: [],
          error: 'Onboarding tables not set up yet',
          message: 'Please run the setup SQL script in your Supabase console first',
          setup_required: true
        })
      } else {
        // Other database error
        console.error('Database error:', tableError)
        return NextResponse.json({
          sessions: [],
          error: `Database error: ${tableError.message}`,
          details: tableError,
          setup_required: false
        }, { status: 500 })
      }
    }

    console.log('Table exists, building query...')
    
    // Start with a simple query to test basic functionality
    let query = supabase
      .from('onboarding_sessions')
      .select('*')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (adminId) {
      query = query.eq('assigned_admin_id', adminId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (scheduled) {
      query = query.not('scheduled_at', 'is', null)
    }

    if (upcoming) {
      query = query
        .gte('scheduled_at', new Date().toISOString())
        .in('status', ['scheduled', 'in_progress'])
    }

    if (past) {
      query = query
        .lt('scheduled_at', new Date().toISOString())
        .in('status', ['completed', 'cancelled', 'no_show'])
    }

    console.log('Executing query...')
    const { data, error } = await query.order('created_at', { ascending: false })

    console.log('Query result:', { data: data?.length || 0, error })

    if (error) {
      console.error('Query error:', error)
      return NextResponse.json({ 
        error: `Query error: ${error.message}`, 
        details: error 
      }, { status: 500 })
    }

    // Enrich data with calculated fields
    const enrichedSessions = data?.map(session => {
      const isUpcoming = session.scheduled_at && new Date(session.scheduled_at) > new Date()
      const isPast = session.scheduled_at && new Date(session.scheduled_at) < new Date()
      const minutesUntil = session.scheduled_at 
        ? Math.ceil((new Date(session.scheduled_at).getTime() - new Date().getTime()) / (1000 * 60))
        : null

      return {
        ...session,
        is_upcoming: isUpcoming,
        is_past: isPast,
        minutes_until_session: minutesUntil,
        formatted_scheduled_time: session.scheduled_at 
          ? new Date(session.scheduled_at).toLocaleString()
          : null
      }
    })

    return NextResponse.json({ sessions: enrichedSessions })

  } catch (error) {
    console.error('Unexpected error in onboarding sessions API:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error 
    }, { status: 500 })
  }
}

// POST /api/admin/onboarding/sessions - Create new onboarding session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      user_id,
      license_id,
      license_key_id,
      plugin_id = 'centcom',
      session_type = 'standard',
      session_number = 1,
      title,
      description,
      duration_minutes = 30,
      scheduled_at,
      assigned_admin_id
    } = body

    if (!user_id || !title) {
      return NextResponse.json(
        { error: 'user_id and title are required' },
        { status: 400 }
      )
    }

    // Clean up timestamp and UUID fields - convert empty strings to null
    const cleanScheduledAt = scheduled_at && scheduled_at.trim() !== '' ? scheduled_at : null
    const cleanAssignedAdminId = assigned_admin_id && assigned_admin_id.trim() !== '' ? assigned_admin_id : null
    const cleanLicenseId = license_id && license_id.trim() !== '' ? license_id : null
    const cleanLicenseKeyId = license_key_id && license_key_id.trim() !== '' ? license_key_id : null

    const sessionData = {
      user_id,
      license_id: cleanLicenseId,
      license_key_id: cleanLicenseKeyId,
      plugin_id,
      session_type,
      session_number,
      title,
      description: description || `Onboarding session ${session_number} for ${plugin_id}`,
      duration_minutes,
      scheduled_at: cleanScheduledAt,
      assigned_admin_id: cleanAssignedAdminId,
      status: cleanScheduledAt ? 'scheduled' : 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('onboarding_sessions')
      .insert([sessionData])
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create reminder for the session if scheduled
    if (scheduled_at && data) {
      await createSessionReminder(data.id, user_id, scheduled_at)
    }

    return NextResponse.json({ session: data })

  } catch (error) {
    console.error('Error creating onboarding session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/onboarding/sessions - Update existing session
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, ...updateData } = body

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      )
    }

    // Clean up timestamp and UUID fields - convert empty strings to null
    const cleanedUpdateData = { ...updateData }
    Object.keys(cleanedUpdateData).forEach(key => {
      if (typeof cleanedUpdateData[key] === 'string') {
        // Handle timestamp fields
        if (key.includes('_at') || key === 'scheduled_at') {
          cleanedUpdateData[key] = cleanedUpdateData[key].trim() !== '' ? cleanedUpdateData[key] : null
        }
        // Handle UUID fields
        if (key.includes('_id') || key === 'assigned_admin_id') {
          cleanedUpdateData[key] = cleanedUpdateData[key].trim() !== '' ? cleanedUpdateData[key] : null
        }
      }
    })

    // Add updated timestamp
    cleanedUpdateData.updated_at = new Date().toISOString()

    // Handle status changes
    if (cleanedUpdateData.status === 'completed' && !cleanedUpdateData.completed_at) {
      cleanedUpdateData.completed_at = new Date().toISOString()
    }
    if (cleanedUpdateData.status === 'in_progress' && !cleanedUpdateData.started_at) {
      cleanedUpdateData.started_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('onboarding_sessions')
      .update(cleanedUpdateData)
      .eq('id', session_id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If session was completed, update progress
    if (updateData.status === 'completed') {
      await updateOnboardingProgress(data.user_id, data.license_id, data.license_key_id, true)
    }

    return NextResponse.json({ session: data })

  } catch (error) {
    console.error('Error updating onboarding session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to create session reminder
async function createSessionReminder(sessionId: string, userId: string, scheduledAt: string) {
  try {
    // Create reminder 24 hours before session
    const reminderTime = new Date(scheduledAt)
    reminderTime.setHours(reminderTime.getHours() - 24)

    const { error } = await supabase
      .from('onboarding_reminders')
      .insert([{
        user_id: userId,
        session_id: sessionId,
        reminder_type: 'session_scheduled',
        reminder_method: 'email',
        scheduled_for: reminderTime.toISOString(),
        subject: 'Onboarding Session Reminder',
        message: `You have an onboarding session scheduled for ${new Date(scheduledAt).toLocaleString()}. Please make sure to attend to keep your trial license active.`
      }])

    if (error) {
      console.error('Error creating session reminder:', error)
    }
  } catch (error) {
    console.error('Error in createSessionReminder:', error)
  }
}

// Helper function to update onboarding progress
async function updateOnboardingProgress(userId: string, licenseId?: string, licenseKeyId?: string, sessionCompleted = false) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/onboarding/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        license_id: licenseId,
        license_key_id: licenseKeyId,
        session_completed: sessionCompleted
      })
    })

    if (!response.ok) {
      console.error('Failed to update onboarding progress')
    }
  } catch (error) {
    console.error('Error updating onboarding progress:', error)
  }
}
