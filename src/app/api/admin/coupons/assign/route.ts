import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/coupons/assign - Assign coupon to user
export async function POST(request: NextRequest) {
  try {
    // Extract and verify Bearer token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token or user not found' },
        { status: 401 }
      )
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const allowedRoles = ['admin', 'super_admin', 'superadmin']
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required', userRole: profile?.role },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { coupon_id, user_id, admin_notes } = body

    // Validate required fields
    if (!coupon_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: coupon_id, user_id' },
        { status: 400 }
      )
    }

    // Check if coupon exists and is active
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', coupon_id)
      .single()

    if (couponError || !coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    if (!coupon.active) {
      return NextResponse.json({ error: 'Coupon is not active' }, { status: 400 })
    }

    // Check if user exists
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('id', user_id)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user already has this coupon assigned (active)
    const { data: existing } = await supabase
      .from('user_coupons')
      .select('id')
      .eq('user_id', user_id)
      .eq('coupon_id', coupon_id)
      .eq('active', true)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'User already has this coupon assigned' },
        { status: 409 }
      )
    }

    // Create assignment
    const { data: assignment, error: assignError } = await supabase
      .from('user_coupons')
      .insert({
        user_id,
        coupon_id,
        assigned_by: user.id,
        admin_notes: admin_notes || null,
        active: true
      })
      .select()
      .single()

    if (assignError) {
      console.error('Error assigning coupon:', assignError)
      return NextResponse.json(
        { error: 'Failed to assign coupon', details: assignError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Coupon assigned successfully',
      assignment
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/admin/coupons/assign:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
