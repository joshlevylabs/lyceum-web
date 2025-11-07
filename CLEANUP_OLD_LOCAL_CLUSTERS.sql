-- Cleanup Old Local Cluster Test Data
-- This script removes old test clusters from local_cluster_usage table
-- Run this to clean up duplicate clusters showing in the UI

-- ============================================
-- 1. PREVIEW what will be deleted
-- ============================================

-- Show all local clusters with their age
SELECT
  cluster_key,
  cluster_id,
  cluster_name,
  last_heartbeat_at,
  AGE(NOW(), last_heartbeat_at) as age,
  CASE
    WHEN cluster_key IS NULL THEN 'No cluster_key (will be deleted)'
    WHEN last_heartbeat_at < NOW() - INTERVAL '30 days' THEN 'Old (will be deleted)'
    ELSE 'Recent (will be kept)'
  END as status
FROM local_cluster_usage
ORDER BY last_heartbeat_at DESC;

-- Count clusters by status
SELECT
  CASE
    WHEN cluster_key IS NULL THEN 'No cluster_key'
    WHEN last_heartbeat_at < NOW() - INTERVAL '30 days' THEN 'Old (>30 days)'
    ELSE 'Recent (<30 days)'
  END as status,
  COUNT(*) as count
FROM local_cluster_usage
GROUP BY
  CASE
    WHEN cluster_key IS NULL THEN 'No cluster_key'
    WHEN last_heartbeat_at < NOW() - INTERVAL '30 days' THEN 'Old (>30 days)'
    ELSE 'Recent (<30 days)'
  END;

-- ============================================
-- 2. DELETE old test clusters (UNCOMMENT TO EXECUTE)
-- ============================================

-- Option 1: Delete clusters with NULL cluster_key (incomplete/bad data)
-- UNCOMMENT the next line to execute:
-- DELETE FROM local_cluster_usage WHERE cluster_key IS NULL;

-- Option 2: Delete clusters older than 30 days with no recent heartbeat
-- UNCOMMENT the next line to execute:
-- DELETE FROM local_cluster_usage WHERE last_heartbeat_at < NOW() - INTERVAL '30 days';

-- Option 3: Delete both (null keys AND old clusters)
-- UNCOMMENT the next line to execute:
-- DELETE FROM local_cluster_usage
-- WHERE cluster_key IS NULL
--    OR last_heartbeat_at < NOW() - INTERVAL '30 days';

-- Option 4: Delete specific old test clusters by cluster_key
-- UNCOMMENT the next lines to execute:
-- DELETE FROM local_cluster_usage
-- WHERE cluster_key IN ('CLSTR-3', 'CLSTR-4', 'CLSTR-5', 'CLSTR-6', 'CLSTR-7');

-- Option 5: Keep only the most recent cluster (LOCAL-0011) and delete everything else
-- UNCOMMENT the next line to execute:
-- DELETE FROM local_cluster_usage
-- WHERE cluster_key != 'LOCAL-0011' OR cluster_key IS NULL;

-- ============================================
-- 3. VERIFY cleanup (run after deletion)
-- ============================================

-- Show remaining clusters
SELECT
  cluster_key,
  cluster_id,
  cluster_name,
  machine_fingerprint,
  last_heartbeat_at,
  AGE(NOW(), last_heartbeat_at) as age
FROM local_cluster_usage
ORDER BY last_heartbeat_at DESC;

-- Count remaining clusters
SELECT COUNT(*) as remaining_clusters FROM local_cluster_usage;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Review the preview above, then uncomment the appropriate DELETE statement to clean up old test clusters.';
  RAISE NOTICE 'Recommendation: Use Option 3 to delete both null keys and old clusters (>30 days)';
END $$;
