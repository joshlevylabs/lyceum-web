-- Diagnose why license data isn't showing for clusters
-- Run this in Supabase SQL Editor

-- Step 1: Check josh's user ID
SELECT
  id as user_id,
  email,
  full_name
FROM user_profiles
WHERE email = 'josh@thelyceum.io';

-- Step 2: Check all josh's local clusters and their license_id values
SELECT
  lcu.id,
  lcu.cluster_key,
  lcu.machine_fingerprint,
  lcu.license_id,
  lcu.user_id,
  CASE
    WHEN lcu.license_id IS NULL THEN '❌ NO LICENSE LINKED'
    ELSE '✅ Has License ID'
  END as license_status
FROM local_cluster_usage lcu
WHERE lcu.user_id IN (
  SELECT id FROM user_profiles WHERE email = 'josh@thelyceum.io'
)
ORDER BY lcu.last_heartbeat_at DESC;

-- Step 3: Check if those license IDs exist in license_keys table
SELECT
  lcu.cluster_key,
  lcu.machine_fingerprint,
  lcu.license_id as cluster_license_id,
  lk.id as license_table_id,
  lk.key_code,
  lk.license_type,
  lk.local_cluster_limits,
  CASE
    WHEN lk.id IS NULL THEN '❌ LICENSE NOT FOUND'
    WHEN lk.local_cluster_limits IS NULL THEN '⚠️ License found but no limits'
    ELSE '✅ License found with limits'
  END as status
FROM local_cluster_usage lcu
LEFT JOIN license_keys lk ON lcu.license_id = lk.id
WHERE lcu.user_id IN (
  SELECT id FROM user_profiles WHERE email = 'josh@thelyceum.io'
)
ORDER BY lcu.last_heartbeat_at DESC;

-- Step 4: Show ALL license_keys with their limits
SELECT
  id,
  key_code,
  license_type,
  jsonb_pretty(local_cluster_limits) as limits,
  created_at
FROM license_keys
ORDER BY created_at DESC;

-- Step 5: Count orphaned clusters (no license)
SELECT
  COUNT(*) as total_clusters,
  COUNT(license_id) as clusters_with_license,
  COUNT(*) - COUNT(license_id) as orphaned_clusters
FROM local_cluster_usage
WHERE user_id IN (
  SELECT id FROM user_profiles WHERE email = 'josh@thelyceum.io'
);
