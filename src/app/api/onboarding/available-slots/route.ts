import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-direct';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

/**
 * GET /api/onboarding/available-slots
 * Get all available onboarding slots that can be booked
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date') || new Date().toISOString();
    const endDate = searchParams.get('end_date');
    const adminId = searchParams.get('admin_id');

    // Build query for available slots
    let query = supabaseAdmin
      .from('admin_availability_slots')
      .select(`
        *,
        admin:admin_user_id(
          id,
          email,
          full_name,
          role
        )
      `)
      .eq('is_available', true)
      .gte('start_time', startDate)
      .gt('max_concurrent_sessions', 0)
      .order('start_time', { ascending: true });

    if (endDate) {
      query = query.lte('end_time', endDate);
    }

    if (adminId) {
      query = query.eq('admin_user_id', adminId);
    }

    const { data: slots, error } = await query;

    if (error) {
      console.error('Error fetching available slots:', error);
      return NextResponse.json({ error: 'Failed to fetch available slots' }, { status: 500 });
    }

    // Filter out slots that are at full capacity
    const availableSlots = (slots || []).filter(slot =>
      slot.current_bookings < slot.max_concurrent_sessions
    );

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
    console.error('Unexpected error in GET /api/onboarding/available-slots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
