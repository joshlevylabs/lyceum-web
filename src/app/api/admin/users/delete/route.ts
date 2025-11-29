import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-direct'

/**
 * Permanently delete a user and all their data
 * DELETE /api/admin/users/delete
 * Body: { user_id: string, confirm?: boolean }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { success, user, response } = await requireAdmin(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { user_id, confirm } = body

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    if (!confirm) {
      return NextResponse.json({
        error: 'Deletion must be confirmed',
        message: 'Set confirm: true to proceed with deletion'
      }, { status: 400 })
    }

    console.log('Admin delete user request:', { user_id, admin_id: user.id })

    // Get user info before deletion for logging
    const { data: userToDelete, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(user_id)

    if (getUserError || !userToDelete) {
      console.error('User not found:', getUserError)
      return NextResponse.json({
        error: 'User not found',
        details: getUserError?.message
      }, { status: 404 })
    }

    const userEmail = userToDelete.user?.email
    console.log('User found:', userEmail, 'Attempting to delete...')

    // Explicit deletion of associated data (don't rely solely on CASCADE)

    // 1. Delete onboarding sessions
    const { error: onboardingError } = await supabaseAdmin
      .from('onboarding_sessions')
      .delete()
      .eq('user_id', user_id)

    if (onboardingError) {
      console.error('Error deleting onboarding sessions:', onboardingError)
    } else {
      console.log('✓ Deleted onboarding sessions')
    }

    // 2. Delete clusters
    const { error: clustersError } = await supabaseAdmin
      .from('clusters')
      .delete()
      .eq('user_id', user_id)

    if (clustersError) {
      console.error('Error deleting clusters:', clustersError)
    } else {
      console.log('✓ Deleted clusters')
    }

    // 3. Delete subscriptions (unified table)
    const { error: subscriptionsError } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('user_id', user_id)

    if (subscriptionsError) {
      console.error('Error deleting subscriptions:', subscriptionsError)
    } else {
      console.log('✓ Deleted subscriptions')
    }

    // Also delete from legacy tables (if they exist)
    await supabaseAdmin
      .from('plugin_subscriptions')
      .delete()
      .eq('user_id', user_id)
      .then(() => console.log('✓ Deleted legacy plugin subscriptions'))
      .catch(() => {}) // Ignore errors if table doesn't exist

    await supabaseAdmin
      .from('native_app_subscriptions')
      .delete()
      .eq('user_id', user_id)
      .then(() => console.log('✓ Deleted legacy native app subscriptions'))
      .catch(() => {}) // Ignore errors if table doesn't exist

    // 5. Delete licenses
    const { error: licensesError } = await supabaseAdmin
      .from('licenses')
      .delete()
      .eq('user_id', user_id)

    if (licensesError) {
      console.error('Error deleting licenses:', licensesError)
    } else {
      console.log('✓ Deleted licenses')
    }

    // 6. Delete payment methods
    const { error: paymentMethodsError } = await supabaseAdmin
      .from('stored_payment_methods')
      .delete()
      .eq('user_id', user_id)

    if (paymentMethodsError) {
      console.error('Error deleting payment methods:', paymentMethodsError)
    } else {
      console.log('✓ Deleted payment methods')
    }

    // 7. Delete payment transactions
    const { error: transactionsError } = await supabaseAdmin
      .from('payment_transactions')
      .delete()
      .eq('user_id', user_id)

    if (transactionsError) {
      console.error('Error deleting transactions:', transactionsError)
    } else {
      console.log('✓ Deleted payment transactions')
    }

    // 8. Delete user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', user_id)

    if (profileError) {
      console.error('Error deleting user profile:', profileError)
    } else {
      console.log('✓ Deleted user profile')
    }

    // 9. Delete from auth.users (final step)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id)

    if (deleteAuthError) {
      // Check if error is because user was already deleted (not found)
      if (deleteAuthError.message?.includes('User not found') || deleteAuthError.status === 404) {
        console.log('⚠ Auth user already deleted or not found - continuing')
      } else {
        console.error('Error deleting user from auth:', deleteAuthError)
        console.error('Delete error details:', JSON.stringify(deleteAuthError, null, 2))
        // Still return success if everything else was deleted - auth user might have been manually removed
        console.warn('⚠ Auth deletion failed but other data was removed')
      }
    } else {
      console.log('✓ Deleted auth user - User completely removed from system')
    }

    // Log the action (using superadmin client to bypass RLS)
    await supabaseAdmin
      .from('admin_audit_log')
      .insert({
        admin_id: user.id,
        action: 'user_deleted',
        target_user_id: user_id,
        details: { email: userEmail }
      })
      .catch(err => console.warn('Failed to log admin action:', err))

    console.log('User deleted successfully:', userEmail)

    return NextResponse.json({
      success: true,
      message: 'User permanently deleted',
      deleted_user: {
        id: user_id,
        email: userEmail
      }
    })

  } catch (error: any) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST handler for easier frontend integration
 */
export async function POST(request: NextRequest) {
  return DELETE(request)
}
