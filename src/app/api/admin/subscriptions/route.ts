import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/admin/subscriptions
 * Fetch all subscriptions with user emails (admin only)
 */
export async function GET(request: NextRequest) {
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
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('Admin check:', {
      userId: user.id,
      email: user.email,
      profileFound: !!userProfile,
      profileError: profileError?.message,
      role: userProfile?.role
    })

    const allowedRoles = ['admin', 'super_admin', 'superadmin']
    if (!userProfile?.role || !allowedRoles.includes(userProfile.role)) {
      console.error('Access denied:', {
        userId: user.id,
        email: user.email,
        role: userProfile?.role,
        required: allowedRoles
      })
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required', userRole: userProfile?.role },
        { status: 403 }
      )
    }

    // Fetch all subscriptions with user emails
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_subscriptions_native_app')
      .select(`
        id,
        user_id,
        subscription_type,
        status,
        stripe_session_id,
        amount_paid_cents,
        currency,
        trial_start_date,
        trial_end_date,
        cancelled_at,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    // Fetch user emails for each subscription
    const subscriptionsWithEmails = await Promise.all(
      (subscriptions || []).map(async (sub) => {
        const { data: userData } = await supabase.auth.admin.getUserById(sub.user_id)
        return {
          ...sub,
          user_email: userData?.user?.email || null
        }
      })
    )

    return NextResponse.json({
      success: true,
      subscriptions: subscriptionsWithEmails,
      total: subscriptionsWithEmails.length
    })

  } catch (error) {
    console.error('Error in admin subscriptions fetch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
