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

    // Delete from auth.users (cascades to related tables due to foreign keys)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id)

    if (deleteAuthError) {
      console.error('Error deleting user from auth:', deleteAuthError)
      console.error('Delete error details:', JSON.stringify(deleteAuthError, null, 2))
      return NextResponse.json({
        error: 'Failed to delete user',
        details: deleteAuthError.message
      }, { status: 500 })
    }

    console.log('User deleted from auth successfully')

    // The CASCADE on foreign keys should handle deletion of:
    // - user_profiles
    // - plugin_licenses
    // - invoices
    // - billing_periods
    // - plugin_reviews
    // - etc.

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
