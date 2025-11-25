-- ================================================================
-- TEST ONBOARDING SCHEDULING SYSTEM
-- ================================================================
-- This script helps you test the onboarding scheduling system
-- ================================================================

-- Step 1: Get your user ID from auth.users
SELECT id, email, raw_user_meta_data->>'full_name' as full_name
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'; -- Replace with your email

-- Step 2: Verify you have a user profile
SELECT id, email, full_name, role
FROM user_profiles
WHERE id = 'YOUR_USER_ID_HERE'; -- Replace with your user ID from step 1

-- Step 3: Insert a trial license (this should auto-create a suggested onboarding session)
-- IMPORTANT: Use the correct column name 'assigned_to' instead of 'user_id'
INSERT INTO license_keys (
  assigned_to,  -- Use assigned_to, not user_id
  key_code,
  license_type,
  status,
  category,
  expires_at
) VALUES (
  'YOUR_USER_ID_HERE', -- Replace with actual user ID
  'TRIAL-' || gen_random_uuid(),
  'trial',
  'active',
  'centcom',
  NOW() + INTERVAL '14 days'
)
RETURNING *;

-- Step 4: Check that a suggested onboarding session was created
SELECT
  id,
  user_id,
  license_key_id,
  admin_user_id,
  title,
  status,
  is_mandatory,
  is_trial_required,
  trial_deadline,
  scheduled_start_time,
  created_at
FROM onboarding_session_bookings
WHERE user_id = 'YOUR_USER_ID_HERE'
ORDER BY created_at DESC;

-- Step 5: Verify the license was created correctly
SELECT
  id,
  key_code,
  license_type,
  status,
  assigned_to,
  created_at,
  expires_at
FROM license_keys
WHERE assigned_to = 'YOUR_USER_ID_HERE'
ORDER BY created_at DESC;

-- ================================================================
-- ADMIN SETUP (Optional)
-- ================================================================
-- If you want to test booking with admin availability slots

-- Step 6a: Make yourself an admin (if not already)
UPDATE user_profiles
SET role = 'admin'
WHERE id = 'YOUR_USER_ID_HERE';

-- Step 6b: Create some admin availability slots
INSERT INTO admin_availability_slots (
  admin_user_id,
  start_time,
  end_time,
  duration_minutes,
  capacity,
  booked_count,
  is_available,
  meeting_platform,
  location,
  notes
) VALUES
  -- Tomorrow at 10 AM
  (
    'YOUR_USER_ID_HERE', -- Admin user ID
    (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '10 hours')::timestamp with time zone,
    (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '11 hours')::timestamp with time zone,
    60,
    5,
    0,
    true,
    'zoom',
    'https://zoom.us/j/YOUR_MEETING_ID',
    'Trial onboarding session'
  ),
  -- Day after tomorrow at 2 PM
  (
    'YOUR_USER_ID_HERE',
    (CURRENT_DATE + INTERVAL '2 days' + INTERVAL '14 hours')::timestamp with time zone,
    (CURRENT_DATE + INTERVAL '2 days' + INTERVAL '15 hours')::timestamp with time zone,
    60,
    5,
    0,
    true,
    'google_meet',
    'https://meet.google.com/YOUR_MEETING_CODE',
    'Professional onboarding session'
  ),
  -- Next week Monday at 9 AM
  (
    'YOUR_USER_ID_HERE',
    (CURRENT_DATE + INTERVAL '1 week' + INTERVAL '9 hours')::timestamp with time zone,
    (CURRENT_DATE + INTERVAL '1 week' + INTERVAL '10 hours')::timestamp with time zone,
    60,
    3,
    0,
    true,
    'zoom',
    'https://zoom.us/j/YOUR_MEETING_ID',
    'Enterprise onboarding session'
  );

-- Step 7: Verify availability slots were created
SELECT
  id,
  admin_user_id,
  start_time,
  end_time,
  capacity,
  booked_count,
  is_available,
  meeting_platform
FROM admin_availability_slots
WHERE admin_user_id = 'YOUR_USER_ID_HERE'
ORDER BY start_time;

-- ================================================================
-- CLEANUP (Optional)
-- ================================================================
-- Use these queries to clean up test data if needed

-- Remove test bookings
-- DELETE FROM onboarding_session_bookings
-- WHERE user_id = 'YOUR_USER_ID_HERE';

-- Remove test licenses
-- DELETE FROM license_keys
-- WHERE assigned_to = 'YOUR_USER_ID_HERE';

-- Remove test availability slots
-- DELETE FROM admin_availability_slots
-- WHERE admin_user_id = 'YOUR_USER_ID_HERE';

-- ================================================================
-- TROUBLESHOOTING
-- ================================================================

-- Check if trigger exists
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as is_enabled
FROM pg_trigger
WHERE tgname = 'trigger_create_onboarding_on_license_creation';

-- Check if function exists
SELECT
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'create_suggested_onboarding_session';

-- Check for any errors in recent license creations
SELECT
  id,
  key_code,
  license_type,
  assigned_to,
  created_at
FROM license_keys
ORDER BY created_at DESC
LIMIT 10;

-- Check for any suggested sessions
SELECT
  id,
  user_id,
  status,
  title,
  is_mandatory,
  trial_deadline,
  created_at
FROM onboarding_session_bookings
WHERE status = 'suggested'
ORDER BY created_at DESC
LIMIT 10;
