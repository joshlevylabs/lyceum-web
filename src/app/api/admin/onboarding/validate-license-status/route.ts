import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force explicit values to avoid environment variable loading issues
const supabaseUrl = 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST /api/admin/onboarding/validate-license-status - Check if license should remain active based on onboarding progress
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { license_key, license_id, license_key_id, user_id, plugin_id } = body

    if (!license_key && !license_id && !license_key_id) {
      return NextResponse.json(
        { error: 'Either license_key, license_id, or license_key_id is required' },
        { status: 400 }
      )
    }

    // Get license information
    let licenseData: any = null
    let licenseUserId: string | null = null

    if (license_key) {
      // Parse license key to get information
      try {
        const [dataStr] = license_key.split('.')
        const decodedData = Buffer.from(dataStr, 'base64').toString('utf8')
        const [key_id, licensePluginId, parsedUserId] = decodedData.split(':')
        
        // Get license from database
        const { data: keyData } = await supabase
          .from('licenses')
          .select('*')
          .eq('key_id', key_id)
          .single()

        if (keyData) {
          licenseData = keyData
          licenseUserId = keyData.user_id || parsedUserId
        }
      } catch (error) {
        console.error('Error parsing license key:', error)
      }
    } else if (license_id) {
      const { data } = await supabase
        .from('licenses')
        .select('*')
        .eq('id', license_id)
        .single()
      licenseData = data
      licenseUserId = data?.user_id
    } else if (license_key_id) {
      const { data } = await supabase
        .from('license_keys')
        .select('*')
        .eq('id', license_key_id)
        .single()
      licenseData = data
      licenseUserId = data?.assigned_to
    }

    if (!licenseData) {
      return NextResponse.json({ 
        valid: false, 
        reason: 'License not found',
        action: 'deny_access'
      })
    }

    // Use provided user_id or extracted user_id
    const effectiveUserId = user_id || licenseUserId

    // Only check onboarding for trial licenses
    if (licenseData.license_type !== 'trial') {
      return NextResponse.json({
        valid: true,
        reason: 'Non-trial license - onboarding not required',
        action: 'allow_access',
        license_type: licenseData.license_type
      })
    }

    // Check if license is already expired or revoked
    if (licenseData.status === 'revoked' || licenseData.revoked) {
      return NextResponse.json({
        valid: false,
        reason: 'License has been revoked',
        action: 'deny_access'
      })
    }

    if (licenseData.expires_at && new Date(licenseData.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        reason: 'License has expired',
        action: 'deny_access'
      })
    }

    if (!effectiveUserId) {
      return NextResponse.json({
        valid: false,
        reason: 'No user associated with trial license',
        action: 'deny_access'
      })
    }

    // Get onboarding progress for this user/license combination
    let progressQuery = supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', effectiveUserId)

    if (license_id) {
      progressQuery = progressQuery.eq('license_id', license_id)
    } else if (license_key_id) {
      progressQuery = progressQuery.eq('license_key_id', license_key_id)
    }

    const { data: progress } = await progressQuery.single()

    if (!progress) {
      // No onboarding progress record - need to create one and start onboarding
      return NextResponse.json({
        valid: false,
        reason: 'Trial license requires onboarding - no progress record found',
        action: 'require_onboarding',
        user_id: effectiveUserId,
        license_id,
        license_key_id,
        next_steps: 'Contact administrator to schedule onboarding sessions'
      })
    }

    // Check if onboarding is completed
    if (progress.overall_status === 'completed') {
      return NextResponse.json({
        valid: true,
        reason: 'Onboarding completed successfully',
        action: 'allow_access',
        progress: {
          status: progress.overall_status,
          sessions_completed: progress.sessions_completed,
          total_required: progress.total_sessions_required,
          completed_at: progress.completed_at
        }
      })
    }

    // Check if onboarding is overdue
    const now = new Date()
    const deadline = new Date(progress.onboarding_deadline)
    
    if (now > deadline) {
      // Suspend the license if it's overdue
      await supabase
        .from('onboarding_progress')
        .update({
          overall_status: 'overdue',
          license_active_status: false,
          license_suspended_at: now.toISOString(),
          license_suspension_reason: 'Onboarding deadline exceeded',
          updated_at: now.toISOString()
        })
        .eq('id', progress.id)

      // Also update the license status
      if (license_id) {
        await supabase
          .from('licenses')
          .update({ status: 'suspended' })
          .eq('id', license_id)
      } else if (license_key_id) {
        await supabase
          .from('license_keys')
          .update({ status: 'suspended' })
          .eq('id', license_key_id)
      }

      return NextResponse.json({
        valid: false,
        reason: 'Trial license suspended - onboarding deadline exceeded',
        action: 'license_suspended',
        deadline: progress.onboarding_deadline,
        days_overdue: Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)),
        next_steps: 'Contact administrator to reactivate license and complete onboarding'
      })
    }

    // Check if onboarding is in progress but approaching deadline
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilDeadline <= 7) {
      // Allow access but warn about approaching deadline
      return NextResponse.json({
        valid: true,
        reason: 'Onboarding in progress - deadline approaching',
        action: 'allow_access_with_warning',
        warning: `Onboarding must be completed within ${daysUntilDeadline} days to maintain license access`,
        progress: {
          status: progress.overall_status,
          sessions_completed: progress.sessions_completed,
          total_required: progress.total_sessions_required,
          deadline: progress.onboarding_deadline,
          days_remaining: daysUntilDeadline
        },
        next_steps: 'Schedule remaining onboarding sessions with administrator'
      })
    }

    // Regular onboarding in progress
    return NextResponse.json({
      valid: true,
      reason: 'Onboarding in progress',
      action: 'allow_access',
      progress: {
        status: progress.overall_status,
        sessions_completed: progress.sessions_completed,
        total_required: progress.total_sessions_required,
        deadline: progress.onboarding_deadline,
        days_remaining: daysUntilDeadline
      },
      next_steps: progress.sessions_completed === 0 
        ? 'Schedule your first onboarding session with administrator'
        : 'Continue with scheduled onboarding sessions'
    })

  } catch (error) {
    console.error('Error validating license status:', error)
    return NextResponse.json({ 
      valid: false, 
      reason: 'Internal server error during validation',
      action: 'deny_access'
    }, { status: 500 })
  }
}
