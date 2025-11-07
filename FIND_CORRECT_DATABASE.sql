-- Find the Correct Database and Table
-- This helps locate where your local_cluster_usage data is stored

-- ============================================
-- 1. Check if table exists in current schema
-- ============================================

-- List all tables in public schema
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%cluster%'
ORDER BY table_name;

-- ============================================
-- 2. Search for the table in all schemas
-- ============================================

-- Find local_cluster_usage in any schema
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = 'local_cluster_usage';

-- ============================================
-- 3. List all tables with 'usage' in the name
-- ============================================

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name LIKE '%usage%'
  AND table_schema NOT IN ('pg_catalog', 'information_schema');

-- ============================================
-- 4. Check your Supabase project URL
-- ============================================

-- Run this to see your current database details
SELECT current_database(), current_schema();

-- ============================================
-- INSTRUCTIONS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🔍 TROUBLESHOOTING:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Check your .env.local file for NEXT_PUBLIC_SUPABASE_URL';
  RAISE NOTICE '   Expected: https://kffiaqsihldgqdwagook.supabase.co';
  RAISE NOTICE '';
  RAISE NOTICE '2. Make sure you are running this SQL in the CORRECT Supabase project';
  RAISE NOTICE '   - Open https://supabase.com/dashboard/projects';
  RAISE NOTICE '   - Select project: kffiaqsihldgqdwagook';
  RAISE NOTICE '   - Go to SQL Editor';
  RAISE NOTICE '';
  RAISE NOTICE '3. If the table exists but with a different name, the queries above';
  RAISE NOTICE '   will show you all cluster-related tables.';
  RAISE NOTICE '====================================================================';
END $$;
