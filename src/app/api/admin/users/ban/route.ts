import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-direct'

/**
 * Ban a user (prevents login at auth level)
 * POST /api/admin/users/ban
 * Body: { user_id: string, duration?: string, reason?: string }
 */
export async function POST(request: NextRequest) {
  console.log('=== BAN USER API CALLED ===')
  try {
    console.log('Step 1: Checking admin access...')
    const { success, user, response } = await requireAdmin(request)
    if (!success) {
      console.log('Admin check failed:', { success, hasUser: !!user })
      return response || NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.log('Step 2: Admin verified, parsing body...')

    const body = await request.json()
    console.log('Step 3: Body parsed:', { user_id: body.user_id, hasDuration: !!body.duration, hasReason: !!body.reason })
    // Default: ~10 years (87600h) - permanent enough but within safe limits
    const { user_id, duration = '87600h', reason } = body

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    console.log('Admin ban request:', { user_id, duration, reason, admin_id: user.id })

    // Get user first to check if they exist
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(user_id)
    if (getUserError || !existingUser) {
      console.error('User not found:', getUserError)
      return NextResponse.json({
        error: 'User not found',
        details: getUserError?.message
      }, { status: 404 })
    }

    console.log('User found:', existingUser.user?.email, 'Attempting to ban...')

    const userEmail = existingUser.user?.email

    // 1. Ban the user at auth level
    // Try multiple methods to ensure the ban works
    console.log('Attempting to ban user with duration:', duration)

    let updatedUser
    let banError

    try {
      // Method 1: Try ban_duration first (newer Supabase versions)
      const result = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: duration,
        // Also set app_metadata to mark as banned (fallback)
        app_metadata: {
          banned: true,
          banned_at: new Date().toISOString(),
          banned_reason: reason || 'Banned by admin'
        }
      })
      updatedUser = result.data
      banError = result.error

      // If ban_duration failed but user was updated, try alternative approach
      if (banError && banError.message?.includes('ban_duration')) {
        console.log('ban_duration not supported, trying alternative method...')
        // Method 2: Just use app_metadata and disable email confirmation
        const altResult = await supabaseAdmin.auth.admin.updateUserById(user_id, {
          app_metadata: {
            banned: true,
            banned_at: new Date().toISOString(),
            banned_reason: reason || 'Banned by admin'
          },
          email_confirm: false
        })
        updatedUser = altResult.data
        banError = altResult.error
      }

      console.log('Ban API result:', { hasData: !!updatedUser, error: banError?.message })
    } catch (err: any) {
      console.error('Ban API exception:', err)
      // Try one more fallback - just update app_metadata
      try {
        const fallbackResult = await supabaseAdmin.auth.admin.updateUserById(user_id, {
          app_metadata: {
            banned: true,
            banned_at: new Date().toISOString(),
            banned_reason: reason || 'Banned by admin'
          }
        })
        updatedUser = fallbackResult.data
        banError = fallbackResult.error
        console.log('Fallback ban result:', { hasData: !!updatedUser, error: banError?.message })
      } catch (fallbackErr: any) {
        console.error('Fallback ban also failed:', fallbackErr)
        return NextResponse.json({
          error: 'Failed to ban user',
          details: err.message || 'Exception during ban operation'
        }, { status: 500 })
      }
    }

    if (banError) {
      console.error('Error banning user:', banError)
      return NextResponse.json({
        error: 'Failed to ban user',
        details: banError.message
      }, { status: 500 })
    }

    console.log('✓ Auth account banned/marked')

    // 2. Mark as banned and inactive in user_profiles
    // Note: account_status column may not exist, only update is_active
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)

    if (profileError) {
      console.warn('Failed to update user profile:', profileError)
    } else {
      console.log('✓ Profile marked as banned')
    }

    // 3. Add email to banned emails list (create table if needed)
    if (userEmail) {
      const { error: bannedEmailError } = await supabaseAdmin
        .from('banned_emails')
        .upsert({
          email: userEmail.toLowerCase(),
          reason: reason || 'Banned by admin',
          banned_at: new Date().toISOString(),
          banned_by: user.id
        }, {
          onConflict: 'email'
        })

      if (bannedEmailError) {
        console.warn('Could not add to banned emails (table may not exist):', bannedEmailError)
      } else {
        console.log('✓ Email added to banned list')
      }
    }

    // 4. Revoke all licenses (set status to 'revoked')
    // Note: Licenses are stored in 'license_keys' table, linked by 'assigned_to'
    const { error: licensesError } = await supabaseAdmin
      .from('license_keys')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .eq('assigned_to', user_id)
      .neq('status', 'revoked')

    if (licensesError) {
      console.warn('Error revoking licenses:', licensesError)
    } else {
      console.log('✓ All licenses revoked')
    }

    // 5. Cancel all subscriptions (unified table)
    const { error: subscriptionsError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .eq('status', 'active')

    if (subscriptionsError) {
      console.warn('Error cancelling subscriptions:', subscriptionsError)
    } else {
      console.log('✓ All subscriptions cancelled')
    }

    // Also try cancelling from legacy tables (if they exist)
    const { error: pluginSubError } = await supabaseAdmin
      .from('plugin_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .in('status', ['active', 'trialing'])

    if (!pluginSubError) {
      console.log('✓ Legacy plugin subscriptions cancelled')
    }

    const { error: nativeSubError } = await supabaseAdmin
      .from('native_app_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .in('status', ['active', 'trialing'])

    if (!nativeSubError) {
      console.log('✓ Legacy native app subscriptions cancelled')
    }

    // 7. Delete onboarding sessions
    const { error: onboardingError } = await supabaseAdmin
      .from('onboarding_sessions')
      .delete()
      .eq('user_id', user_id)

    if (onboardingError) {
      console.warn('Error deleting onboarding sessions:', onboardingError)
    } else {
      console.log('✓ Onboarding sessions deleted')
    }

    // 8. Delete clusters (they're responsible for payment)
    // Note: Table might be 'data_clusters' or 'database_clusters'
    const { error: clustersError } = await supabaseAdmin
      .from('database_clusters')
      .delete()
      .eq('created_by', user_id)

    if (clustersError) {
      console.warn('Error deleting clusters:', clustersError)
    } else {
      console.log('✓ Clusters deleted')
    }

    // Log the action (table may not exist)
    const { error: auditError } = await supabaseAdmin
      .from('admin_audit_log')
      .insert({
        admin_id: user.id,
        action: 'user_banned',
        target_user_id: user_id,
        details: { duration, reason }
      })

    if (auditError) {
      console.warn('Failed to log admin action:', auditError)
    }

    console.log('User banned successfully:', updatedUser.user?.email)

    return NextResponse.json({
      success: true,
      message: 'User banned successfully',
      user: {
        id: updatedUser.user?.id,
        email: updatedUser.user?.email,
        banned_until: updatedUser.user?.banned_until
      }
    })

  } catch (error: any) {
    console.error('Ban user error:', error)
    return NextResponse.json(
      { error: 'Failed to ban user', details: error.message },
      { status: 500 }
    )
  }
}
