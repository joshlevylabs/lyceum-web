import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/coupons/[id]/assignments - Get all assignments for a coupon
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

    // Fetch assignments with user details
    const { data: assignments, error: assignmentsError } = await supabase
      .from('user_coupons')
      .select(`
        id,
        user_id,
        times_used,
        assigned_at,
        active,
        admin_notes,
        user_profiles!inner(email, full_name, username)
      `)
      .eq('coupon_id', params.id)
      .order('assigned_at', { ascending: false })

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError)
      return NextResponse.json(
        { error: 'Failed to fetch assignments', details: assignmentsError.message },
        { status: 500 }
      )
    }

    // Format response
    const formattedAssignments = assignments?.map(a => ({
      id: a.id,
      user_id: a.user_id,
      user_email: (a.user_profiles as any).email,
      user_name: (a.user_profiles as any).full_name,
      times_used: a.times_used,
      assigned_at: a.assigned_at,
      active: a.active,
      admin_notes: a.admin_notes
    })) || []

    return NextResponse.json({
      assignments: formattedAssignments,
      count: formattedAssignments.length
    })

  } catch (error) {
    console.error('Error in GET /api/admin/coupons/[id]/assignments:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
