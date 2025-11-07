-- =============================================
-- SINGLE QUERY SAFETY CHECK
-- =============================================
-- This gives you everything in ONE output

SELECT
    '1. EXTEND CLUSTER_PROJECTS' as check_item,
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cluster_projects' AND column_name = 'metadata')
        THEN '✅ SAFE - metadata column missing, will add'
        ELSE '⏭️ SKIP - metadata already exists'
    END as status

UNION ALL SELECT '   └─ sync_status',
    CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cluster_projects' AND column_name = 'sync_status')
    THEN '✅ SAFE - will add' ELSE '⏭️ SKIP - exists' END

UNION ALL SELECT '   └─ last_synced_at',
    CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cluster_projects' AND column_name = 'last_synced_at')
    THEN '✅ SAFE - will add' ELSE '⏭️ SKIP - exists' END

UNION ALL SELECT '   └─ sync_error',
    CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cluster_projects' AND column_name = 'sync_error')
    THEN '✅ SAFE - will add' ELSE '⏭️ SKIP - exists' END

UNION ALL SELECT '   └─ project_type',
    CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cluster_projects' AND column_name = 'project_type')
    THEN '✅ SAFE - will add' ELSE '⏭️ SKIP - exists' END

UNION ALL SELECT '', ''

UNION ALL SELECT '2. PLUGINS STORE SYSTEM',
    CASE
        WHEN NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plugins')
        AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plugin_licenses')
        THEN '✅ SAFE - No plugin tables exist'
        ELSE '❌ UNSAFE - Some plugin tables exist'
    END

UNION ALL SELECT '   └─ plugins table',
    CASE WHEN NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plugins')
    THEN '✅ Will create' ELSE '❌ EXISTS' END

UNION ALL SELECT '   └─ plugin_licenses table',
    CASE WHEN NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plugin_licenses')
    THEN '✅ Will create' ELSE '❌ EXISTS' END

UNION ALL SELECT '   └─ plugin_purchases table',
    CASE WHEN NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plugin_purchases')
    THEN '✅ Will create' ELSE '❌ EXISTS' END

UNION ALL SELECT '   └─ plugin_reviews table',
    CASE WHEN NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plugin_reviews')
    THEN '✅ Will create' ELSE '❌ EXISTS' END

UNION ALL SELECT '   └─ user_payment_methods table',
    CASE WHEN NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_payment_methods')
    THEN '✅ Will create' ELSE '❌ EXISTS' END

UNION ALL SELECT '', ''

UNION ALL SELECT '3. TEST DATA INTEGRATION',
    CASE
        WHEN NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_data_measurements')
        AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_data_files')
        THEN '✅ SAFE - No test_data tables exist'
        ELSE '❌ UNSAFE - Some test_data tables exist'
    END

UNION ALL SELECT '   └─ test_data_measurements table',
    CASE WHEN NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_data_measurements')
    THEN '✅ Will create' ELSE '❌ EXISTS' END

UNION ALL SELECT '   └─ test_data_files table',
    CASE WHEN NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_data_files')
    THEN '✅ Will create' ELSE '❌ EXISTS' END

UNION ALL SELECT '   └─ test_data_exports table',
    CASE WHEN NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_data_exports')
    THEN '✅ Will create' ELSE '❌ EXISTS' END

UNION ALL SELECT '   └─ test_data_templates table',
    CASE WHEN NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_data_templates')
    THEN '✅ Will create' ELSE '❌ EXISTS' END

UNION ALL SELECT '', ''

UNION ALL SELECT '📊 SUMMARY',
    CONCAT(
        (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public')::text,
        ' total tables | ',
        (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%cluster%')::text,
        ' cluster | ',
        (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%plugin%')::text,
        ' plugin | ',
        (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%test_data%')::text,
        ' test_data'
    )

ORDER BY check_item;
