-- =============================================
-- DIAGNOSTIC: Check Existing Database Structure
-- =============================================
-- Run this script first to see what you have
-- This will help determine which migrations are safe to run

-- =============================================
-- 1. Check all existing tables in public schema
-- =============================================
SELECT
    tablename as table_name,
    schemaname as schema_name
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- =============================================
-- 2. Check cluster_projects table structure
-- =============================================
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'cluster_projects'
ORDER BY ordinal_position;

-- =============================================
-- 3. Check if plugin-related tables exist
-- =============================================
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'plugins'
) as plugins_exists;

SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'plugin_licenses'
) as plugin_licenses_exists;

SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'plugin_purchases'
) as plugin_purchases_exists;

SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'plugin_reviews'
) as plugin_reviews_exists;

SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_payment_methods'
) as user_payment_methods_exists;

-- =============================================
-- 4. Check if test_data-related tables exist
-- =============================================
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'test_data_measurements'
) as test_data_measurements_exists;

SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'test_data_files'
) as test_data_files_exists;

SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'test_data_exports'
) as test_data_exports_exists;

SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'test_data_templates'
) as test_data_templates_exists;

-- =============================================
-- 5. Check existing indexes on cluster_projects
-- =============================================
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'cluster_projects'
ORDER BY indexname;

-- =============================================
-- 6. Check if update_updated_at_column function exists
-- =============================================
SELECT EXISTS (
    SELECT FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'update_updated_at_column'
) as update_function_exists;

-- =============================================
-- 7. Summary of cluster-related tables
-- =============================================
SELECT
    tablename,
    CASE
        WHEN tablename LIKE '%cluster%' THEN 'Cluster-related'
        WHEN tablename LIKE '%plugin%' THEN 'Plugin-related'
        WHEN tablename LIKE '%test_data%' THEN 'Test Data-related'
        ELSE 'Other'
    END as category
FROM pg_tables
WHERE schemaname = 'public'
AND (
    tablename LIKE '%cluster%'
    OR tablename LIKE '%plugin%'
    OR tablename LIKE '%test_data%'
)
ORDER BY category, tablename;
