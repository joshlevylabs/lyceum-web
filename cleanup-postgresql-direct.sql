-- Direct PostgreSQL Cleanup for CentCom Database
-- Connection: postgresql://localhost:5432/centcom_dev
-- User: joshual
-- Password: postgres

-- ==================================================
-- STEP 1: View all cluster registrations
-- ==================================================
SELECT
  cluster_key,
  machine_fingerprint,
  cluster_name,
  registered_at
FROM cluster_registrations
ORDER BY registered_at DESC;

-- ==================================================
-- STEP 2: Identify corrupted entries
-- ==================================================
SELECT
  cluster_key,
  machine_fingerprint,
  CASE
    WHEN machine_fingerprint LIKE '[object%' THEN '❌ CORRUPTED'
    WHEN LENGTH(machine_fingerprint) < 8 THEN '❌ TOO SHORT'
    ELSE '✅ VALID'
  END as status
FROM cluster_registrations;

-- ==================================================
-- STEP 3: Delete LOCAL-0002 (UNCOMMENT TO EXECUTE)
-- ==================================================

-- DELETE FROM cluster_registrations
-- WHERE cluster_key = 'LOCAL-0002';

-- ==================================================
-- STEP 4: Verify only LOCAL-0011 remains
-- ==================================================

-- SELECT * FROM cluster_registrations;
-- Expected: Only LOCAL-0011 with valid fingerprint

-- ==================================================
-- INSTRUCTIONS
-- ==================================================

-- To run this script:
-- 1. Install psql or pgAdmin
-- 2. Connect to: localhost:5432/centcom_dev
-- 3. User: joshual, Password: postgres
-- 4. Run STEP 1 and STEP 2 to see the data
-- 5. Uncomment and run STEP 3 to delete
-- 6. Run STEP 4 to verify

-- Command line method:
-- psql -U joshual -d centcom_dev -h localhost -p 5432 -f cleanup-postgresql-direct.sql
