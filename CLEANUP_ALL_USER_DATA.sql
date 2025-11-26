-- ============================================
-- COMPREHENSIVE USER DATA CLEANUP SCRIPT
-- ============================================
-- WARNING: This will delete ALL subscriptions, licenses, payment methods,
-- and onboarding sessions for ALL users. User accounts will be preserved.
--
-- Use this for testing fresh subscription flows.
-- ============================================

-- Start transaction for safety
BEGIN;

-- ============================================
-- STEP 1: Show current counts (before cleanup)
-- ============================================
SELECT 'BEFORE CLEANUP' as stage, '==================' as separator;

SELECT 'Subscriptions' as table_name, COUNT(*) as count FROM subscriptions;
SELECT 'License Keys' as table_name, COUNT(*) as count FROM license_keys;
SELECT 'License-Subscription Relationships' as table_name, COUNT(*) as count FROM license_subscription_relationships;
SELECT 'Stored Payment Methods' as table_name, COUNT(*) as count FROM stored_payment_methods;
SELECT 'Payment Transactions' as table_name, COUNT(*) as count FROM payment_transactions;
SELECT 'Onboarding Session Bookings' as table_name, COUNT(*) as count FROM onboarding_session_bookings;
SELECT 'Admin Availability Slots' as table_name, COUNT(*) as count FROM admin_availability_slots;

-- ============================================
-- STEP 2: Delete license-subscription relationships first (foreign keys)
-- ============================================
DELETE FROM license_subscription_relationships;
SELECT 'Deleted all license-subscription relationships' as status;

-- ============================================
-- STEP 3: Delete all onboarding-related data
-- ============================================
-- Delete all user onboarding session bookings (keeps admin availability slots)
DELETE FROM onboarding_session_bookings;
SELECT 'Deleted all onboarding session bookings' as status;

-- Optional: Uncomment to also delete admin availability slots
-- (Usually you want to keep admin availability slots for future bookings)
-- DELETE FROM admin_availability_slots WHERE admin_user_id IN (
--   SELECT id FROM user_profiles WHERE role NOT IN ('superadmin', 'super_admin', 'admin')
-- );
-- SELECT 'Deleted non-admin availability slots' as status;

-- ============================================
-- STEP 4: Delete all licenses
-- ============================================
DELETE FROM license_keys;
SELECT 'Deleted all license keys' as status;

-- ============================================
-- STEP 5: Delete all subscriptions
-- ============================================
DELETE FROM subscriptions;
SELECT 'Deleted all subscriptions' as status;

-- ============================================
-- STEP 6: Delete all payment-related data
-- ============================================
DELETE FROM stored_payment_methods;
SELECT 'Deleted all stored payment methods' as status;

DELETE FROM payment_transactions;
SELECT 'Deleted all payment transactions' as status;

-- ============================================
-- STEP 7: Clean up user profile subscription fields
-- ============================================
-- Note: Only clearing stripe_customer_id since other subscription fields
-- have been removed from user_profiles table (moved to subscriptions table)
UPDATE user_profiles
SET stripe_customer_id = NULL
WHERE stripe_customer_id IS NOT NULL;
SELECT 'Cleaned up user profile stripe_customer_id field' as status;

-- ============================================
-- STEP 8: Show final counts (after cleanup)
-- ============================================
SELECT 'AFTER CLEANUP' as stage, '==================' as separator;

SELECT 'Subscriptions' as table_name, COUNT(*) as count FROM subscriptions;
SELECT 'License Keys' as table_name, COUNT(*) as count FROM license_keys;
SELECT 'License-Subscription Relationships' as table_name, COUNT(*) as count FROM license_subscription_relationships;
SELECT 'Stored Payment Methods' as table_name, COUNT(*) as count FROM stored_payment_methods;
SELECT 'Payment Transactions' as table_name, COUNT(*) as count FROM payment_transactions;
SELECT 'Onboarding Session Bookings' as table_name, COUNT(*) as count FROM onboarding_session_bookings;
SELECT 'Admin Availability Slots' as table_name, COUNT(*) as count FROM admin_availability_slots;

-- ============================================
-- STEP 9: Verify user accounts are preserved
-- ============================================
SELECT 'User accounts preserved:' as info, COUNT(*) as user_count FROM user_profiles;
SELECT 'Auth users preserved:' as info, COUNT(*) as auth_user_count FROM auth.users;

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
