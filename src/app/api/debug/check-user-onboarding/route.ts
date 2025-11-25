import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-direct';

/**
 * GET /api/debug/check-user-onboarding?email=user@example.com
 * Debug endpoint to check user's licenses and onboarding sessions
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    // 1. Get user
    const { data: user, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found', details: userError }, { status: 404 });
    }

    // 2. Get all licenses for this user
    const { data: licenses, error: licensesError } = await supabaseAdmin
      .from('license_keys')
      .select('*')
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false });

    if (licensesError) {
      return NextResponse.json({ error: 'Failed to fetch licenses', details: licensesError }, { status: 500 });
    }

    // 3. Get all onboarding sessions for this user
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('onboarding_session_bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      return NextResponse.json({ error: 'Failed to fetch sessions', details: sessionsError }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      licenses: licenses?.map(l => ({
        id: l.id,
        key_code: l.key_code,
        license_type: l.license_type,
        status: l.status,
        category: l.category,
        created_at: l.created_at,
        expires_at: l.expires_at
      })),
      onboarding_sessions: sessions?.map(s => ({
        id: s.id,
        license_key_id: s.license_key_id,
        status: s.status,
        is_mandatory: s.is_mandatory,
        is_trial_required: s.is_trial_required,
        title: s.title,
        trial_deadline: s.trial_deadline,
        created_at: s.created_at
      })),
      summary: {
        total_licenses: licenses?.length || 0,
        trial_licenses: licenses?.filter(l => l.license_type === 'trial').length || 0,
        licenses_with_trial_status: licenses?.filter(l => l.status === 'trial').length || 0,
        total_sessions: sessions?.length || 0,
        suggested_sessions: sessions?.filter(s => s.status === 'suggested').length || 0,
        mandatory_sessions: sessions?.filter(s => s.is_mandatory).length || 0
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error in check-user-onboarding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
