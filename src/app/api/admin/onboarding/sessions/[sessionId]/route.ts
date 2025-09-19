import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force explicit values to avoid environment variable loading issues
const supabaseUrl = 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET /api/admin/onboarding/sessions/[sessionId] - Get specific session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    const { data: session, error } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ session })

  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/onboarding/sessions/[sessionId] - Update specific session
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const body = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    // Clean up timestamp and UUID fields - convert empty strings to null
    const cleanedBody = { ...body }
    Object.keys(cleanedBody).forEach(key => {
      if (typeof cleanedBody[key] === 'string') {
        // Handle timestamp fields
        if (key.includes('_at') || key === 'scheduled_at') {
          cleanedBody[key] = cleanedBody[key].trim() !== '' ? cleanedBody[key] : null
        }
        // Handle UUID fields
        if (key.includes('_id') || key === 'assigned_admin_id') {
          cleanedBody[key] = cleanedBody[key].trim() !== '' ? cleanedBody[key] : null
        }
      }
    })

    // Add updated timestamp
    const updateData = {
      ...cleanedBody,
      updated_at: new Date().toISOString()
    }

    // Handle status changes
    if (updateData.status === 'completed' && !updateData.completed_at) {
      updateData.completed_at = new Date().toISOString()
    }
    if (updateData.status === 'in_progress' && !updateData.started_at) {
      updateData.started_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('onboarding_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select('*')
      .single()

    if (error) {
      console.error('Database error updating session:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // If session was completed, update progress
    if (updateData.status === 'completed') {
      try {
        await updateOnboardingProgress(data.user_id, data.license_id, data.license_key_id, true)
      } catch (progressError) {
        console.error('Error updating progress:', progressError)
        // Don't fail the session update if progress update fails
      }
    }

    // Create reminder if session was scheduled
    if (updateData.scheduled_at && data) {
      try {
        await createSessionReminder(data.id, data.user_id, updateData.scheduled_at)
      } catch (reminderError) {
        console.error('Error creating reminder:', reminderError)
        // Don't fail the session update if reminder creation fails
      }
    }

    return NextResponse.json({ 
      session: data,
      message: 'Session updated successfully' 
    })

  } catch (error) {
    console.error('Error updating onboarding session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/onboarding/sessions/[sessionId] - Delete specific session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    const { error } = await supabase
      .from('onboarding_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Session deleted successfully' 
    })

  } catch (error) {
    console.error('Error deleting session:', error)
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
    // For now, just log that we would update progress
    // In a full implementation, this would call the progress API
    console.log('Would update onboarding progress for user:', userId, 'session completed:', sessionCompleted)
  } catch (error) {
    console.error('Error updating onboarding progress:', error)
  }
}
