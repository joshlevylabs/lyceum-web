import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/admin/subscriptions/reset-trial
 * Reset trial flag for a user - deletes all trial subscriptions for that user (admin only)
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

    if (userProfile?.role !== 'admin' && userProfile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Delete all trial subscriptions for this user
    const { data: deletedSubs, error: deleteError } = await supabase
      .from('user_subscriptions_native_app')
      .delete()
      .eq('user_id', user_id)
      .eq('subscription_type', 'trial')
      .select()

    if (deleteError) {
      console.error('Error deleting trial subscriptions:', deleteError)
      return NextResponse.json(
        { error: 'Failed to reset trial' },
        { status: 500 }
      )
    }

    console.log('Admin reset trial for user:', {
      admin_user_id: user.id,
      target_user_id: user_id,
      deleted_count: deletedSubs?.length || 0
    })

    return NextResponse.json({
      success: true,
      message: 'Trial reset successfully',
      deleted_subscriptions: deletedSubs?.length || 0
    })

  } catch (error) {
    console.error('Error in trial reset:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
