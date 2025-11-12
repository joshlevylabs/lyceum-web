-- Check if required tables and columns exist
-- Run this to verify database schema is properly set up

-- Check if user_profiles table has stripe_customer_id column
SELECT
  'user_profiles columns:' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check if stored_payment_methods table exists
SELECT
  'stored_payment_methods columns:' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'stored_payment_methods'
ORDER BY ordinal_position;

-- Check if payment_transactions table exists
SELECT
  'payment_transactions columns:' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payment_transactions'
ORDER BY ordinal_position;

-- Check if native_app_subscriptions table exists
SELECT
  'native_app_subscriptions columns:' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'native_app_subscriptions'
ORDER BY ordinal_position;

-- Check if license_keys table exists and has correct structure
SELECT
  'license_keys columns:' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'license_keys'
ORDER BY ordinal_position;

-- Summary: Which tables need migration
SELECT
  '=== MIGRATION STATUS ===' as section,
  table_name,
  CASE
    WHEN table_name IN ('stored_payment_methods', 'payment_transactions', 'native_app_subscriptions')
    THEN 'NEEDS MIGRATION: Run migration file in supabase/migrations/'
    ELSE 'EXISTS'
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

-- Check if stripe_customer_id column exists in user_profiles
SELECT
  '=== STRIPE CUSTOMER ID COLUMN ===' as section,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'stripe_customer_id'
    )
    THEN 'stripe_customer_id column EXISTS in user_profiles'
    ELSE 'stripe_customer_id column DOES NOT EXIST - needs migration'
  END as status;
