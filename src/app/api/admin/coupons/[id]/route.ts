import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/coupons/[id] - Get single coupon
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Fetch coupon
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', params.id)
      .single()

    if (couponError || !coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    return NextResponse.json({ coupon })

  } catch (error) {
    console.error('Error in GET /api/admin/coupons/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/coupons/[id] - Update coupon
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { active, valid_until } = body

    // Build update object
    const updates: any = {}
    if (active !== undefined) updates.active = active
    if (valid_until !== undefined) updates.valid_until = valid_until

    // Update coupon
    const { data: coupon, error: updateError } = await supabase
      .from('coupons')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating coupon:', updateError)
      return NextResponse.json(
        { error: 'Failed to update coupon', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Coupon updated successfully',
      coupon
    })

  } catch (error) {
    console.error('Error in PATCH /api/admin/coupons/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
