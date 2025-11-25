import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-direct';

/**
 * GET /api/admin/availability/[id]
 * Get a specific availability slot
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const { id } = params;

    // Get the availability slot
    const { data: slot, error } = await supabaseAdmin
      .from('admin_availability_slots')
      .select('*')
      .eq('id', id)
      .eq('admin_user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Availability slot not found' }, { status: 404 });
      }
      console.error('Error fetching availability slot:', error);
      return NextResponse.json({ error: 'Failed to fetch availability slot' }, { status: 500 });
    }

    return NextResponse.json({ slot }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/availability/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/availability/[id]
 * Update an availability slot
 */
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
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

    const params = await props.params;
    const { id } = params;

    // Verify the slot belongs to this admin
    const { data: existingSlot, error: fetchError } = await supabaseAdmin
      .from('admin_availability_slots')
      .select('*')
      .eq('id', id)
      .eq('admin_user_id', user.id)
      .single();

    if (fetchError || !existingSlot) {
      return NextResponse.json({ error: 'Availability slot not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      start_time,
      end_time,
      slot_type,
      max_concurrent_sessions,
      is_available,
      is_recurring,
      recurrence_pattern,
      recurrence_end_date,
      notes,
      location,
      meeting_platform
    } = body;

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (start_time !== undefined) {
      updateData.start_time = new Date(start_time).toISOString();
    }
    if (end_time !== undefined) {
      updateData.end_time = new Date(end_time).toISOString();
    }
    if (slot_type !== undefined) updateData.slot_type = slot_type;
    if (max_concurrent_sessions !== undefined) updateData.max_concurrent_sessions = max_concurrent_sessions;
    if (is_available !== undefined) updateData.is_available = is_available;
    if (is_recurring !== undefined) updateData.is_recurring = is_recurring;
    if (recurrence_pattern !== undefined) updateData.recurrence_pattern = recurrence_pattern;
    if (recurrence_end_date !== undefined) {
      updateData.recurrence_end_date = recurrence_end_date ? new Date(recurrence_end_date).toISOString() : null;
    }
    if (notes !== undefined) updateData.notes = notes;
    if (location !== undefined) updateData.location = location;
    if (meeting_platform !== undefined) updateData.meeting_platform = meeting_platform;

    // Validate time range if both are being updated
    if (updateData.start_time && updateData.end_time) {
      const startDate = new Date(updateData.start_time);
      const endDate = new Date(updateData.end_time);
      if (startDate >= endDate) {
        return NextResponse.json({ error: 'end_time must be after start_time' }, { status: 400 });
      }
    }

    // Update the slot
    const { data: slot, error } = await supabaseAdmin
      .from('admin_availability_slots')
      .update(updateData)
      .eq('id', id)
      .eq('admin_user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating availability slot:', error);
      return NextResponse.json({ error: 'Failed to update availability slot' }, { status: 500 });
    }

    return NextResponse.json({ slot }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in PUT /api/admin/availability/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/availability/[id]
 * Delete an availability slot (only if no confirmed bookings)
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
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

    const params = await props.params;
    const { id } = params;

    // Check if there are any confirmed bookings for this slot
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('onboarding_session_bookings')
      .select('id')
      .eq('availability_slot_id', id)
      .in('status', ['scheduled', 'confirmed']);

    if (bookingsError) {
      console.error('Error checking bookings:', bookingsError);
      return NextResponse.json({ error: 'Failed to check bookings' }, { status: 500 });
    }

    if (bookings && bookings.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete availability slot with confirmed bookings' },
        { status: 400 }
      );
    }

    // Delete the slot
    const { error } = await supabaseAdmin
      .from('admin_availability_slots')
      .delete()
      .eq('id', id)
      .eq('admin_user_id', user.id);

    if (error) {
      console.error('Error deleting availability slot:', error);
      return NextResponse.json({ error: 'Failed to delete availability slot' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Availability slot deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/availability/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
