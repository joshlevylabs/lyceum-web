import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-direct';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

/**
 * GET /api/onboarding/my-bookings
 * Get all onboarding bookings for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const includeCompleted = searchParams.get('include_completed') === 'true';
    const includeCancelled = searchParams.get('include_cancelled') === 'true';

    // Build query
    let query = supabaseAdmin
      .from('onboarding_session_bookings')
      .select(`
        *,
        admin:admin_user_id(
          id,
          email,
          full_name,
          role
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
      .eq('user_id', user.id)
      .order('scheduled_start_time', { ascending: true });

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    } else {
      // By default, exclude completed and cancelled unless requested
      const excludedStatuses = [];
      if (!includeCompleted) excludedStatuses.push('completed');
      if (!includeCancelled) excludedStatuses.push('cancelled');

      if (excludedStatuses.length > 0) {
        query = query.not('status', 'in', `(${excludedStatuses.join(',')})`);
      }
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching user bookings:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    // Separate bookings by status for easier frontend consumption
    const upcoming = bookings?.filter(b =>
      ['scheduled', 'confirmed'].includes(b.status) &&
      new Date(b.scheduled_start_time) > new Date()
    ) || [];

    const past = bookings?.filter(b =>
      ['completed'].includes(b.status) ||
      (new Date(b.scheduled_start_time) < new Date() && b.status === 'scheduled')
    ) || [];

    const suggested = bookings?.filter(b => b.status === 'suggested') || [];

    const cancelled = bookings?.filter(b => b.status === 'cancelled') || [];

    // Find any mandatory trial bookings that need attention
    const requiresAction = bookings?.filter(b =>
      b.is_mandatory &&
      b.is_trial_required &&
      b.status === 'suggested' &&
      b.trial_deadline &&
      new Date(b.trial_deadline) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Within 7 days
    ) || [];

    return NextResponse.json({
      bookings: bookings || [],
      upcoming,
      past,
      suggested,
      cancelled,
      requiresAction,
      counts: {
        total: bookings?.length || 0,
        upcoming: upcoming.length,
        past: past.length,
        suggested: suggested.length,
        cancelled: cancelled.length,
        requiresAction: requiresAction.length
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in GET /api/onboarding/my-bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
