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

    // Ban the user at auth level using banned_until
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

    console.log('Ban response:', updatedUser)

    // Also mark as inactive in user_profiles
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ is_active: false })
      .eq('id', user_id)

    if (profileError) {
      console.warn('Failed to update user profile is_active:', profileError)
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
