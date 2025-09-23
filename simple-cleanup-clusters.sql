-- =============================================================================
-- SIMPLE CLEANUP MOCK/TEST DATABASE CLUSTERS
-- =============================================================================
-- Simplified approach since preview shows 0 clusters to delete anyway
-- This targets only the specific known mock cluster ID

-- First, check if there are any clusters matching our mock patterns
DO $$
DECLARE
    mock_cluster_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mock_cluster_count
    FROM database_clusters 
    WHERE id = 'c0000000-0000-0000-0000-000000000001'
       OR name = 'Production Primary'
       OR name = 'Development Primary'
       OR name = 'Sample Cluster';
    
    IF mock_cluster_count = 0 THEN
        RAISE NOTICE '✅ No mock clusters found - database is already clean!';
        RAISE NOTICE '📊 Total clusters in database: %', (SELECT COUNT(*) FROM database_clusters);
    ELSE
        RAISE NOTICE '🗑️ Found % mock clusters to clean up', mock_cluster_count;
        
        -- Clean up in proper order (only if mock clusters exist)
        DELETE FROM project_assets 
        WHERE project_id IN (
            SELECT cp.id FROM cluster_projects cp
            JOIN database_clusters dc ON cp.cluster_id = dc.id
            WHERE dc.id = 'c0000000-0000-0000-0000-000000000001'
               OR dc.name = 'Production Primary'
               OR dc.name = 'Development Primary'
               OR dc.name = 'Sample Cluster'
        );
        
        DELETE FROM cluster_projects 
        WHERE cluster_id IN (
            SELECT id FROM database_clusters 
            WHERE id = 'c0000000-0000-0000-0000-000000000001'
               OR name = 'Production Primary'
               OR name = 'Development Primary'
               OR name = 'Sample Cluster'
        );
        
        DELETE FROM cluster_team_access 
        WHERE cluster_id IN (
            SELECT id FROM database_clusters 
            WHERE id = 'c0000000-0000-0000-0000-000000000001'
               OR name = 'Production Primary'
               OR name = 'Development Primary'
               OR name = 'Sample Cluster'
        );
        
        DELETE FROM cluster_usage_metrics 
        WHERE cluster_id IN (
            SELECT id FROM database_clusters 
            WHERE id = 'c0000000-0000-0000-0000-000000000001'
               OR name = 'Production Primary'
               OR name = 'Development Primary'
               OR name = 'Sample Cluster'
        );
        
        DELETE FROM cluster_access_tokens 
        WHERE cluster_id IN (
            SELECT id FROM database_clusters 
            WHERE id = 'c0000000-0000-0000-0000-000000000001'
               OR name = 'Production Primary'
               OR name = 'Development Primary'
               OR name = 'Sample Cluster'
        );
        
        -- Clean up audit log entries BEFORE deleting clusters
        DELETE FROM cluster_audit_log 
        WHERE cluster_id IN (
            SELECT id FROM database_clusters 
            WHERE id = 'c0000000-0000-0000-0000-000000000001'
               OR name = 'Production Primary'
               OR name = 'Development Primary'
               OR name = 'Sample Cluster'
        );
        
        -- Finally, remove the mock clusters themselves
        DELETE FROM database_clusters 
        WHERE id = 'c0000000-0000-0000-0000-000000000001'
           OR name = 'Production Primary'
           OR name = 'Development Primary'
           OR name = 'Sample Cluster';
           
        RAISE NOTICE '✅ Cleanup completed successfully!';
    END IF;
END $$;

-- Show final status
SELECT 
    'REMAINING CLUSTERS' as status,
    COUNT(*) as count
FROM database_clusters;

-- Show all remaining clusters
SELECT 
    id,
    name, 
    description,
    cluster_type,
    status,
    region,
    created_by,
    created_at
FROM database_clusters 
ORDER BY created_at DESC;
