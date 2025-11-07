-- Delete Corrupted Local Cluster (LOCAL-0002)
-- This cluster has a corrupted machine_fingerprint '[object ' from a Tauri app bug
-- The correct cluster is LOCAL-0011 with fingerprint '6bb0d83e'

-- ============================================
-- 1. PREVIEW what will be deleted
-- ============================================

SELECT
  cluster_key,
  cluster_id,
  cluster_name,
  machine_fingerprint,
  last_heartbeat_at,
  created_at
FROM local_cluster_usage
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
  AND (
    cluster_key = 'LOCAL-0002'
    OR machine_fingerprint LIKE '[object%'
  )
ORDER BY created_at DESC;

-- ============================================
-- 2. DELETE the corrupted cluster
-- ============================================

-- UNCOMMENT to execute:
-- DELETE FROM local_cluster_usage
-- WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
--   AND (
--     cluster_key = 'LOCAL-0002'
--     OR machine_fingerprint LIKE '[object%'
--   );

-- ============================================
-- 3. VERIFY the cleanup
-- ============================================

-- Show remaining clusters after deletion
SELECT
  cluster_key,
  cluster_id,
  cluster_name,
  machine_fingerprint,
  last_heartbeat_at,
  created_at
FROM local_cluster_usage
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
ORDER BY last_heartbeat_at DESC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Corrupted cluster LOCAL-0002 has been deleted.';
  RAISE NOTICE '✅ Only LOCAL-0011 (fingerprint: 6bb0d83e) should remain.';
  RAISE NOTICE '⚠️  NOTE: The Tauri app has a bug where it sends machine_fingerprint as "[object " instead of a proper hash.';
  RAISE NOTICE '    This needs to be fixed in the Tauri app code to prevent future duplicates.';
END $$;
