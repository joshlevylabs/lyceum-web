import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-direct';

/**
 * POST /api/admin/onboarding/fix-trial-sessions
 * Fix existing onboarding sessions for trial licenses to mark them as mandatory
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Fixing trial license sessions...');

    // Find all suggested sessions that are NOT marked as mandatory but should be
    // (i.e., their license has status='trial')
    const { data: sessionsToFix, error: queryError } = await supabaseAdmin
      .from('onboarding_session_bookings')
      .select(`
        id,
        license_key_id,
        is_mandatory,
        is_trial_required,
        license_keys (
          id,
          license_type,
          status
        )
      `)
      .eq('status', 'suggested')
      .eq('is_mandatory', false);

    if (queryError) {
      console.error('Error fetching sessions:', queryError);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    console.log(`Found ${sessionsToFix?.length || 0} sessions to check`);

    const fixedSessions = [];
    const errors = [];

    for (const session of sessionsToFix || []) {
      try {
        // Check if the license is a trial
        const license = session.license_keys as any;
        const isTrial = license?.license_type === 'trial' || license?.status === 'trial';

        if (!isTrial) {
          console.log(`Session ${session.id} is not for a trial license, skipping`);
          continue;
        }

        // Update the session to mark it as mandatory
        const { error: updateError } = await supabaseAdmin
          .from('onboarding_session_bookings')
          .update({
            is_mandatory: true,
            is_trial_required: true
          })
          .eq('id', session.id);

        if (updateError) {
          console.error(`Error updating session ${session.id}:`, updateError);
          errors.push({ session_id: session.id, error: updateError.message });
          continue;
        }

        console.log(`✅ Fixed session ${session.id} for trial license`);
        fixedSessions.push({
          session_id: session.id,
          license_id: session.license_key_id,
          license_type: license?.license_type,
          license_status: license?.status
        });

      } catch (error) {
        console.error(`Unexpected error for session ${session.id}:`, error);
        errors.push({
          session_id: session.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: `Fixed ${fixedSessions.length} trial sessions`,
      fixedSessions,
      errors,
      totalSessionsChecked: sessionsToFix?.length || 0
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in fix-trial-sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
