-- Add local_cluster_limits column and populate it with defaults
-- Run this in Supabase SQL Editor

-- Step 1: Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'license_keys'
    AND column_name = 'local_cluster_limits'
  ) THEN
    ALTER TABLE public.license_keys
    ADD COLUMN local_cluster_limits JSONB DEFAULT NULL;

    RAISE NOTICE '✅ Added local_cluster_limits column';
  ELSE
    RAISE NOTICE '⚠️  local_cluster_limits column already exists';
  END IF;
END $$;

-- Step 2: Check current license_keys for josh's clusters (without the new column initially)
SELECT
  lk.id,
  lk.key_code,
  lk.license_type,
  lk.created_at,
  COUNT(lcu.id) as cluster_count
FROM license_keys lk
LEFT JOIN local_cluster_usage lcu ON lcu.license_id = lk.id
WHERE lcu.user_id IN (
  SELECT id FROM user_profiles WHERE email = 'josh@thelyceum.io'
)
GROUP BY lk.id, lk.key_code, lk.license_type, lk.created_at
ORDER BY lk.created_at DESC;

-- Step 3: Update license limits for licenses that don't have them
-- This sets reasonable defaults based on license type

UPDATE license_keys
SET local_cluster_limits = CASE
  WHEN license_type = 'trial' THEN jsonb_build_object(
    'max_storage_gb', 50,
    'max_monthly_queries', 100000,
    'offline_grace_days', 7
  )
  WHEN license_type = 'basic' THEN jsonb_build_object(
    'max_storage_gb', 100,
    'max_monthly_queries', 500000,
    'offline_grace_days', 14
  )
  WHEN license_type = 'professional' THEN jsonb_build_object(
    'max_storage_gb', 500,
    'max_monthly_queries', 5000000,
    'offline_grace_days', 30
  )
  WHEN license_type = 'enterprise' THEN jsonb_build_object(
    'max_storage_gb', 2000,
    'max_monthly_queries', 50000000,
    'offline_grace_days', 90
  )
  ELSE jsonb_build_object(
    'max_storage_gb', 10,
    'max_monthly_queries', 10000,
    'offline_grace_days', 3
  )
END
WHERE local_cluster_limits IS NULL
  OR local_cluster_limits = '{}'::jsonb
  OR local_cluster_limits = 'null'::jsonb;

-- Step 4: Verify the updates
SELECT
  license_type,
  COUNT(*) as count,
  jsonb_pretty(local_cluster_limits) as limits_example
FROM license_keys
WHERE local_cluster_limits IS NOT NULL
GROUP BY license_type, local_cluster_limits
ORDER BY license_type;

-- Step 5: Show the updated data for josh@thelyceum.io
SELECT
  lcu.cluster_key,
  lcu.machine_fingerprint,
  lcu.clickhouse_version,
  lcu.machine_os,
  lcu.storage_used_gb,
  lcu.queries_this_month,
  lcu.last_heartbeat_at,
  lk.license_type,
  lk.local_cluster_limits->>'max_storage_gb' as max_storage_gb,
  lk.local_cluster_limits->>'max_monthly_queries' as max_monthly_queries,
  lk.local_cluster_limits->>'offline_grace_days' as offline_grace_days
FROM local_cluster_usage lcu
LEFT JOIN license_keys lk ON lcu.license_id = lk.id
WHERE lcu.user_id IN (
  SELECT id FROM user_profiles WHERE email = 'josh@thelyceum.io'
)
ORDER BY lcu.last_heartbeat_at DESC;

-- Step 6: Summary of changes
SELECT
  '✅ License limits have been added and populated!' AS status,
  COUNT(*) as total_licenses_updated,
  COUNT(CASE WHEN local_cluster_limits IS NOT NULL THEN 1 END) as licenses_with_limits
FROM license_keys;
