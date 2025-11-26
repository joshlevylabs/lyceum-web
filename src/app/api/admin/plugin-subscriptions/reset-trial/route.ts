import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/admin/plugin-subscriptions/reset-trial
 * Reset trial for a user for a specific plugin (deletes all trial subscriptions for that plugin)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token or user not found' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const allowedRoles = ['admin', 'super_admin', 'superadmin']
    if (!userProfile?.role || !allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { user_id, plugin_type } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    if (!plugin_type || !['klippel_qc', 'apx500'].includes(plugin_type)) {
      return NextResponse.json(
        { error: 'Invalid plugin_type. Must be klippel_qc or apx500' },
        { status: 400 }
      )
    }

    // Delete all trial subscriptions for this user and plugin
    const { data: deletedSubscriptions, error: deleteError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', user_id)
      .eq('subscription_category', 'plugin')
      .eq('plugin_type', plugin_type)
      .eq('subscription_type', 'trial')
      .select()

    if (deleteError) {
      console.error('Error resetting plugin trial:', deleteError)
      return NextResponse.json(
        { error: 'Failed to reset plugin trial' },
        { status: 500 }
      )
    }

    console.log('Admin reset plugin trial:', {
      admin_user_id: user.id,
      target_user_id: user_id,
      plugin_type,
      deleted_count: deletedSubscriptions?.length || 0
    })

    return NextResponse.json({
      success: true,
      message: `Plugin trial reset successfully for ${plugin_type}`,
      deleted_subscriptions: deletedSubscriptions?.length || 0
    })

  } catch (error) {
    console.error('Error in plugin trial reset:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
