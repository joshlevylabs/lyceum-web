import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTczMjQ3MywiZXhwIjoyMDQxMzA4NDczfQ.5ChKYGTchkJaFLEE7_2y-1y--r9sFUj_YDk8h2WlQjU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    console.log('User onboarding sessions API - Starting request...')
    
    // Get user ID from the authorization header or session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.log('No authorization header found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the user using the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.log('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    console.log('Fetching onboarding sessions for user:', userId)

    // Fetch user's onboarding sessions (simplified query to avoid foreign key issues)
    const { data: sessions, error: sessionsError } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    let enrichedSessions = sessions || []
    
    // Fetch license information separately to avoid foreign key relationship errors
    if (sessions && sessions.length > 0) {
      const licenseIds = [...new Set(sessions.map(s => s.license_key_id).filter(Boolean))]
      
      if (licenseIds.length > 0) {
        const { data: licenses, error: licenseError } = await supabase
          .from('license_keys')
          .select('id, key_code, license_type, status, features, enabled_plugins, expires_at')
          .in('id', licenseIds)

        if (!licenseError && licenses) {
          // Attach license data to sessions
          enrichedSessions = sessions.map(session => ({
            ...session,
            license_keys: licenses.find(license => license.id === session.license_key_id) || null
          }))
        }
      }
    }

    if (sessionsError) {
      console.error('Error fetching user sessions:', sessionsError)
      return NextResponse.json(
        { error: 'Failed to fetch onboarding sessions', details: sessionsError.message },
        { status: 500 }
      )
    }

    // Fetch user's onboarding progress
    const { data: progress, error: progressError } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', userId)

    if (progressError) {
      console.error('Error fetching user progress:', progressError)
      return NextResponse.json(
        { error: 'Failed to fetch onboarding progress', details: progressError.message },
        { status: 500 }
      )
    }

    // Group sessions by status
    const upcomingSessions = enrichedSessions.filter(s => 
      ['scheduled', 'pending', 'rescheduled'].includes(s.status)
    )
    
    const completedSessions = enrichedSessions.filter(s => 
      s.status === 'completed'
    )
    
    const cancelledSessions = enrichedSessions.filter(s => 
      s.status === 'cancelled'
    )

    console.log(`Found ${enrichedSessions.length} total sessions for user ${userId}`)
    console.log(`Upcoming: ${upcomingSessions.length}, Completed: ${completedSessions.length}, Cancelled: ${cancelledSessions.length}`)

    return NextResponse.json({
      user_id: userId,
      sessions: {
        upcoming: upcomingSessions,
        completed: completedSessions,
        cancelled: cancelledSessions,
        all: enrichedSessions
      },
      progress: progress || [],
      summary: {
        total_sessions: enrichedSessions.length,
        upcoming_count: upcomingSessions.length,
        completed_count: completedSessions.length,
        cancelled_count: cancelledSessions.length,
        completion_rate: enrichedSessions.length > 0 
          ? Math.round((completedSessions.length / enrichedSessions.length) * 100)
          : 0
      }
    })

  } catch (error) {
    console.error('Unexpected error in user onboarding sessions API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('User onboarding session update API - Starting request...')
    
    // Get user ID from the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.log('No authorization header found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.log('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const body = await request.json()
    const { session_id, scheduled_at, duration_minutes } = body

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    console.log('Updating session for user:', userId, 'session:', session_id)

    // Verify that the session belongs to the user
    const { data: existingSession, error: verifyError } = await supabase
      .from('onboarding_sessions')
      .select('id, user_id')
      .eq('id', session_id)
      .eq('user_id', userId)
      .single()

    if (verifyError || !existingSession) {
      console.log('Session verification failed:', verifyError)
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Clean up timestamp field - only add if valid
    if (scheduled_at && scheduled_at.trim() !== '') {
      updateData.scheduled_at = scheduled_at
      updateData.status = 'scheduled'
    }

    if (duration_minutes && duration_minutes > 0) {
      updateData.duration_minutes = duration_minutes
    }

    // Update the session
    const { data, error } = await supabase
      .from('onboarding_sessions')
      .update(updateData)
      .eq('id', session_id)
      .eq('user_id', userId) // Extra security check
      .select('*')
      .single()

    if (error) {
      console.error('Error updating session:', error)
      return NextResponse.json(
        { error: 'Failed to update session', details: error.message },
        { status: 500 }
      )
    }

    console.log('Successfully updated session:', session_id)
    return NextResponse.json({ 
      message: 'Session updated successfully',
      session: data
    })

  } catch (error) {
    console.error('Unexpected error in user session update API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
