-- CentCom Local Database Cleanup
-- This script removes corrupted cluster records from CentCom's local PostgreSQL database
-- Database: postgresql://localhost:5432/centcom_dev

-- ============================================
-- STEP 1: IDENTIFY the problem clusters
-- ============================================

-- Show all registered clusters in CentCom
SELECT
  cluster_key,
  cluster_id,
  user_id,
  machine_fingerprint,
  cluster_name,
  registered_at,
  last_sync_at
FROM cluster_registrations
ORDER BY registered_at DESC;

-- Check for corrupted fingerprints
SELECT
  cluster_key,
  machine_fingerprint,
  CASE
    WHEN machine_fingerprint LIKE '[object%' THEN '❌ CORRUPTED'
    WHEN machine_fingerprint IS NULL THEN '❌ NULL'
    WHEN LENGTH(machine_fingerprint) < 8 THEN '❌ TOO SHORT'
    ELSE '✅ VALID'
  END as fingerprint_status
FROM cluster_registrations;

-- ============================================
-- STEP 2: DELETE corrupted cluster from CentCom
-- ============================================

-- Delete LOCAL-0002 (corrupted cluster)
-- UNCOMMENT THE FOLLOWING LINE TO EXECUTE:
-- DELETE FROM cluster_registrations
-- WHERE cluster_key = 'LOCAL-0002';

-- Alternative: Delete by corrupted fingerprint
-- UNCOMMENT THE FOLLOWING LINE TO EXECUTE:
-- DELETE FROM cluster_registrations
-- WHERE machine_fingerprint LIKE '[object%'
--    OR machine_fingerprint IS NULL
--    OR LENGTH(machine_fingerprint) < 8;

-- ============================================
-- STEP 3: VERIFY cleanup
-- ============================================

-- Show remaining clusters (should only show LOCAL-0011)
SELECT
  cluster_key,
  cluster_id,
  machine_fingerprint,
  cluster_name,
  registered_at
FROM cluster_registrations
ORDER BY registered_at DESC;

-- Count remaining clusters
SELECT COUNT(*) as cluster_count FROM cluster_registrations;

-- ============================================
-- INSTRUCTIONS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ HOW TO RUN THIS SCRIPT:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Open pgAdmin or connect to CentCom PostgreSQL:';
  RAISE NOTICE '   psql -U joshual -d centcom_dev -h 127.0.0.1 -p 5432';
  RAISE NOTICE '';
  RAISE NOTICE '2. Run STEP 1 to see all clusters';
  RAISE NOTICE '';
  RAISE NOTICE '3. Uncomment the DELETE in STEP 2 and run it';
  RAISE NOTICE '';
  RAISE NOTICE '4. Run STEP 3 to verify only LOCAL-0011 remains';
  RAISE NOTICE '';
  RAISE NOTICE '5. Restart CentCom app - should NOT recreate LOCAL-0002';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '⚠️  IMPORTANT: You need to clean up BOTH databases:';
  RAISE NOTICE '   1. CentCom local PostgreSQL (this script)';
  RAISE NOTICE '   2. Lyceum Supabase (already done via Table Editor)';
  RAISE NOTICE '====================================================================';
END $$;
