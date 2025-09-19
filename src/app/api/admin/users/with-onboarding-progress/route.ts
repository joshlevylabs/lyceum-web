import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force explicit values to avoid environment variable loading issues
const supabaseUrl = 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET /api/admin/users/with-onboarding-progress - Get all users with their comprehensive onboarding progress
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/admin/users/with-onboarding-progress - Starting request...')
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const includeInactive = searchParams.get('include_inactive') === 'true'

    // First, get all users
    let usersQuery = supabase
      .from('user_profiles')
      .select('id, email, full_name, company, created_at')

    if (userId) {
      usersQuery = usersQuery.eq('id', userId)
    }

    const { data: users, error: usersError } = await usersQuery

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({
        users: [],
        error: `Database error: ${usersError.message}`,
        details: usersError
      }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        users: [],
        message: 'No users found'
      })
    }

    // For each user, get their licenses and onboarding progress
    const usersWithProgress = await Promise.all(
      users.map(async (user) => {
        // Get user's licenses
        let licensesQuery = supabase
          .from('license_keys')
          .select('id, key_code, license_type, status, expires_at, enabled_plugins')
          .eq('assigned_to', user.id)

        if (!includeInactive) {
          licensesQuery = licensesQuery.eq('status', 'active')
        }

        const { data: licenses, error: licensesError } = await licensesQuery

        if (licensesError) {
          console.warn(`Error fetching licenses for user ${user.id}:`, licensesError)
          return {
            ...user,
            licenses: []
          }
        }

        // For each license, get onboarding progress
        const licensesWithProgress = await Promise.all(
          (licenses || []).map(async (license) => {
            // Get onboarding progress for this license
            const { data: progressData, error: progressError } = await supabase
              .from('onboarding_progress')
              .select(`
                plugin_id,
                total_sessions_required,
                sessions_completed,
                overall_status,
                onboarding_deadline,
                completion_rate,
                is_overdue,
                days_until_deadline,
                created_at,
                updated_at
              `)
              .eq('user_id', user.id)
              .eq('license_key_id', license.id)

            if (progressError) {
              console.warn(`Error fetching progress for license ${license.id}:`, progressError)
            }

            // Get sessions for this license/user combination
            const { data: allSessions, error: sessionsError } = await supabase
              .from('onboarding_sessions')
              .select(`
                id,
                title,
                description,
                duration_minutes,
                scheduled_at,
                status,
                plugin_id,
                session_number,
                is_mandatory,
                created_at,
                updated_at
              `)
              .eq('user_id', user.id)
              .eq('license_key_id', license.id)
              .order('scheduled_at', { ascending: true })

            if (sessionsError) {
              console.warn(`Error fetching sessions for license ${license.id}:`, sessionsError)
            }

            // Process onboarding progress for each plugin
            const onboardingProgress = (progressData || []).map(progress => {
              const sessions = allSessions || []
              const pluginSessions = sessions.filter(s => s.plugin_id === progress.plugin_id)

              const completedSessions = pluginSessions.filter(s => s.status === 'completed')
              const upcomingSessions = pluginSessions.filter(s => 
                s.status === 'scheduled' || s.status === 'pending'
              )

              // Use database values if available, otherwise calculate
              const completionRate = progress.completion_rate !== null && progress.completion_rate !== undefined
                ? progress.completion_rate
                : (progress.total_sessions_required > 0 
                    ? Math.round((progress.sessions_completed / progress.total_sessions_required) * 100)
                    : 0)

              // Use database values if available, otherwise calculate
              let daysUntilDeadline = progress.days_until_deadline
              let isOverdue = progress.is_overdue || false
              
              if ((daysUntilDeadline === null || daysUntilDeadline === undefined) && progress.onboarding_deadline) {
                const deadline = new Date(progress.onboarding_deadline)
                const now = new Date()
                const diffTime = deadline.getTime() - now.getTime()
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                
                daysUntilDeadline = diffDays
                isOverdue = diffDays < 0
              }

              return {
                plugin_id: progress.plugin_id,
                total_sessions_required: progress.total_sessions_required,
                sessions_completed: progress.sessions_completed,
                overall_status: progress.overall_status,
                completion_rate: completionRate,
                is_overdue: isOverdue,
                days_until_deadline: daysUntilDeadline,
                onboarding_deadline: progress.onboarding_deadline,
                upcoming_sessions: upcomingSessions,
                completed_sessions: completedSessions
              }
            })

            return {
              ...license,
              onboarding_progress: onboardingProgress
            }
          })
        )

        return {
          ...user,
          licenses: licensesWithProgress
        }
      })
    )

    // Sort users by name/email
    usersWithProgress.sort((a, b) => {
      const nameA = a.full_name || a.email
      const nameB = b.full_name || b.email
      return nameA.localeCompare(nameB)
    })

    console.log(`Successfully fetched ${usersWithProgress.length} users with progress`)

    return NextResponse.json({
      users: usersWithProgress,
      total: usersWithProgress.length,
      message: `Found ${usersWithProgress.length} users`
    })

  } catch (error) {
    console.error('Error in users with onboarding progress endpoint:', error)
    return NextResponse.json({
      users: [],
      error: 'Internal server error',
      details: error
    }, { status: 500 })
  }
}

// POST /api/admin/users/with-onboarding-progress - Refresh/recalculate onboarding progress for users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_ids } = body

    if (!user_ids || !Array.isArray(user_ids)) {
      return NextResponse.json(
        { error: 'user_ids array is required' },
        { status: 400 }
      )
    }

    // For each user, recalculate their onboarding progress
    const results = await Promise.all(
      user_ids.map(async (userId) => {
        try {
          // Get user's active licenses
          const { data: licenses } = await supabase
            .from('license_keys')
            .select('id, license_type, enabled_plugins')
            .eq('user_id', userId)
            .eq('status', 'active')

          if (!licenses || licenses.length === 0) {
            return { userId, status: 'no_licenses' }
          }

          // For each license, check if onboarding progress exists and update it
          for (const license of licenses) {
            // Only trial licenses require onboarding
            if (license.license_type !== 'trial') {
              continue
            }

            // Get or create onboarding progress for each enabled plugin
            for (const plugin of license.enabled_plugins) {
              // Check if progress record exists
              const { data: existingProgress } = await supabase
                .from('onboarding_progress')
                .select('id')
                .eq('user_id', userId)
                .eq('license_key_id', license.id)
                .eq('plugin_id', plugin)
                .single()

              if (!existingProgress) {
                // Create new progress record
                const { error: createError } = await supabase
                  .from('onboarding_progress')
                  .insert([{
                    user_id: userId,
                    license_key_id: license.id,
                    plugin_id: plugin,
                    total_sessions_required: 3, // Default requirement
                    sessions_completed: 0,
                    overall_status: 'not_started',
                    onboarding_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }])

                if (createError) {
                  console.error(`Error creating progress for user ${userId}, plugin ${plugin}:`, createError)
                }
              }
            }
          }

          return { userId, status: 'updated' }
        } catch (error) {
          console.error(`Error updating progress for user ${userId}:`, error)
          return { userId, status: 'error', error: error.message }
        }
      })
    )

    return NextResponse.json({
      results,
      message: `Processed ${user_ids.length} users`
    })

  } catch (error) {
    console.error('Error in POST users with onboarding progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

