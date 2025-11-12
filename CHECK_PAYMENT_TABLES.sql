-- Check which payment-related tables exist in your database
-- Run this in Supabase SQL Editor

SELECT
  table_name,
  'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'stored_payment_methods',
    'payment_transactions',
    'native_app_subscriptions',
    'payment_methods',
    'invoices'
  )
ORDER BY table_name;

-- Check if you have any payment data in other tables
SELECT
  'Checking for existing payment data...' as info;

-- If payment_methods table exists, check it
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_methods') THEN
    RAISE NOTICE 'payment_methods table exists';
  END IF;
END $$;
