-- CLEANUP INVALID LICENSES AND SUBSCRIPTIONS
-- Run these queries in your Supabase SQL editor to clean up test data

-- Step 1: Check what invalid data exists
-- Replace 'YOUR_USER_ID' with your actual user ID (f992e7e5-ab7b-4db3-902f-25dff726360c)

-- Check existing licenses
SELECT
  id,
  key_code,
  license_type,
  time_limit_type,
  expires_at,
  features,
  created_at
FROM license_keys
WHERE assigned_to = 'f992e7e5-ab7b-4db3-902f-25dff726360c'
ORDER BY created_at DESC;

-- Check existing subscriptions
SELECT
  id,
  subscription_type,
  status,
  stripe_session_id,
  created_at
FROM user_subscriptions_native_app
WHERE user_id = 'f992e7e5-ab7b-4db3-902f-25dff726360c'
ORDER BY created_at DESC;

-- Step 2: DELETE invalid licenses (generated without payment)
-- Run this ONLY if you confirmed above that these licenses should be deleted
DELETE FROM license_keys
WHERE assigned_to = 'f992e7e5-ab7b-4db3-902f-25dff726360c'
AND license_type = 'main-application';

-- Step 3: DELETE invalid subscriptions (created without payment)
-- Run this ONLY if you confirmed above that these subscriptions should be deleted
DELETE FROM user_subscriptions_native_app
WHERE user_id = 'f992e7e5-ab7b-4db3-902f-25dff726360c';

-- Step 4: Verify cleanup
SELECT
  'Remaining licenses' as type,
  COUNT(*) as count
FROM license_keys
WHERE assigned_to = 'f992e7e5-ab7b-4db3-902f-25dff726360c'
UNION ALL
SELECT
  'Remaining subscriptions' as type,
  COUNT(*) as count
FROM user_subscriptions_native_app
WHERE user_id = 'f992e7e5-ab7b-4db3-902f-25dff726360c';

-- Expected result after cleanup:
-- Remaining licenses: 0
-- Remaining subscriptions: 0
