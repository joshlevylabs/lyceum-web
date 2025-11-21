import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/coupons - List all coupons
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

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('Admin check (coupons GET):', {
      userId: user.id,
      email: user.email,
      profileFound: !!profile,
      profileError: profileError?.message,
      role: profile?.role
    })

    const allowedRoles = ['admin', 'super_admin', 'superadmin']
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      console.error('Access denied (coupons GET):', {
        userId: user.id,
        email: user.email,
        role: profile?.role,
        required: allowedRoles
      })
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required', userRole: profile?.role },
        { status: 403 }
      )
    }

    // Fetch all coupons
    const { data: coupons, error: couponsError } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })

    if (couponsError) {
      console.error('Error fetching coupons:', couponsError)
      return NextResponse.json(
        { error: 'Failed to fetch coupons', details: couponsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      coupons: coupons || [],
      count: coupons?.length || 0
    })

  } catch (error) {
    console.error('Error in GET /api/admin/coupons:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/coupons - Create new coupon
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

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('Admin check (coupons POST):', {
      userId: user.id,
      email: user.email,
      profileFound: !!profile,
      profileError: profileError?.message,
      role: profile?.role
    })

    const allowedRoles = ['admin', 'super_admin', 'superadmin']
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      console.error('Access denied (coupons POST):', {
        userId: user.id,
        email: user.email,
        role: profile?.role,
        required: allowedRoles
      })
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required', userRole: profile?.role },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      code,
      name,
      description,
      discount_type,
      discount_value,
      max_uses,
      max_uses_per_user,
      valid_from,
      valid_until,
      active,
      applies_to
    } = body

    // Validate required fields
    if (!code || !name || !discount_type || !discount_value) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, discount_type, discount_value' },
        { status: 400 }
      )
    }

    // Validate discount_type
    if (!['percentage', 'fixed_amount'].includes(discount_type)) {
      return NextResponse.json(
        { error: 'Invalid discount_type. Must be "percentage" or "fixed_amount"' },
        { status: 400 }
      )
    }

    // Validate discount_value
    if (discount_value <= 0) {
      return NextResponse.json(
        { error: 'discount_value must be greater than 0' },
        { status: 400 }
      )
    }

    // Check if code already exists
    const { data: existing } = await supabase
      .from('coupons')
      .select('id')
      .eq('code', code.toUpperCase())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Coupon code already exists' },
        { status: 409 }
      )
    }

    // Create coupon
    const { data: coupon, error: createError } = await supabase
      .from('coupons')
      .insert({
        code: code.toUpperCase(),
        name,
        description: description || null,
        discount_type,
        discount_value: parseFloat(discount_value),
        max_uses: max_uses || null,
        max_uses_per_user: max_uses_per_user || 1,
        valid_from: valid_from || new Date().toISOString(),
        valid_until: valid_until || null,
        active: active !== undefined ? active : true,
        applies_to: applies_to || { all: true, min_amount_cents: 0 },
        created_by: user.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating coupon:', createError)
      return NextResponse.json(
        { error: 'Failed to create coupon', details: createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Coupon created successfully',
      coupon
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/admin/coupons:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
