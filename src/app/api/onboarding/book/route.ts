import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-direct';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

/**
 * POST /api/onboarding/book
 * Book an onboarding session
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      availability_slot_id,
      license_id,
      license_key_id,
      scheduled_start_time,
      scheduled_end_time,
      session_type = 'initial_onboarding',
      title,
      notes
    } = body;

    // Validation
    if (!availability_slot_id) {
      return NextResponse.json({ error: 'availability_slot_id is required' }, { status: 400 });
    }

    // Check if the slot is available
    const { data: slot, error: slotError } = await supabaseAdmin
      .from('admin_availability_slots')
      .select('*')
      .eq('id', availability_slot_id)
      .single();

    if (slotError || !slot) {
      return NextResponse.json({ error: 'Availability slot not found' }, { status: 404 });
    }

    if (!slot.is_available) {
      return NextResponse.json({ error: 'This time slot is no longer available' }, { status: 400 });
    }

    if (slot.current_bookings >= slot.max_concurrent_sessions) {
      return NextResponse.json({ error: 'This time slot is fully booked' }, { status: 400 });
    }

    // Check if slot is in the future
    const slotStartTime = new Date(slot.start_time);
    if (slotStartTime < new Date()) {
      return NextResponse.json({ error: 'Cannot book a past time slot' }, { status: 400 });
    }

    // Determine the actual booking times (custom segment or full slot)
    const bookingStartTime = scheduled_start_time || slot.start_time;
    const bookingEndTime = scheduled_end_time || slot.end_time;

    // Validate custom scheduled times fall within the slot's boundaries
    if (scheduled_start_time && scheduled_end_time) {
      const requestedStart = new Date(scheduled_start_time);
      const requestedEnd = new Date(scheduled_end_time);
      const slotStart = new Date(slot.start_time);
      const slotEnd = new Date(slot.end_time);

      if (requestedStart < slotStart || requestedEnd > slotEnd) {
        return NextResponse.json(
          { error: 'Scheduled times must fall within the availability slot' },
          { status: 400 }
        );
      }

      if (requestedStart >= requestedEnd) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }

      // Check for maximum session length (1 hour)
      const durationMs = requestedEnd.getTime() - requestedStart.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      if (durationHours > 1) {
        return NextResponse.json(
          { error: 'Session length cannot exceed 1 hour' },
          { status: 400 }
        );
      }
    }

    // Check if user already has a booking in this slot
    const { data: existingBooking, error: existingError } = await supabaseAdmin
      .from('onboarding_session_bookings')
      .select('id')
      .eq('availability_slot_id', availability_slot_id)
      .eq('user_id', user.id)
      .in('status', ['scheduled', 'confirmed'])
      .single();

    if (existingBooking) {
      return NextResponse.json(
        { error: 'You already have a booking in this time slot' },
        { status: 400 }
      );
    }

    // If this is for a suggested session, update it instead of creating new
    let bookingId: string | null = null;
    if (license_id || license_key_id) {
      const { data: suggestedSession } = await supabaseAdmin
        .from('onboarding_session_bookings')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'suggested')
        .or(license_id ? `license_id.eq.${license_id}` : `license_key_id.eq.${license_key_id}`)
        .single();

      if (suggestedSession) {
        bookingId = suggestedSession.id;
      }
    }

    let booking;

    if (bookingId) {
      // Update existing suggested session
      const { data, error } = await supabaseAdmin
        .from('onboarding_session_bookings')
        .update({
          availability_slot_id,
          admin_user_id: slot.admin_user_id,
          scheduled_start_time: bookingStartTime,
          scheduled_end_time: bookingEndTime,
          status: 'scheduled',
          booked_at: new Date().toISOString(),
          meeting_platform: slot.meeting_platform,
          title: title || `Onboarding Session with ${slot.admin_user_id}`,
          confirmation_sent: false
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('Error updating suggested session:', error);
        return NextResponse.json({ error: 'Failed to book session' }, { status: 500 });
      }

      booking = data;
    } else {
      // Create new booking
      const { data, error } = await supabaseAdmin
        .from('onboarding_session_bookings')
        .insert({
          availability_slot_id,
          admin_user_id: slot.admin_user_id,
          user_id: user.id,
          license_key_id,
          scheduled_start_time: bookingStartTime,
          scheduled_end_time: bookingEndTime,
          session_type,
          status: 'scheduled',
          meeting_platform: slot.meeting_platform,
          title: title || `Onboarding Session - ${session_type}`,
          description: notes,
          booked_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating booking:', error);
        return NextResponse.json({ error: 'Failed to book session' }, { status: 500 });
      }

      booking = data;
    }

    // The trigger will automatically increment the booking counter
    // and mark the slot as unavailable if at capacity

    return NextResponse.json({
      booking,
      message: 'Session booked successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/onboarding/book:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
