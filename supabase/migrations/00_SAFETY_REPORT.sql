-- =============================================
-- SAFETY REPORT: One-Stop Migration Check
-- =============================================
-- Run this single query to get a clear report
-- on which migrations are SAFE to run

WITH
-- Check cluster_projects columns
cluster_projects_check AS (
    SELECT
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cluster_projects' AND column_name = 'metadata') as has_metadata,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cluster_projects' AND column_name = 'sync_status') as has_sync_status,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cluster_projects' AND column_name = 'last_synced_at') as has_last_synced_at,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cluster_projects' AND column_name = 'sync_error') as has_sync_error,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cluster_projects' AND column_name = 'project_type') as has_project_type
),
-- Check plugin tables
plugin_tables_check AS (
    SELECT
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plugins') as has_plugins,
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plugin_licenses') as has_plugin_licenses,
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plugin_purchases') as has_plugin_purchases,
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plugin_reviews') as has_plugin_reviews,
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_payment_methods') as has_user_payment_methods
),
-- Check test_data tables
test_data_tables_check AS (
    SELECT
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_data_measurements') as has_test_data_measurements,
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_data_files') as has_test_data_files,
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_data_exports') as has_test_data_exports,
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_data_templates') as has_test_data_templates
),
-- Generate report
safety_report AS (
    SELECT
        '1. Extend cluster_projects' as migration_name,
        '20250104_extend_cluster_projects.sql' as migration_file,
        CASE
            WHEN NOT (cp.has_metadata AND cp.has_sync_status AND cp.has_last_synced_at AND cp.has_sync_error AND cp.has_project_type)
            THEN '✅ SAFE TO RUN - Will add missing columns'
            ELSE '⏭️  SKIP - All columns already exist'
        END as safety_status,
        'Adds: ' ||
        CASE WHEN NOT cp.has_metadata THEN 'metadata, ' ELSE '' END ||
        CASE WHEN NOT cp.has_sync_status THEN 'sync_status, ' ELSE '' END ||
        CASE WHEN NOT cp.has_last_synced_at THEN 'last_synced_at, ' ELSE '' END ||
        CASE WHEN NOT cp.has_sync_error THEN 'sync_error, ' ELSE '' END ||
        CASE WHEN NOT cp.has_project_type THEN 'project_type' ELSE 'None needed' END as details,
        1 as sort_order
    FROM cluster_projects_check cp

    UNION ALL

    SELECT
        '2. Create Plugins Store System',
        '20250104_plugins_store_system.sql',
        CASE
            WHEN NOT (pt.has_plugins OR pt.has_plugin_licenses OR pt.has_plugin_purchases OR pt.has_plugin_reviews OR pt.has_user_payment_methods)
            THEN '✅ SAFE TO RUN - No conflicts found'
            ELSE '❌ UNSAFE - Some plugin tables already exist!'
        END,
        'Creates 5 new tables. Current status: ' ||
        CASE WHEN pt.has_plugins THEN 'plugins EXISTS, ' ELSE '' END ||
        CASE WHEN pt.has_plugin_licenses THEN 'plugin_licenses EXISTS, ' ELSE '' END ||
        CASE WHEN pt.has_plugin_purchases THEN 'plugin_purchases EXISTS, ' ELSE '' END ||
        CASE WHEN pt.has_plugin_reviews THEN 'plugin_reviews EXISTS, ' ELSE '' END ||
        CASE WHEN pt.has_user_payment_methods THEN 'user_payment_methods EXISTS' ELSE 'All new' END,
        2
    FROM plugin_tables_check pt

    UNION ALL

    SELECT
        '3. Create Test Data Integration',
        '20250104_test_data_integration.sql',
        CASE
            WHEN NOT (td.has_test_data_measurements OR td.has_test_data_files OR td.has_test_data_exports OR td.has_test_data_templates)
            THEN '✅ SAFE TO RUN - No conflicts found'
            ELSE '❌ UNSAFE - Some test_data tables already exist!'
        END,
        'Creates 4 new tables. Current status: ' ||
        CASE WHEN td.has_test_data_measurements THEN 'test_data_measurements EXISTS, ' ELSE '' END ||
        CASE WHEN td.has_test_data_files THEN 'test_data_files EXISTS, ' ELSE '' END ||
        CASE WHEN td.has_test_data_exports THEN 'test_data_exports EXISTS, ' ELSE '' END ||
        CASE WHEN td.has_test_data_templates THEN 'test_data_templates EXISTS' ELSE 'All new' END,
        3
    FROM test_data_tables_check td
)
SELECT
    migration_name as "Migration",
    migration_file as "File",
    safety_status as "Safety Status",
    details as "Details"
FROM safety_report
ORDER BY sort_order;

-- =============================================
-- Additional Info: cluster_projects current structure
-- =============================================
SELECT
    '--- CURRENT CLUSTER_PROJECTS STRUCTURE ---' as info;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'cluster_projects'
ORDER BY ordinal_position;

-- =============================================
-- Summary
-- =============================================
SELECT
    '--- SUMMARY ---' as info;

SELECT
    COUNT(*) FILTER (WHERE tablename LIKE '%cluster%') as cluster_related_tables,
    COUNT(*) FILTER (WHERE tablename LIKE '%plugin%') as plugin_related_tables,
    COUNT(*) FILTER (WHERE tablename LIKE '%test_data%') as test_data_related_tables,
    COUNT(*) as total_public_tables
FROM pg_tables
WHERE schemaname = 'public';
