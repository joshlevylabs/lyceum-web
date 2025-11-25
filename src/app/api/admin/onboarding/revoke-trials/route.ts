import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-direct';

/**
 * POST /api/admin/onboarding/revoke-trials
 * Manually trigger revocation of unscheduled trial licenses
 * This should also be run via a cron job
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

    // Call the revocation function
    const { data: revokedLicenses, error } = await supabaseAdmin
      .rpc('revoke_unscheduled_trial_licenses');

    if (error) {
      console.error('Error revoking trial licenses:', error);
      return NextResponse.json({ error: 'Failed to revoke trial licenses' }, { status: 500 });
    }

    const count = revokedLicenses?.length || 0;

    return NextResponse.json({
      message: `Revoked ${count} trial license(s)`,
      revokedLicenses: revokedLicenses || [],
      count
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in POST /api/admin/onboarding/revoke-trials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/onboarding/revoke-trials
 * Preview which trial licenses would be revoked (dry run)
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

    // Find trial licenses that would be revoked
    const { data: atRiskLicenses, error } = await supabaseAdmin
      .from('licenses')
      .select(`
        id,
        user_id,
        license_type,
        status,
        created_at,
        user:user_id(
          email,
          full_name
        ),
        bookings:onboarding_session_bookings(
          id,
          status,
          trial_deadline,
          scheduled_start_time
        )
      `)
      .eq('license_type', 'trial')
      .eq('status', 'active')
      .lt('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Error fetching at-risk licenses:', error);
      return NextResponse.json({ error: 'Failed to fetch at-risk licenses' }, { status: 500 });
    }

    // Filter to only those without scheduled onboarding or past deadline
    const licensesToRevoke = atRiskLicenses?.filter(license => {
      const bookings = license.bookings || [];
      const hasScheduledBooking = bookings.some(b =>
        ['scheduled', 'confirmed'].includes(b.status)
      );

      const hasSuggestedWithPastDeadline = bookings.some(b =>
        b.status === 'suggested' &&
        b.trial_deadline &&
        new Date(b.trial_deadline) < new Date()
      );

      return !hasScheduledBooking || hasSuggestedWithPastDeadline;
    }) || [];

    return NextResponse.json({
      message: `${licensesToRevoke.length} trial license(s) would be revoked`,
      licensesToRevoke,
      count: licensesToRevoke.length
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/onboarding/revoke-trials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
