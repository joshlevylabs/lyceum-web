-- Diagnostic query to check user's license status
-- This will help identify why the user doesn't have a main-application license

-- First, find the user by email
SELECT
  'User Information:' as section,
  id as user_id,
  email,
  created_at as user_created_at
FROM auth.users
WHERE email = 'josh@thelyceum.io';

-- Check if user has ANY licenses
SELECT
  'All Licenses for User:' as section,
  lk.id,
  lk.key_code,
  lk.license_type,
  lk.status,
  lk.assigned_at,
  lk.expires_at,
  lk.features,
  lk.created_at
FROM license_keys lk
JOIN auth.users u ON lk.assigned_to = u.id
WHERE u.email = 'josh@thelyceum.io'
ORDER BY lk.created_at DESC;

-- Check specifically for main-application licenses (active and inactive)
SELECT
  'Main-Application Licenses:' as section,
  lk.id,
  lk.key_code,
  lk.license_type,
  lk.status,
  lk.assigned_at,
  lk.expires_at,
  lk.features,
  lk.created_at
FROM license_keys lk
JOIN auth.users u ON lk.assigned_to = u.id
WHERE u.email = 'josh@thelyceum.io'
  AND lk.license_type = 'main-application'
ORDER BY lk.created_at DESC;

-- Check if user has a subscription
SELECT
  'Native App Subscriptions:' as section,
  nas.id,
  nas.subscription_type,
  nas.status,
  nas.trial_end_date,
  nas.subscription_end_date,
  nas.created_at
FROM native_app_subscriptions nas
JOIN auth.users u ON nas.user_id = u.id
WHERE u.email = 'josh@thelyceum.io'
ORDER BY nas.created_at DESC;

-- Check user's Stripe customer ID
SELECT
  'User Profile Info:' as section,
  up.id,
  up.stripe_customer_id,
  up.company,
  up.created_at
FROM user_profiles up
JOIN auth.users u ON up.id = u.id
WHERE u.email = 'josh@thelyceum.io';

-- Summary: What should happen next
SELECT
  '=== DIAGNOSIS ===' as section,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM license_keys lk
      JOIN auth.users u ON lk.assigned_to = u.id
      WHERE u.email = 'josh@thelyceum.io'
        AND lk.license_type = 'main-application'
        AND lk.status = 'active'
    )
    THEN 'User does NOT have an active main-application license. User should either: 1) Generate a license via POST /api/licenses/generate-main-app, OR 2) Complete subscription flow'
    ELSE 'User HAS an active main-application license. Check API implementation.'
  END as diagnosis;
