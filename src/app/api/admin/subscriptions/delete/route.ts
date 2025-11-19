import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * DELETE /api/admin/subscriptions/delete
 * Delete a subscription (admin only)
 */
export async function DELETE(request: NextRequest) {
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
    const { subscription_id } = body

    if (!subscription_id) {
      return NextResponse.json(
        { error: 'subscription_id is required' },
        { status: 400 }
      )
    }

    // Delete the subscription
    const { error: deleteError } = await supabase
      .from('user_subscriptions_native_app')
      .delete()
      .eq('id', subscription_id)

    if (deleteError) {
      console.error('Error deleting subscription:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete subscription' },
        { status: 500 }
      )
    }

    console.log('Admin deleted subscription:', {
      admin_user_id: user.id,
      subscription_id
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription deleted successfully'
    })

  } catch (error) {
    console.error('Error in subscription deletion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
