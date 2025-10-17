-- Fix orphaned cluster and verify all license links
-- Run this in Supabase SQL Editor

-- Step 1: Show detailed info about each cluster's license situation
SELECT
  lcu.cluster_key,
  lcu.machine_fingerprint,
  lcu.license_id,
  lk.key_code,
  lk.license_type,
  lk.local_cluster_limits,
  CASE
    WHEN lcu.license_id IS NULL THEN '❌ NO LICENSE - NEEDS FIX'
    WHEN lk.id IS NULL THEN '❌ INVALID LICENSE ID - NEEDS FIX'
    WHEN lk.local_cluster_limits IS NULL THEN '⚠️ License exists but no limits'
    ELSE '✅ All good'
  END as status
FROM local_cluster_usage lcu
LEFT JOIN license_keys lk ON lcu.license_id = lk.id
WHERE lcu.user_id IN (
  SELECT id FROM user_profiles WHERE email = 'josh@thelyceum.io'
)
ORDER BY lcu.last_heartbeat_at DESC;

-- Step 2: Get the first available license for josh to assign to orphaned clusters
SELECT
  lk.id,
  lk.key_code,
  lk.license_type,
  lk.local_cluster_limits
FROM license_keys lk
WHERE EXISTS (
  SELECT 1
  FROM local_cluster_usage lcu
  WHERE lcu.license_id = lk.id
  AND lcu.user_id IN (SELECT id FROM user_profiles WHERE email = 'josh@thelyceum.io')
)
LIMIT 1;

-- Step 3: Assign the first available license to any orphaned clusters
DO $$
DECLARE
  target_license_id UUID;
  josh_user_id UUID;
  affected_rows INTEGER;
BEGIN
  -- Get josh's user ID
  SELECT id INTO josh_user_id
  FROM user_profiles
  WHERE email = 'josh@thelyceum.io';

  -- Get the first license that's already used by josh's clusters
  SELECT lk.id INTO target_license_id
  FROM license_keys lk
  WHERE EXISTS (
    SELECT 1
    FROM local_cluster_usage lcu
    WHERE lcu.license_id = lk.id
    AND lcu.user_id = josh_user_id
  )
  LIMIT 1;

  IF target_license_id IS NOT NULL THEN
    -- Update orphaned clusters
    UPDATE local_cluster_usage
    SET license_id = target_license_id
    WHERE user_id = josh_user_id
      AND license_id IS NULL;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE '✅ Updated % orphaned cluster(s) with license ID: %', affected_rows, target_license_id;
  ELSE
    RAISE NOTICE '⚠️ No existing license found to assign to orphaned clusters';
  END IF;
END $$;

-- Step 4: Re-check all clusters after the fix
SELECT
  lcu.cluster_key,
  lcu.machine_fingerprint,
  lcu.license_id,
  lk.key_code,
  lk.license_type,
  jsonb_pretty(lk.local_cluster_limits) as limits,
  CASE
    WHEN lcu.license_id IS NULL THEN '❌ Still orphaned'
    WHEN lk.id IS NULL THEN '❌ Invalid license'
    WHEN lk.local_cluster_limits IS NULL THEN '⚠️ No limits'
    ELSE '✅ Fixed'
  END as status
FROM local_cluster_usage lcu
LEFT JOIN license_keys lk ON lcu.license_id = lk.id
WHERE lcu.user_id IN (
  SELECT id FROM user_profiles WHERE email = 'josh@thelyceum.io'
)
ORDER BY lcu.last_heartbeat_at DESC;

-- Step 5: Final summary
SELECT
  COUNT(*) as total_clusters,
  COUNT(lcu.license_id) as clusters_with_license,
  COUNT(*) - COUNT(lcu.license_id) as still_orphaned,
  COUNT(CASE WHEN lk.local_cluster_limits IS NOT NULL THEN 1 END) as clusters_with_limits
FROM local_cluster_usage lcu
LEFT JOIN license_keys lk ON lcu.license_id = lk.id
WHERE lcu.user_id IN (
  SELECT id FROM user_profiles WHERE email = 'josh@thelyceum.io'
);

SELECT '✅ Orphaned clusters have been fixed!' AS status;
