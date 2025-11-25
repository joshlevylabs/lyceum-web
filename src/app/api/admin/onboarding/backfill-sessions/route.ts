import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-direct';

/**
 * POST /api/admin/onboarding/backfill-sessions
 * Backfill suggested onboarding sessions for existing licenses that don't have them
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Backfilling onboarding sessions...');

    // Find all active licenses that don't have suggested onboarding sessions
    const { data: licensesWithoutSessions, error: queryError } = await supabaseAdmin
      .from('license_keys')
      .select(`
        id,
        assigned_to,
        license_type,
        status,
        created_at
      `)
      .not('assigned_to', 'is', null)
      .in('status', ['active', 'trial'])
      .neq('license_type', 'gratis');

    if (queryError) {
      console.error('Error fetching licenses:', queryError);
      return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 });
    }

    console.log(`Found ${licensesWithoutSessions?.length || 0} licenses to check`);

    const sessionsCreated = [];
    const errors = [];

    for (const license of licensesWithoutSessions || []) {
      try {
        // Check if this license already has a suggested session
        const { data: existingSession } = await supabaseAdmin
          .from('onboarding_session_bookings')
          .select('id')
          .eq('license_key_id', license.id)
          .eq('status', 'suggested')
          .single();

        if (existingSession) {
          console.log(`License ${license.id} already has a suggested session, skipping`);
          continue;
        }

        // Calculate booking deadline (check both license_type and status for trial)
        const isTrial = license.license_type === 'trial' || license.status === 'trial';
        const createdAt = new Date(license.created_at);
        const bookingDeadline = new Date(createdAt);
        if (isTrial) {
          bookingDeadline.setDate(bookingDeadline.getDate() + 14); // 14 days for trials
        } else {
          bookingDeadline.setDate(bookingDeadline.getDate() + 30); // 30 days for others
        }

        // Get an available admin user
        const { data: adminUser } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('role', 'superadmin')
          .limit(1)
          .single();

        if (!adminUser) {
          errors.push({ license_id: license.id, error: 'No admin user found' });
          continue;
        }

        // Create suggested session
        const { data: newSession, error: createError } = await supabaseAdmin
          .from('onboarding_session_bookings')
          .insert({
            user_id: license.assigned_to,
            license_key_id: license.id,
            admin_user_id: adminUser.id,
            scheduled_start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            scheduled_end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // +1 hour
            duration_minutes: 60,
            session_type: 'initial_onboarding',
            status: 'suggested',
            is_mandatory: isTrial,
            is_trial_required: isTrial,
            trial_deadline: bookingDeadline.toISOString(),
            title: `Initial Onboarding Session - ${
              isTrial ? 'Trial License' :
              license.license_type === 'basic' ? 'Basic License' :
              license.license_type === 'professional' ? 'Professional License' :
              license.license_type === 'enterprise' ? 'Enterprise License' :
              'License'
            }`,
            description: `Welcome to Lyceum! This onboarding session will help you get started with your new ${license.license_type} license. We'll cover setup, key features, and answer any questions you may have.${
              isTrial
                ? ' ⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
                : ''
            }`
          })
          .select()
          .single();

        if (createError) {
          console.error(`Error creating session for license ${license.id}:`, createError);
          errors.push({ license_id: license.id, error: createError.message });
          continue;
        }

        console.log(`✅ Created suggested session for license ${license.id}`);
        sessionsCreated.push({
          license_id: license.id,
          license_type: license.license_type,
          session_id: newSession.id,
          user_id: license.assigned_to
        });

      } catch (error) {
        console.error(`Unexpected error for license ${license.id}:`, error);
        errors.push({
          license_id: license.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: `Backfill complete: Created ${sessionsCreated.length} suggested sessions`,
      sessionsCreated,
      errors,
      totalLicensesChecked: licensesWithoutSessions?.length || 0
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in backfill-sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
