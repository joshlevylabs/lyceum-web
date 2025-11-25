import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-direct';

/**
 * GET /api/admin/onboarding/bookings
 * Get all onboarding bookings for the authenticated admin
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build query - superadmins see all bookings, admins see only their own
    let query = supabaseAdmin
      .from('onboarding_session_bookings')
      .select(`
        *,
        user:user_id(
          id,
          email,
          full_name
        ),
        availability_slot:availability_slot_id(
          id,
          start_time,
          end_time,
          meeting_platform,
          location
        ),
        license_key:license_key_id(
          id,
          license_type,
          status
        )
      `)
      .order('scheduled_start_time', { ascending: true });

    // Superadmins can see all, regular admins only see their own
    if (profile.role !== 'superadmin') {
      query = query.eq('admin_user_id', user.id);
    }

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('scheduled_start_time', startDate);
    }

    if (endDate) {
      query = query.lte('scheduled_end_time', endDate);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching admin bookings:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    // Organize bookings for easier consumption
    const upcoming = bookings?.filter(b =>
      ['scheduled', 'confirmed'].includes(b.status) &&
      new Date(b.scheduled_start_time) > new Date()
    ) || [];

    const past = bookings?.filter(b =>
      ['completed'].includes(b.status) ||
      (new Date(b.scheduled_start_time) < new Date() && ['scheduled', 'confirmed'].includes(b.status))
    ) || [];

    const requiresAttention = bookings?.filter(b =>
      b.is_mandatory &&
      b.is_trial_required &&
      b.status === 'suggested'
    ) || [];

    // Group upcoming bookings by date
    const upcomingByDate: Record<string, any[]> = {};
    upcoming.forEach(booking => {
      const date = new Date(booking.scheduled_start_time).toISOString().split('T')[0];
      if (!upcomingByDate[date]) {
        upcomingByDate[date] = [];
      }
      upcomingByDate[date].push(booking);
    });

    return NextResponse.json({
      bookings: bookings || [],
      upcoming,
      upcomingByDate,
      past,
      requiresAttention,
      counts: {
        total: bookings?.length || 0,
        upcoming: upcoming.length,
        past: past.length,
        requiresAttention: requiresAttention.length
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/onboarding/bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
