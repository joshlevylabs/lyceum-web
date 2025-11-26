-- Stripe Webhook Results Verification
-- Run this SQL in Supabase SQL Editor after testing webhooks

-- =====================================================
-- STEP 1: Find Recent Subscriptions
-- =====================================================
SELECT
    id,
    user_id,
    subscription_category,
    subscription_type,
    status,
    stripe_customer_id,
    stripe_subscription_id,
    created_at
FROM subscriptions
WHERE subscription_category = 'native_app'
ORDER BY created_at DESC
LIMIT 5;

-- Expected: At least one row with status='active', created within last few minutes


-- =====================================================
-- STEP 2: Find Associated Licenses
-- =====================================================
SELECT
    lk.id,
    lk.key_code,
    lk.license_type,
    lk.status,
    lk.assigned_to,
    lk.expires_at,
    lk.time_limit_type,
    lk.created_at
FROM license_keys lk
WHERE lk.license_type = 'main-application'
ORDER BY lk.created_at DESC
LIMIT 5;

-- Expected: License with matching created_at timestamp, key_code like 'LYC-APP-2025-XXXXXXXX' or 'CENTCOM-XXXXXXXX'


-- =====================================================
-- STEP 3: Verify License-Subscription Relationships
-- =====================================================
SELECT
    lsr.id,
    lsr.license_id,
    lsr.subscription_id,
    lsr.relationship_type,
    lsr.notes,
    lsr.created_at,
    -- Join with subscription details
    s.subscription_category,
    s.subscription_type,
    s.status as subscription_status,
    -- Join with license details
    lk.key_code,
    lk.license_type,
    lk.status as license_status
FROM license_subscription_relationships lsr
JOIN subscriptions s ON s.id = lsr.subscription_id
JOIN license_keys lk ON lk.id = lsr.license_id
WHERE s.subscription_category = 'native_app'
ORDER BY lsr.created_at DESC
LIMIT 5;

-- Expected: Relationship linking the subscription and license created in steps 1 & 2


-- =====================================================
-- STEP 4: Check User Profile Updates
-- =====================================================
SELECT
    id,
    email,
    stripe_customer_id,
    subscription_status,
    updated_at
FROM user_profiles
WHERE stripe_customer_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;

-- Expected: User profile with updated stripe_customer_id and subscription_status='active'


-- =====================================================
-- STEP 5: Full Subscription Details (All-in-One)
-- =====================================================
-- Replace 'YOUR_USER_ID_HERE' with actual user ID
SELECT
    -- User info
    up.email as user_email,
    up.stripe_customer_id,

    -- Subscription info
    s.id as subscription_id,
    s.subscription_category,
    s.subscription_type,
    s.status as subscription_status,
    s.stripe_subscription_id,
    s.created_at as subscription_created,

    -- License info
    lk.id as license_id,
    lk.key_code,
    lk.license_type,
    lk.status as license_status,
    lk.expires_at,
    lk.time_limit_type,
    lk.created_at as license_created,

    -- Relationship info
    lsr.relationship_type,
    lsr.notes

FROM user_profiles up
LEFT JOIN subscriptions s ON s.user_id = up.id
LEFT JOIN license_subscription_relationships lsr ON lsr.subscription_id = s.id
LEFT JOIN license_keys lk ON lk.id = lsr.license_id
WHERE up.id = 'YOUR_USER_ID_HERE'
  AND s.subscription_category = 'native_app'
ORDER BY s.created_at DESC;

-- Expected: Complete row showing all linked data


-- =====================================================
-- STEP 6: Check for Errors/Orphans
-- =====================================================

-- Find subscriptions without licenses
SELECT
    s.id,
    s.user_id,
    s.subscription_category,
    s.created_at,
    'No license relationship found' as issue
FROM subscriptions s
LEFT JOIN license_subscription_relationships lsr ON lsr.subscription_id = s.id
WHERE s.subscription_category = 'native_app'
  AND lsr.id IS NULL
  AND s.created_at > NOW() - INTERVAL '1 hour'
ORDER BY s.created_at DESC;

-- Expected: Empty result (no orphaned subscriptions)


-- Find licenses without subscriptions
SELECT
    lk.id,
    lk.key_code,
    lk.assigned_to,
    lk.created_at,
    'No subscription relationship found' as issue
FROM license_keys lk
LEFT JOIN license_subscription_relationships lsr ON lsr.license_id = lk.id
WHERE lk.license_type = 'main-application'
  AND lsr.id IS NULL
  AND lk.created_at > NOW() - INTERVAL '1 hour'
ORDER BY lk.created_at DESC;

-- Expected: Empty result (no orphaned licenses)


-- =====================================================
-- STEP 7: Webhook Processing Timeline
-- =====================================================
-- Shows the sequence of events and their timing
SELECT
    'Subscription Created' as event,
    s.created_at as timestamp,
    s.id as record_id
FROM subscriptions s
WHERE s.subscription_category = 'native_app'
  AND s.created_at > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT
    'License Created' as event,
    lk.created_at as timestamp,
    lk.id as record_id
FROM license_keys lk
WHERE lk.license_type = 'main-application'
  AND lk.created_at > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT
    'Relationship Created' as event,
    lsr.created_at as timestamp,
    lsr.id as record_id
FROM license_subscription_relationships lsr
WHERE lsr.created_at > NOW() - INTERVAL '1 hour'

ORDER BY timestamp DESC;

-- Expected: Three events within seconds of each other


-- =====================================================
-- CLEANUP (OPTIONAL - USE WITH CAUTION)
-- =====================================================
-- Uncomment to delete test data created during testing
-- WARNING: This will permanently delete data!

/*
-- Delete test license-subscription relationships
DELETE FROM license_subscription_relationships
WHERE subscription_id IN (
    SELECT id FROM subscriptions
    WHERE stripe_customer_id LIKE 'cus_test_%'
);

-- Delete test licenses
DELETE FROM license_keys
WHERE key_code LIKE 'LYC-APP-2025-%'
  AND created_at > NOW() - INTERVAL '1 hour';

-- Delete test subscriptions
DELETE FROM subscriptions
WHERE stripe_customer_id LIKE 'cus_test_%';
*/
