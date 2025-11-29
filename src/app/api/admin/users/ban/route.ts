import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-direct'

/**
 * Ban a user (prevents login at auth level)
 * POST /api/admin/users/ban
 * Body: { user_id: string, duration?: string, reason?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { success, user, response } = await requireAdmin(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { user_id, duration = '876000h', reason } = body // Default: 100 years (permanent)

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

    // 1. Ban the user at auth level using banned_until
    const bannedUntil = new Date()
    bannedUntil.setFullYear(bannedUntil.getFullYear() + 100) // Ban for 100 years (permanent)

    const { data: updatedUser, error: banError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      banned_until: bannedUntil.toISOString()
    })

    if (banError) {
      console.error('Error banning user:', banError)
      return NextResponse.json({
        error: 'Failed to ban user',
        details: banError.message
      }, { status: 500 })
    }

    console.log('✓ Auth account banned')

    // 2. Mark as banned and inactive in user_profiles
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        is_active: false,
        account_status: 'banned',
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
    const { error: licensesError } = await supabaseAdmin
      .from('licenses')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
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
    await supabaseAdmin
      .from('plugin_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .in('status', ['active', 'trialing'])
      .then(() => console.log('✓ Legacy plugin subscriptions cancelled'))
      .catch(() => {}) // Ignore errors if table doesn't exist

    await supabaseAdmin
      .from('native_app_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .in('status', ['active', 'trialing'])
      .then(() => console.log('✓ Legacy native app subscriptions cancelled'))
      .catch(() => {}) // Ignore errors if table doesn't exist

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
    const { error: clustersError } = await supabaseAdmin
      .from('clusters')
      .delete()
      .eq('user_id', user_id)

    if (clustersError) {
      console.warn('Error deleting clusters:', clustersError)
    } else {
      console.log('✓ Clusters deleted')
    }

    // Log the action
    await supabaseAdmin
      .from('admin_audit_log')
      .insert({
        admin_id: user.id,
        action: 'user_banned',
        target_user_id: user_id,
        details: { duration, reason }
      })
      .catch(err => console.warn('Failed to log admin action:', err))

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
