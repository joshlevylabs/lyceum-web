-- Check trial licenses for farbisimo@gmail.com
SELECT 'LICENSES FOR farbisimo@gmail.com:' as section;
SELECT u.email, lk.id, lk.key_code, lk.license_type, lk.status, lk.created_at
FROM license_keys lk
JOIN user_profiles u ON lk.user_id = u.id
WHERE u.email = 'farbisimo@gmail.com'
ORDER BY lk.created_at DESC;

-- Check onboarding sessions for farbisimo@gmail.com
SELECT 'ONBOARDING SESSIONS FOR farbisimo@gmail.com:' as section;
SELECT osb.id, osb.user_id, osb.license_key_id, osb.status, osb.is_mandatory, osb.is_trial_required, osb.title, osb.created_at
FROM onboarding_session_bookings osb
JOIN user_profiles u ON osb.user_id = u.id
WHERE u.email = 'farbisimo@gmail.com'
ORDER BY osb.created_at DESC;

-- Check if trigger exists
SELECT 'TRIGGER STATUS:' as section;
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_onboarding_on_license_creation';
