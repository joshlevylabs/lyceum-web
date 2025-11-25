// Debug script to check onboarding sessions for trial license users
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function debugOnboarding() {
  console.log('\n=== DEBUGGING ONBOARDING SESSIONS ===\n');

  // 1. Check user
  console.log('1. Checking user: farbisimo@gmail.com');
  const { data: user, error: userError } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('email', 'farbisimo@gmail.com')
    .single();

  if (userError) {
    console.error('User error:', userError);
    return;
  }

  console.log('User found:', { id: user.id, email: user.email, full_name: user.full_name });

  // 2. Check licenses
  console.log('\n2. Checking licenses for user:');
  const { data: licenses, error: licensesError } = await supabaseAdmin
    .from('license_keys')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (licensesError) {
    console.error('Licenses error:', licensesError);
    return;
  }

  console.log(`Found ${licenses.length} licenses:`);
  licenses.forEach(license => {
    console.log(`  - ${license.key_code} (${license.license_type}, status: ${license.status})`);
  });

  // 3. Check onboarding sessions
  console.log('\n3. Checking onboarding sessions for user:');
  const { data: sessions, error: sessionsError } = await supabaseAdmin
    .from('onboarding_session_bookings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (sessionsError) {
    console.error('Sessions error:', sessionsError);
    return;
  }

  console.log(`Found ${sessions.length} onboarding sessions:`);
  sessions.forEach(session => {
    console.log(`  - ${session.title} (status: ${session.status}, mandatory: ${session.is_mandatory}, trial_required: ${session.is_trial_required})`);
  });

  // 4. Try to manually create a suggested session if missing
  if (sessions.length === 0 && licenses.length > 0) {
    console.log('\n4. No sessions found - attempting to manually create suggested sessions:');

    for (const license of licenses) {
      if (license.license_type === 'trial' && license.status === 'active') {
        console.log(`  Creating suggested session for license ${license.key_code}...`);

        const { data: newSession, error: createError } = await supabaseAdmin
          .from('onboarding_session_bookings')
          .insert({
            user_id: user.id,
            license_key_id: license.id,
            status: 'suggested',
            is_mandatory: true,
            is_trial_required: true,
            trial_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            session_type: 'initial_onboarding',
            title: `Onboarding for ${license.license_type} License`,
            description: `Welcome to Lyceum! This onboarding session will help you get started with your new ${license.license_type} license. We'll cover setup, key features, and answer any questions you may have. ⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.`
          })
          .select()
          .single();

        if (createError) {
          console.error(`  Error creating session:`, createError);
        } else {
          console.log(`  ✅ Created session:`, newSession.id);
        }
      }
    }
  }

  // 5. Re-check sessions after creation
  console.log('\n5. Re-checking onboarding sessions:');
  const { data: finalSessions, error: finalError } = await supabaseAdmin
    .from('onboarding_session_bookings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (!finalError) {
    console.log(`Found ${finalSessions.length} onboarding sessions:`);
    finalSessions.forEach(session => {
      console.log(`  - ${session.title} (status: ${session.status}, mandatory: ${session.is_mandatory})`);
    });
  }

  console.log('\n=== DEBUG COMPLETE ===\n');
}

debugOnboarding().catch(console.error);
