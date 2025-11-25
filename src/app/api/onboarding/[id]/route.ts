import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-direct';

/**
 * GET /api/onboarding/[id]
 * Get details of a specific onboarding booking
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

    // Get the booking
    const { data: booking, error } = await supabaseAdmin
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
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      console.error('Error fetching booking:', error);
      return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
    }

    return NextResponse.json({ booking }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in GET /api/onboarding/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/onboarding/[id]
 * Reschedule an onboarding booking
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

    const params = await props.params;
    const { id } = params;

    const body = await request.json();
    const { new_availability_slot_id } = body;

    if (!new_availability_slot_id) {
      return NextResponse.json({ error: 'new_availability_slot_id is required' }, { status: 400 });
    }

    // Get the existing booking
    const { data: existingBooking, error: fetchError } = await supabaseAdmin
      .from('onboarding_session_bookings')
      .select('*, availability_slot:availability_slot_id(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Can't reschedule completed or cancelled bookings
    if (['completed', 'cancelled'].includes(existingBooking.status)) {
      return NextResponse.json(
        { error: `Cannot reschedule ${existingBooking.status} booking` },
        { status: 400 }
      );
    }

    // Check if the new slot is available
    const { data: newSlot, error: slotError } = await supabaseAdmin
      .from('admin_availability_slots')
      .select('*')
      .eq('id', new_availability_slot_id)
      .single();

    if (slotError || !newSlot) {
      return NextResponse.json({ error: 'New availability slot not found' }, { status: 404 });
    }

    if (!newSlot.is_available) {
      return NextResponse.json({ error: 'The new time slot is no longer available' }, { status: 400 });
    }

    if (newSlot.current_bookings >= newSlot.max_concurrent_sessions) {
      return NextResponse.json({ error: 'The new time slot is fully booked' }, { status: 400 });
    }

    // Check if slot is in the future
    const slotStartTime = new Date(newSlot.start_time);
    if (slotStartTime < new Date()) {
      return NextResponse.json({ error: 'Cannot book a past time slot' }, { status: 400 });
    }

    // The triggers will handle decrementing the old slot and incrementing the new slot
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('onboarding_session_bookings')
      .update({
        availability_slot_id: new_availability_slot_id,
        admin_user_id: newSlot.admin_user_id,
        scheduled_start_time: newSlot.start_time,
        scheduled_end_time: newSlot.end_time,
        status: 'scheduled',
        meeting_platform: newSlot.meeting_platform,
        reschedule_count: existingBooking.reschedule_count + 1,
        previous_booking_id: id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error rescheduling booking:', updateError);
      return NextResponse.json({ error: 'Failed to reschedule booking' }, { status: 500 });
    }

    return NextResponse.json({
      booking: updatedBooking,
      message: 'Booking rescheduled successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in PUT /api/onboarding/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/onboarding/[id]
 * Cancel an onboarding booking
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

    const params = await props.params;
    const { id } = params;

    const body = await request.json().catch(() => ({}));
    const { cancellation_reason } = body;

    // Get the existing booking
    const { data: existingBooking, error: fetchError } = await supabaseAdmin
      .from('onboarding_session_bookings')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Can't cancel already completed or cancelled bookings
    if (['completed', 'cancelled'].includes(existingBooking.status)) {
      return NextResponse.json(
        { error: `Booking is already ${existingBooking.status}` },
        { status: 400 }
      );
    }

    // Check if this is a mandatory trial booking
    if (existingBooking.is_mandatory && existingBooking.is_trial_required) {
      return NextResponse.json(
        { error: 'Cannot cancel mandatory trial onboarding. Please reschedule instead.' },
        { status: 400 }
      );
    }

    // Update the booking to cancelled status
    // The trigger will handle decrementing the booking counter
    const { data: cancelledBooking, error: updateError } = await supabaseAdmin
      .from('onboarding_session_bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        cancellation_reason: cancellation_reason || 'Cancelled by user',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error cancelling booking:', updateError);
      return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
    }

    return NextResponse.json({
      booking: cancelledBooking,
      message: 'Booking cancelled successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/onboarding/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
