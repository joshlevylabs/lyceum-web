-- ==============================================================================
-- QUICK DIAGNOSTIC - Run this single query to check everything
-- ==============================================================================
-- This query checks:
-- 1. User account status
-- 2. License status
-- 3. Payment method storage
-- 4. Database schema readiness
-- 5. What needs to be done next
-- ==============================================================================

-- Check user account
SELECT '=== 1. USER ACCOUNT ===' as section;
SELECT
  'User:' as info,
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'josh@thelyceum.io';

-- Check user profile
SELECT '=== 2. USER PROFILE ===' as section;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    RAISE NOTICE 'Checking user profile with stripe_customer_id column...';
    PERFORM * FROM user_profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'josh@thelyceum.io');
  ELSE
    RAISE NOTICE '⚠️ stripe_customer_id column does not exist yet - migration needed';
  END IF;
END $$;

-- Show profile info (without stripe_customer_id if column doesn't exist)
SELECT
  'Profile:' as info,
  id,
  company,
  created_at
FROM user_profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'josh@thelyceum.io');

-- Check licenses
SELECT '=== 3. LICENSE STATUS ===' as section;
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '❌ No main-application license found'
    WHEN COUNT(*) > 0 THEN '✅ Has ' || COUNT(*) || ' main-application license(s)'
  END as license_status,
  STRING_AGG(key_code, ', ') as license_keys,
  STRING_AGG(status, ', ') as statuses
FROM license_keys
WHERE assigned_to = (SELECT id FROM auth.users WHERE email = 'josh@thelyceum.io')
  AND license_type = 'main-application';

-- Show all licenses (any type)
SELECT
  'All Licenses:' as info,
  key_code,
  license_type,
  status,
  created_at
FROM license_keys
WHERE assigned_to = (SELECT id FROM auth.users WHERE email = 'josh@thelyceum.io')
ORDER BY created_at DESC;

-- Check database schema status
SELECT '=== 4. DATABASE SCHEMA ===' as section;
SELECT
  table_name,
  CASE
    WHEN table_name = 'user_profiles' THEN '✅ Core table'
    WHEN table_name = 'license_keys' THEN '✅ Core table'
    WHEN table_name = 'stored_payment_methods' THEN '✅ Payment system table'
    WHEN table_name = 'payment_transactions' THEN '✅ Payment system table'
    WHEN table_name = 'native_app_subscriptions' THEN '✅ Subscription table'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_profiles',
    'license_keys',
    'stored_payment_methods',
    'payment_transactions',
    'native_app_subscriptions'
  )
ORDER BY table_name;

-- Check if stripe_customer_id column exists
SELECT '=== 5. STRIPE CUSTOMER ID COLUMN ===' as section;
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'user_profiles'
        AND column_name = 'stripe_customer_id'
    ) THEN '✅ stripe_customer_id column exists in user_profiles'
    ELSE '❌ MIGRATION NEEDED: stripe_customer_id column missing from user_profiles'
  END as column_status;

-- Check payment methods stored locally
SELECT '=== 6. STORED PAYMENT METHODS ===' as section;
SELECT
  COALESCE(
    (SELECT COUNT(*)::text || ' payment methods stored locally'
     FROM stored_payment_methods
     WHERE user_id = (SELECT id FROM auth.users WHERE email = 'josh@thelyceum.io')),
    '❌ Table does not exist or no payment methods stored'
  ) as payment_methods_status;

-- Check subscriptions
SELECT '=== 7. SUBSCRIPTIONS ===' as section;
SELECT
  COALESCE(
    (SELECT COUNT(*)::text || ' subscriptions found'
     FROM native_app_subscriptions
     WHERE user_id = (SELECT id FROM auth.users WHERE email = 'josh@thelyceum.io')),
    '❌ Table does not exist or no subscriptions'
  ) as subscription_status;

-- Final diagnosis and action items
SELECT '=== 8. DIAGNOSIS & ACTION ITEMS ===' as section;

-- Action item 1: Migrations
SELECT
  'Action 1:' as priority,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stored_payment_methods')
      OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions')
      OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'native_app_subscriptions')
      OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'stripe_customer_id')
    THEN '⚠️  APPLY MIGRATIONS - Some tables/columns are missing. Run all migration files in supabase/migrations/'
    ELSE '✅ Database schema is complete'
  END as action;

-- Action item 2: License
SELECT
  'Action 2:' as priority,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM license_keys
      WHERE assigned_to = (SELECT id FROM auth.users WHERE email = 'josh@thelyceum.io')
        AND license_type = 'main-application'
        AND status = 'active'
    )
    THEN '⚠️  GENERATE LICENSE - User needs a main-application license. Complete subscription flow or POST to /api/licenses/generate-main-app'
    ELSE '✅ User has active main-application license'
  END as action;

-- Action item 3: Payment methods
SELECT
  'Action 3:' as priority,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'stripe_customer_id')
    THEN '⚠️  STRIPE CUSTOMER ID COLUMN - Migration needed to add stripe_customer_id column to user_profiles'
    ELSE '⚠️  STRIPE CUSTOMER ID - Payment check will search Stripe by email (josh@thelyceum.io) and cache the customer ID'
  END as action;

-- Summary
SELECT '=== 9. SUMMARY ===' as section;
SELECT
  'Summary:' as info,
  CASE
    -- All good
    WHEN EXISTS (SELECT 1 FROM license_keys WHERE assigned_to = (SELECT id FROM auth.users WHERE email = 'josh@thelyceum.io') AND license_type = 'main-application' AND status = 'active')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stored_payment_methods')
    THEN '✅ System is ready! User can click "Get Lyceum Native" and should be routed directly to download page.'

    -- Missing license
    WHEN NOT EXISTS (SELECT 1 FROM license_keys WHERE assigned_to = (SELECT id FROM auth.users WHERE email = 'josh@thelyceum.io') AND license_type = 'main-application' AND status = 'active')
    THEN '⚠️  User needs a license. User should click "Start Free Trial" to complete subscription flow and generate license.'

    -- Missing tables
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stored_payment_methods')
    THEN '❌ Database migrations needed! Apply all migration files first.'

    ELSE '⚠️  Check action items above for details.'
  END as status;

-- Expected Stripe info
SELECT '=== 10. EXPECTED STRIPE DATA ===' as section;
SELECT
  'Expected Stripe Customer:' as info,
  'cus_T7ZjWDtzZA3IG6' as customer_id,
  'josh@thelyceum.io' as email,
  '3 payment methods' as payment_methods,
  'pm_1SBLuJLXAQw5VHo2WrxFnpTj, pm_1SBLghLXAQw5VHo2luPNd4KQ, pm_1SBKZeLXAQw5VHo2UUiNXQvb' as payment_method_ids;
