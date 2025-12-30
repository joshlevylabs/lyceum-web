import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-direct';
import { Resend } from 'resend';
import { demoBookingNotificationTemplate, demoConfirmationTemplate } from '@/lib/email-templates';

// Minimum hours in advance required to book a demo
const MINIMUM_BOOKING_HOURS = 24;

// Admin notification emails
const ADMIN_NOTIFICATION_EMAILS = [
  'josh@joshlevylabs.com',
  'josh@thelyceum.io'
];

// Your personal meeting room link (static link that you use for all demos)
// Set this to your Zoom Personal Meeting Room or Google Meet nickname link
// Leave null if you prefer to create unique meeting links manually for each demo
const PERSONAL_MEETING_LINK = process.env.DEMO_MEETING_LINK || null;

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format time for display
 */
function formatTime(startTime: string, endTime: string): string {
  const start = new Date(startTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  const end = new Date(endTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return `${start} - ${end}`;
}

/**
 * POST /api/demo/book
 * Public endpoint to book a demo session (no auth required, just email)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slot_id, email, name, company, notes } = body;

    // Validation
    if (!slot_id) {
      return NextResponse.json({ error: 'slot_id is required' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Verify the slot exists and is available
    const { data: slot, error: slotError } = await supabaseAdmin
      .from('admin_availability_slots')
      .select(`
        *,
        admin:admin_user_id(
          id,
          email,
          full_name
        )
      `)
      .eq('id', slot_id)
      .eq('is_available', true)
      .single();

    if (slotError || !slot) {
      return NextResponse.json({ error: 'Slot not found or no longer available' }, { status: 404 });
    }

    // Enforce 24-hour minimum booking window
    const minimumStartDate = new Date();
    minimumStartDate.setHours(minimumStartDate.getHours() + MINIMUM_BOOKING_HOURS);
    const slotStartTime = new Date(slot.start_time);

    if (slotStartTime < minimumStartDate) {
      return NextResponse.json({
        error: `Demos must be booked at least ${MINIMUM_BOOKING_HOURS} hours in advance`
      }, { status: 400 });
    }

    // Check if slot has capacity
    if (slot.current_bookings >= slot.max_concurrent_sessions) {
      return NextResponse.json({ error: 'This slot is fully booked' }, { status: 400 });
    }

    // Check if this email has already booked this slot
    const { data: existingBooking } = await supabaseAdmin
      .from('demo_bookings')
      .select('id')
      .eq('slot_id', slot_id)
      .eq('email', email.toLowerCase())
      .eq('status', 'confirmed')
      .single();

    if (existingBooking) {
      return NextResponse.json({ error: 'You have already booked this slot' }, { status: 400 });
    }

    // Use personal meeting link if configured, otherwise null (admin will add link manually)
    const meetingLink = PERSONAL_MEETING_LINK;

    // Create the demo booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('demo_bookings')
      .insert({
        slot_id,
        email: email.toLowerCase(),
        name: name || null,
        company: company || null,
        notes: notes || null,
        status: 'confirmed',
        scheduled_start_time: slot.start_time,
        scheduled_end_time: slot.end_time,
        meeting_platform: slot.meeting_platform || 'google-meet',
        meeting_link: meetingLink,
        admin_user_id: slot.admin_user_id
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating demo booking:', bookingError);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    // Increment the current_bookings count on the slot
    const { error: updateError } = await supabaseAdmin
      .from('admin_availability_slots')
      .update({ current_bookings: slot.current_bookings + 1 })
      .eq('id', slot_id);

    if (updateError) {
      console.error('Error updating slot booking count:', updateError);
      // Don't fail the request, booking was created successfully
    }

    // Prepare email data
    const scheduledDate = formatDate(slot.start_time);
    const scheduledTime = formatTime(slot.start_time, slot.end_time);
    const adminName = slot.admin?.full_name || 'Lyceum Team';
    const meetingPlatform = slot.meeting_platform === 'google-meet' ? 'Google Meet' :
      slot.meeting_platform === 'zoom' ? 'Zoom' : slot.meeting_platform || 'Video Call';

    // Send email notifications
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      // Send notification to admins
      try {
        await resend.emails.send({
          from: 'Lyceum <noreply@thelyceum.io>',
          to: ADMIN_NOTIFICATION_EMAILS,
          subject: `New Demo Scheduled: ${name || email} - ${scheduledDate}`,
          html: demoBookingNotificationTemplate({
            guestName: name,
            guestEmail: email,
            guestCompany: company,
            scheduledDate,
            scheduledTime,
            meetingPlatform,
            meetingLink
          })
        });
        console.log('Admin notification emails sent successfully');
      } catch (emailError) {
        console.error('Failed to send admin notification emails:', emailError);
        // Don't fail the request, booking was created successfully
      }

      // Send confirmation to the guest
      try {
        await resend.emails.send({
          from: 'Lyceum <noreply@thelyceum.io>',
          to: [email],
          subject: `Your Lyceum Demo is Confirmed - ${scheduledDate}`,
          html: demoConfirmationTemplate({
            guestName: name,
            scheduledDate,
            scheduledTime,
            meetingPlatform,
            meetingLink,
            adminName
          })
        });
        console.log('Guest confirmation email sent successfully');
      } catch (emailError) {
        console.error('Failed to send guest confirmation email:', emailError);
        // Don't fail the request, booking was created successfully
      }
    } else {
      console.warn('RESEND_API_KEY not configured, skipping email notifications');
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        email: booking.email,
        scheduled_start_time: booking.scheduled_start_time,
        scheduled_end_time: booking.scheduled_end_time,
        meeting_platform: meetingPlatform,
        meeting_link: meetingLink,
        admin_name: adminName
      },
      message: 'Demo successfully scheduled! You will receive a confirmation email shortly.'
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/demo/book:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
