import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-direct';

// Minimum hours in advance required to book a demo
const MINIMUM_BOOKING_HOURS = 24;

/**
 * GET /api/demo/available-slots
 * Public endpoint to get available demo slots (no auth required)
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;

    // Enforce 24-hour minimum: start date must be at least 24 hours from now
    const minimumStartDate = new Date();
    minimumStartDate.setHours(minimumStartDate.getHours() + MINIMUM_BOOKING_HOURS);

    const requestedStartDate = searchParams.get('start_date');
    const startDate = requestedStartDate
      ? new Date(Math.max(new Date(requestedStartDate).getTime(), minimumStartDate.getTime())).toISOString()
      : minimumStartDate.toISOString();

    const endDate = searchParams.get('end_date');

    // Build query for available demo slots
    let query = supabaseAdmin
      .from('admin_availability_slots')
      .select(`
        id,
        start_time,
        end_time,
        meeting_platform,
        location,
        max_concurrent_sessions,
        current_bookings,
        admin:admin_user_id(
          id,
          full_name
        )
      `)
      .eq('is_available', true)
      .in('slot_type', ['demo', 'onboarding']) // Allow both demo and onboarding slots for demos
      .gte('start_time', startDate)
      .gt('max_concurrent_sessions', 0)
      .order('start_time', { ascending: true });

    if (endDate) {
      query = query.lte('end_time', endDate);
    }

    const { data: slots, error } = await query;

    if (error) {
      console.error('Error fetching available demo slots:', error);
      return NextResponse.json({ error: 'Failed to fetch available slots' }, { status: 500 });
    }

    // Filter out slots that are at full capacity AND enforce 24-hour minimum
    const availableSlots = (slots || []).filter(slot => {
      const slotTime = new Date(slot.start_time);
      const isCapacityAvailable = slot.current_bookings < slot.max_concurrent_sessions;
      const isMinimumTimeAhead = slotTime.getTime() >= minimumStartDate.getTime();
      return isCapacityAvailable && isMinimumTimeAhead;
    });

    // Group slots by date for easier frontend consumption
    const slotsByDate: Record<string, any[]> = {};
    availableSlots.forEach(slot => {
      const date = new Date(slot.start_time).toISOString().split('T')[0];
      if (!slotsByDate[date]) {
        slotsByDate[date] = [];
      }
      slotsByDate[date].push(slot);
    });

    return NextResponse.json({
      slots: availableSlots,
      slotsByDate,
      totalSlots: availableSlots.length
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in GET /api/demo/available-slots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
