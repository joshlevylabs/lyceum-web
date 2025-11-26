-- ============================================
-- TRIAL DATA CLEANUP SCRIPT
-- ============================================
-- WARNING: This will delete ONLY trial subscriptions and trial licenses.
-- Paid subscriptions and paid licenses will be preserved.
--
-- Use this to reset trial status so you can test trial flows again.
-- ============================================

-- Start transaction for safety
BEGIN;

-- ============================================
-- STEP 1: Show current counts (before cleanup)
-- ============================================
SELECT 'BEFORE CLEANUP' as stage, '==================' as separator;

SELECT 'All Subscriptions' as table_name, COUNT(*) as count FROM subscriptions;
SELECT 'Trial Subscriptions' as table_name, COUNT(*) as count FROM subscriptions WHERE subscription_type = 'trial';
SELECT 'All License Keys' as table_name, COUNT(*) as count FROM license_keys;
SELECT 'Trial License Keys' as table_name, COUNT(*) as count FROM license_keys WHERE status = 'trial' OR time_limit_type IN ('trial', 'trial_30');
SELECT 'License-Subscription Relationships' as table_name, COUNT(*) as count FROM license_subscription_relationships;
SELECT 'Onboarding Session Bookings' as table_name, COUNT(*) as count FROM onboarding_session_bookings;

-- ============================================
-- STEP 2: Delete license-subscription relationships for trial licenses
-- ============================================
DELETE FROM license_subscription_relationships
WHERE license_id IN (
  SELECT id FROM license_keys
  WHERE status = 'trial'
     OR time_limit_type IN ('trial', 'trial_30')
     OR expires_at IS NOT NULL
);
SELECT 'Deleted trial license-subscription relationships' as status;

-- ============================================
-- STEP 3: Delete onboarding sessions for trial licenses
-- ============================================
DELETE FROM onboarding_session_bookings
WHERE license_key_id IN (
  SELECT id FROM license_keys
  WHERE status = 'trial'
     OR time_limit_type IN ('trial', 'trial_30')
     OR expires_at IS NOT NULL
);
SELECT 'Deleted onboarding sessions for trial licenses' as status;

-- ============================================
-- STEP 4: Delete all trial licenses
-- ============================================
-- Delete licenses where:
-- - status = 'trial' OR
-- - time_limit_type is 'trial' or 'trial_30' OR
-- - expires_at is set (indicates time-limited/trial license)
DELETE FROM license_keys
WHERE status = 'trial'
   OR time_limit_type IN ('trial', 'trial_30')
   OR (expires_at IS NOT NULL AND status != 'active');
SELECT 'Deleted all trial licenses' as status;

-- ============================================
-- STEP 5: Delete all trial subscriptions
-- ============================================
DELETE FROM subscriptions
WHERE subscription_type = 'trial';
SELECT 'Deleted all trial subscriptions' as status;

-- ============================================
-- STEP 6: Show final counts (after cleanup)
-- ============================================
SELECT 'AFTER CLEANUP' as stage, '==================' as separator;

SELECT 'All Subscriptions (Remaining)' as table_name, COUNT(*) as count FROM subscriptions;
SELECT 'Trial Subscriptions (Should be 0)' as table_name, COUNT(*) as count FROM subscriptions WHERE subscription_type = 'trial';
SELECT 'All License Keys (Remaining)' as table_name, COUNT(*) as count FROM license_keys;
SELECT 'Trial License Keys (Should be 0)' as table_name, COUNT(*) as count FROM license_keys WHERE status = 'trial' OR time_limit_type IN ('trial', 'trial_30');
SELECT 'License-Subscription Relationships' as table_name, COUNT(*) as count FROM license_subscription_relationships;
SELECT 'Onboarding Session Bookings' as table_name, COUNT(*) as count FROM onboarding_session_bookings;

-- ============================================
-- STEP 7: Verify paid subscriptions and licenses are preserved
-- ============================================
SELECT 'Paid subscriptions preserved:' as info, COUNT(*) as count FROM subscriptions WHERE subscription_type = 'paid';
SELECT 'Active (non-trial) licenses preserved:' as info, COUNT(*) as count FROM license_keys WHERE status = 'active' AND (time_limit_type IS NULL OR time_limit_type = 'unlimited');
SELECT 'User accounts preserved:' as info, COUNT(*) as user_count FROM user_profiles;

-- ============================================
-- COMMIT or ROLLBACK
-- ============================================
-- IMPORTANT: Review the output above before committing!
--
-- To commit the changes, run:
-- COMMIT;
--
-- To undo everything (if you see something wrong), run:
-- ROLLBACK;

-- Uncomment ONE of these lines:
-- COMMIT;   -- Uncomment this to apply all changes
-- ROLLBACK; -- Uncomment this to undo everything

SELECT 'Transaction is still open. Run COMMIT; to apply or ROLLBACK; to undo.' as reminder;
