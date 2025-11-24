-- ============================================
-- PAYMENT SYSTEM FIXES - Run this in Supabase SQL Editor
-- Created: 2025-01-23
-- Purpose: Fix duplicate licenses, payment methods, and payment history
-- ============================================

-- ============================================
-- PART 1: Add stripe_subscription_id column
-- ============================================

-- Add stripe_subscription_id column for recurring subscriptions
ALTER TABLE user_subscriptions_native_app
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add index for Stripe subscription lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_native_app_stripe_sub
ON user_subscriptions_native_app(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN user_subscriptions_native_app.stripe_subscription_id IS 'Stripe Subscription ID for recurring payments (null for one-time payments)';

-- ============================================
-- PART 2: Clean up duplicate licenses
-- ============================================

-- First, check for existing duplicates and mark older ones as superseded
DO $$
DECLARE
  duplicate_count INTEGER;
  affected_rows INTEGER;
BEGIN
  -- Find users with multiple active main-application licenses
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT assigned_to, COUNT(*) as license_count
    FROM license_keys
    WHERE license_type = 'main-application'
      AND status IN ('active', 'trial')
      AND assigned_to IS NOT NULL
    GROUP BY assigned_to
    HAVING COUNT(*) > 1
  ) AS duplicates;

  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % users with duplicate licenses. Marking older licenses as superseded...', duplicate_count;

    -- Keep the newest license for each user, mark older ones as superseded
    UPDATE license_keys lk
    SET status = 'superseded',
        updated_at = NOW()
    WHERE lk.id IN (
      SELECT id
      FROM (
        SELECT id, assigned_to,
               ROW_NUMBER() OVER (PARTITION BY assigned_to ORDER BY created_at DESC) as rn
        FROM license_keys
        WHERE license_type = 'main-application'
          AND status IN ('active', 'trial')
          AND assigned_to IS NOT NULL
      ) ranked
      WHERE rn > 1
    );

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE '✅ Marked % duplicate licenses as superseded', affected_rows;
  ELSE
    RAISE NOTICE '✅ No duplicate licenses found';
  END IF;
END $$;

-- ============================================
-- PART 3: Add unique constraint to prevent future duplicates
-- ============================================

-- Add partial unique index to prevent duplicate active main-application licenses
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_main_app_license_per_user
ON license_keys(assigned_to, license_type)
WHERE license_type = 'main-application'
  AND status IN ('active', 'trial')
  AND assigned_to IS NOT NULL;

COMMENT ON INDEX idx_unique_active_main_app_license_per_user IS
  'Ensures each user can only have one active or trial main-application license';

-- ============================================
-- VERIFICATION
-- ============================================

-- Check if stripe_subscription_id column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions_native_app'
    AND column_name = 'stripe_subscription_id'
  ) THEN
    RAISE NOTICE '✅ Column stripe_subscription_id added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add column stripe_subscription_id';
  END IF;
END $$;

-- Check if unique constraint was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_unique_active_main_app_license_per_user'
  ) THEN
    RAISE NOTICE '✅ Unique constraint on licenses created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create unique constraint';
  END IF;
END $$;

-- Show current license status for verification
SELECT
  'License Status Summary' as report_type,
  status,
  COUNT(*) as count
FROM license_keys
WHERE license_type = 'main-application'
GROUP BY status
ORDER BY count DESC;

-- Show any remaining potential conflicts (should be empty)
SELECT
  'Remaining Duplicates' as report_type,
  assigned_to,
  COUNT(*) as license_count,
  ARRAY_AGG(key_code ORDER BY created_at DESC) as licenses,
  ARRAY_AGG(status ORDER BY created_at DESC) as statuses
FROM license_keys
WHERE license_type = 'main-application'
  AND status IN ('active', 'trial')
  AND assigned_to IS NOT NULL
GROUP BY assigned_to
HAVING COUNT(*) > 1;

-- Show schema of user_subscriptions_native_app table
SELECT
  'Table Schema: user_subscriptions_native_app' as report_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_subscriptions_native_app'
ORDER BY ordinal_position;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ PAYMENT SYSTEM FIXES APPLIED SUCCESSFULLY  ║';
  RAISE NOTICE '╚════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Deploy code changes to production';
  RAISE NOTICE '2. Test webhook with new payment';
  RAISE NOTICE '3. Verify payment methods and history appear';
  RAISE NOTICE '';
END $$;
