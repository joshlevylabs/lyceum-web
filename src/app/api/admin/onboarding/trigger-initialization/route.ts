import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/onboarding/trigger-initialization - Trigger onboarding for new trial licenses
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      trigger_type, 
      license_created_after, 
      auto_schedule = false,
      admin_id 
    } = body

    if (!trigger_type || !['new_trial_licenses', 'all_trial_licenses', 'incomplete_onboarding'].includes(trigger_type)) {
      return NextResponse.json(
        { error: 'Valid trigger_type is required (new_trial_licenses, all_trial_licenses, incomplete_onboarding)' },
        { status: 400 }
      )
    }

    let targetUsers: any[] = []

    if (trigger_type === 'new_trial_licenses') {
      // Find trial licenses created after specified date without onboarding progress
      const afterDate = license_created_after || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Default: last 24 hours

      // Get from licenses table
      const { data: newLicenses } = await supabase
        .from('licenses')
        .select('*')
        .eq('license_type', 'trial')
        .gte('created_at', afterDate)
        .not('user_id', 'is', null)

      // Get from license_keys table
      const { data: newLicenseKeys } = await supabase
        .from('license_keys')
        .select('*')
        .eq('license_type', 'trial')
        .gte('created_at', afterDate)
        .not('assigned_to', 'is', null)

      // Combine and check for existing onboarding progress
      if (newLicenses) {
        for (const license of newLicenses) {
          const { data: existing } = await supabase
            .from('onboarding_progress')
            .select('id')
            .eq('user_id', license.user_id)
            .eq('license_id', license.id)
            .single()

          if (!existing) {
            targetUsers.push({
              user_id: license.user_id,
              license_id: license.id,
              license_type: license.license_type,
              plugin_id: license.plugin_id,
              created_at: license.created_at
            })
          }
        }
      }

      if (newLicenseKeys) {
        for (const licenseKey of newLicenseKeys) {
          const { data: existing } = await supabase
            .from('onboarding_progress')
            .select('id')
            .eq('user_id', licenseKey.assigned_to)
            .eq('license_key_id', licenseKey.id)
            .single()

          if (!existing) {
            targetUsers.push({
              user_id: licenseKey.assigned_to,
              license_key_id: licenseKey.id,
              license_type: licenseKey.license_type,
              plugin_id: licenseKey.plugin_id || 'centcom',
              created_at: licenseKey.created_at
            })
          }
        }
      }

    } else if (trigger_type === 'all_trial_licenses') {
      // Find all trial licenses without onboarding progress
      const { data: allLicenses } = await supabase
        .from('licenses')
        .select('*')
        .eq('license_type', 'trial')
        .not('user_id', 'is', null)

      const { data: allLicenseKeys } = await supabase
        .from('license_keys')
        .select('*')
        .eq('license_type', 'trial')
        .not('assigned_to', 'is', null)

      // Check for existing onboarding progress
      if (allLicenses) {
        for (const license of allLicenses) {
          const { data: existing } = await supabase
            .from('onboarding_progress')
            .select('id')
            .eq('user_id', license.user_id)
            .eq('license_id', license.id)
            .single()

          if (!existing) {
            targetUsers.push({
              user_id: license.user_id,
              license_id: license.id,
              license_type: license.license_type,
              plugin_id: license.plugin_id,
              created_at: license.created_at
            })
          }
        }
      }

      if (allLicenseKeys) {
        for (const licenseKey of allLicenseKeys) {
          const { data: existing } = await supabase
            .from('onboarding_progress')
            .select('id')
            .eq('user_id', licenseKey.assigned_to)
            .eq('license_key_id', licenseKey.id)
            .single()

          if (!existing) {
            targetUsers.push({
              user_id: licenseKey.assigned_to,
              license_key_id: licenseKey.id,
              license_type: licenseKey.license_type,
              plugin_id: licenseKey.plugin_id || 'centcom',
              created_at: licenseKey.created_at
            })
          }
        }
      }

    } else if (trigger_type === 'incomplete_onboarding') {
      // Find users with incomplete onboarding (pending or in_progress status)
      const { data: incompleteProgress } = await supabase
        .from('onboarding_progress')
        .select('*')
        .in('overall_status', ['pending', 'in_progress'])

      if (incompleteProgress) {
        targetUsers = incompleteProgress.map(progress => ({
          user_id: progress.user_id,
          license_id: progress.license_id,
          license_key_id: progress.license_key_id,
          license_type: 'trial',
          existing_progress: progress
        }))
      }
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({
        message: 'No users found matching the trigger criteria',
        trigger_type,
        found_users: 0
      })
    }

    // Initialize onboarding for target users
    const initializationResults = []

    for (const user of targetUsers) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/onboarding/auto-initialize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.user_id,
            license_id: user.license_id,
            license_key_id: user.license_key_id,
            force: trigger_type === 'incomplete_onboarding'
          })
        })

        const result = await response.json()
        
        initializationResults.push({
          user_id: user.user_id,
          license_id: user.license_id,
          license_key_id: user.license_key_id,
          success: response.ok && result.initialized,
          ...result
        })

        // Auto-schedule first session if requested
        if (auto_schedule && admin_id && result.initialized && result.sessions) {
          const firstSession = result.sessions.find((s: any) => s.session_number === 1)
          if (firstSession) {
            try {
              const scheduleTime = new Date()
              scheduleTime.setDate(scheduleTime.getDate() + 2) // Schedule 2 days from now
              scheduleTime.setHours(10, 0, 0, 0) // 10 AM

              await fetch('/api/admin/onboarding/sessions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  session_id: firstSession.id,
                  scheduled_at: scheduleTime.toISOString(),
                  assigned_admin_id: admin_id,
                  status: 'scheduled'
                })
              })
            } catch (scheduleError) {
              console.error('Error auto-scheduling session:', scheduleError)
            }
          }
        }

      } catch (error) {
        initializationResults.push({
          user_id: user.user_id,
          license_id: user.license_id,
          license_key_id: user.license_key_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = initializationResults.filter(r => r.success).length
    const failureCount = initializationResults.filter(r => !r.success).length

    return NextResponse.json({
      message: `Onboarding initialization triggered for ${targetUsers.length} users`,
      trigger_type,
      summary: {
        found_users: targetUsers.length,
        successfully_initialized: successCount,
        failed: failureCount,
        auto_scheduled: auto_schedule
      },
      results: initializationResults
    })

  } catch (error) {
    console.error('Error triggering onboarding initialization:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/admin/onboarding/trigger-initialization - Preview what would be initialized
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const triggerType = searchParams.get('trigger_type') || 'new_trial_licenses'
    const licenseCreatedAfter = searchParams.get('license_created_after')

    let targetUsers: any[] = []

    if (triggerType === 'new_trial_licenses') {
      const afterDate = licenseCreatedAfter || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      // Preview new licenses
      const { data: newLicenses } = await supabase
        .from('licenses')
        .select(`
          *,
          user_profiles!user_id (
            email,
            full_name,
            company
          )
        `)
        .eq('license_type', 'trial')
        .gte('created_at', afterDate)
        .not('user_id', 'is', null)

      const { data: newLicenseKeys } = await supabase
        .from('license_keys')
        .select(`
          *,
          user_profiles!assigned_to (
            email,
            full_name,
            company
          )
        `)
        .eq('license_type', 'trial')
        .gte('created_at', afterDate)
        .not('assigned_to', 'is', null)

      // Check existing progress and compile list
      if (newLicenses) {
        for (const license of newLicenses) {
          const { data: existing } = await supabase
            .from('onboarding_progress')
            .select('id, overall_status')
            .eq('user_id', license.user_id)
            .eq('license_id', license.id)
            .single()

          targetUsers.push({
            user_id: license.user_id,
            license_id: license.id,
            license_type: license.license_type,
            user_email: license.user_profiles?.email,
            user_name: license.user_profiles?.full_name,
            company: license.user_profiles?.company,
            has_existing_progress: !!existing,
            existing_status: existing?.overall_status,
            created_at: license.created_at
          })
        }
      }

      if (newLicenseKeys) {
        for (const licenseKey of newLicenseKeys) {
          const { data: existing } = await supabase
            .from('onboarding_progress')
            .select('id, overall_status')
            .eq('user_id', licenseKey.assigned_to)
            .eq('license_key_id', licenseKey.id)
            .single()

          targetUsers.push({
            user_id: licenseKey.assigned_to,
            license_key_id: licenseKey.id,
            license_type: licenseKey.license_type,
            user_email: licenseKey.user_profiles?.email,
            user_name: licenseKey.user_profiles?.full_name,
            company: licenseKey.user_profiles?.company,
            has_existing_progress: !!existing,
            existing_status: existing?.overall_status,
            created_at: licenseKey.created_at
          })
        }
      }

    } else if (triggerType === 'all_trial_licenses') {
      // Similar logic for all trial licenses - abbreviated for space
      const { data: allLicenses } = await supabase
        .from('licenses')
        .select(`
          *,
          user_profiles!user_id (
            email,
            full_name,
            company
          )
        `)
        .eq('license_type', 'trial')
        .not('user_id', 'is', null)

      if (allLicenses) {
        for (const license of allLicenses) {
          const { data: existing } = await supabase
            .from('onboarding_progress')
            .select('id, overall_status')
            .eq('user_id', license.user_id)
            .eq('license_id', license.id)
            .single()

          targetUsers.push({
            user_id: license.user_id,
            license_id: license.id,
            license_type: license.license_type,
            user_email: license.user_profiles?.email,
            user_name: license.user_profiles?.full_name,
            company: license.user_profiles?.company,
            has_existing_progress: !!existing,
            existing_status: existing?.overall_status,
            created_at: license.created_at
          })
        }
      }

    } else if (triggerType === 'incomplete_onboarding') {
      const { data: incompleteProgress } = await supabase
        .from('onboarding_progress')
        .select(`
          *,
          user_profiles!user_id (
            email,
            full_name,
            company
          )
        `)
        .in('overall_status', ['pending', 'in_progress'])

      if (incompleteProgress) {
        targetUsers = incompleteProgress.map(progress => ({
          user_id: progress.user_id,
          license_id: progress.license_id,
          license_key_id: progress.license_key_id,
          license_type: 'trial',
          user_email: progress.user_profiles?.email,
          user_name: progress.user_profiles?.full_name,
          company: progress.user_profiles?.company,
          has_existing_progress: true,
          existing_status: progress.overall_status,
          sessions_completed: progress.sessions_completed,
          total_sessions_required: progress.total_sessions_required,
          deadline: progress.onboarding_deadline
        }))
      }
    }

    const needsInitialization = targetUsers.filter(u => !u.has_existing_progress || triggerType === 'incomplete_onboarding')
    const alreadyHasProgress = targetUsers.filter(u => u.has_existing_progress && triggerType !== 'incomplete_onboarding')

    return NextResponse.json({
      preview: true,
      trigger_type: triggerType,
      total_users: targetUsers.length,
      needs_initialization: needsInitialization.length,
      already_has_progress: alreadyHasProgress.length,
      users: targetUsers,
      summary: {
        would_initialize: needsInitialization.length,
        would_skip: alreadyHasProgress.length
      }
    })

  } catch (error) {
    console.error('Error previewing onboarding initialization:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
