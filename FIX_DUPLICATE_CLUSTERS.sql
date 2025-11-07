-- Fix Duplicate Local Clusters Issue
-- Problem: Tauri app sent corrupted machine_fingerprint causing duplicate cluster creation
-- This script cleans up corrupted clusters and prevents future issues

-- ============================================
-- STEP 1: IDENTIFY the problem
-- ============================================

-- Show all local clusters for this user
SELECT
  cluster_key,
  cluster_id,
  cluster_name,
  machine_fingerprint,
  CASE
    WHEN machine_fingerprint LIKE '[object%' THEN '❌ CORRUPTED'
    WHEN machine_fingerprint IS NULL THEN '❌ NULL'
    WHEN LENGTH(machine_fingerprint) < 8 THEN '❌ TOO SHORT'
    ELSE '✅ VALID'
  END as fingerprint_status,
  last_heartbeat_at,
  AGE(NOW(), last_heartbeat_at) as age,
  created_at
FROM local_cluster_usage
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
ORDER BY last_heartbeat_at DESC;

-- ============================================
-- STEP 2: DELETE corrupted clusters
-- ============================================

-- Delete clusters with corrupted machine_fingerprint
-- UNCOMMENT THE FOLLOWING LINE TO EXECUTE:
-- DELETE FROM local_cluster_usage
-- WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
--   AND (
--     machine_fingerprint LIKE '[object%'
--     OR machine_fingerprint IS NULL
--     OR LENGTH(machine_fingerprint) < 8
--   );

-- Alternative: Delete specific cluster key if you know it
-- UNCOMMENT THE FOLLOWING LINE TO EXECUTE:
-- DELETE FROM local_cluster_usage
-- WHERE cluster_key = 'LOCAL-0002'
--   AND user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- ============================================
-- STEP 3: VERIFY the cleanup
-- ============================================

-- Show remaining clusters (should only show LOCAL-0011)
SELECT
  cluster_key,
  cluster_id,
  cluster_name,
  machine_fingerprint,
  last_heartbeat_at,
  storage_used_gb,
  queries_this_month,
  created_at
FROM local_cluster_usage
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
ORDER BY last_heartbeat_at DESC;

-- Count remaining clusters
SELECT COUNT(*) as cluster_count FROM local_cluster_usage
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- ============================================
-- STEP 4: Add constraint to prevent future corruption (OPTIONAL)
-- ============================================

-- This adds a check constraint to ensure machine_fingerprint is valid
-- UNCOMMENT THE FOLLOWING TO EXECUTE:
-- ALTER TABLE local_cluster_usage
-- ADD CONSTRAINT valid_machine_fingerprint
-- CHECK (
--   machine_fingerprint IS NOT NULL
--   AND LENGTH(machine_fingerprint) >= 8
--   AND machine_fingerprint NOT LIKE '[object%'
--   AND machine_fingerprint NOT LIKE '%undefined%'
-- );

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ INSTRUCTIONS:';
  RAISE NOTICE '1. Review the results of STEP 1 to see corrupted clusters';
  RAISE NOTICE '2. Uncomment the DELETE statement in STEP 2 to remove corrupted clusters';
  RAISE NOTICE '3. Run STEP 3 to verify only valid clusters remain';
  RAISE NOTICE '4. (Optional) Add the constraint in STEP 4 to prevent future corruption';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '⚠️  TAURI APP BUG: The native app is sending machine_fingerprint as';
  RAISE NOTICE '    "[object " instead of a proper hash string. This needs to be fixed';
  RAISE NOTICE '    in the Tauri app codebase. See TAURI_BUG_FIX.md for details.';
  RAISE NOTICE '====================================================================';
END $$;
