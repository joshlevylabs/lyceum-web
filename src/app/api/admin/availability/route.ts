import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-direct';

/**
 * GET /api/admin/availability
 * List all availability slots for the authenticated admin
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

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const isAvailable = searchParams.get('is_available');

    // Build query
    let query = supabaseAdmin
      .from('admin_availability_slots')
      .select('*')
      .eq('admin_user_id', user.id)
      .order('start_time', { ascending: true });

    if (startDate) {
      query = query.gte('start_time', startDate);
    }

    if (endDate) {
      query = query.lte('end_time', endDate);
    }

    if (isAvailable !== null) {
      query = query.eq('is_available', isAvailable === 'true');
    }

    const { data: slots, error } = await query;

    if (error) {
      console.error('Error fetching availability slots:', error);
      return NextResponse.json({ error: 'Failed to fetch availability slots' }, { status: 500 });
    }

    return NextResponse.json({ slots }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/availability
 * Create a new availability slot for the authenticated admin
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      start_time,
      end_time,
      slot_type = 'onboarding',
      max_concurrent_sessions = 1,
      is_recurring = false,
      recurrence_pattern,
      recurrence_end_date,
      notes,
      location,
      meeting_platform = 'zoom'
    } = body;

    // Validation
    if (!start_time || !end_time) {
      return NextResponse.json({ error: 'start_time and end_time are required' }, { status: 400 });
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (startDate >= endDate) {
      return NextResponse.json({ error: 'end_time must be after start_time' }, { status: 400 });
    }

    if (max_concurrent_sessions < 1) {
      return NextResponse.json({ error: 'max_concurrent_sessions must be at least 1' }, { status: 400 });
    }

    // Generate slots based on recurrence
    const slotsToInsert = [];

    if (is_recurring && recurrence_pattern && recurrence_end_date) {
      const recurrenceEnd = new Date(recurrence_end_date);
      let currentStart = new Date(startDate);
      let currentEnd = new Date(endDate);

      // Calculate duration in milliseconds
      const duration = endDate.getTime() - startDate.getTime();

      // Generate recurring slots
      while (currentStart <= recurrenceEnd) {
        slotsToInsert.push({
          admin_user_id: user.id,
          start_time: currentStart.toISOString(),
          end_time: currentEnd.toISOString(),
          slot_type,
          max_concurrent_sessions,
          is_recurring: true,
          recurrence_pattern,
          recurrence_end_date: recurrenceEnd.toISOString(),
          notes,
          location,
          meeting_platform
        });

        // Increment based on pattern
        if (recurrence_pattern === 'daily') {
          currentStart.setDate(currentStart.getDate() + 1);
          currentEnd = new Date(currentStart.getTime() + duration);
        } else if (recurrence_pattern === 'weekly') {
          currentStart.setDate(currentStart.getDate() + 7);
          currentEnd = new Date(currentStart.getTime() + duration);
        } else if (recurrence_pattern === 'monthly') {
          currentStart.setMonth(currentStart.getMonth() + 1);
          currentEnd = new Date(currentStart.getTime() + duration);
        } else {
          break; // Unknown pattern
        }
      }
    } else {
      // Single slot
      slotsToInsert.push({
        admin_user_id: user.id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        slot_type,
        max_concurrent_sessions,
        is_recurring: false,
        recurrence_pattern: null,
        recurrence_end_date: null,
        notes,
        location,
        meeting_platform
      });
    }

    // Insert all slots
    const { data: slots, error } = await supabaseAdmin
      .from('admin_availability_slots')
      .insert(slotsToInsert)
      .select();

    if (error) {
      console.error('Error creating availability slots:', error);
      return NextResponse.json({ error: 'Failed to create availability slots' }, { status: 500 });
    }

    return NextResponse.json({
      slots,
      count: slots?.length || 0,
      message: is_recurring ? `Created ${slots?.length || 0} recurring slots` : 'Created 1 slot'
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/admin/availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
