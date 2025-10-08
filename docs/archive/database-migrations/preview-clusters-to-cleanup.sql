-- =============================================================================
-- PREVIEW CLUSTERS TO BE CLEANED UP
-- =============================================================================
-- This script shows what clusters would be deleted by the cleanup script
-- RUN THIS FIRST to verify you want to delete these clusters

-- Show clusters that would be deleted
SELECT 
    id,
    name, 
    description,
    cluster_type,
    status,
    region,
    created_by,
    created_at,
    '🗑️ WOULD BE DELETED' as action
FROM database_clusters 
WHERE id = 'c0000000-0000-0000-0000-000000000001'
   OR name = 'Production Primary'
   OR name = 'Development Primary'
   OR name = 'Sample Cluster'
   OR name ILIKE 'Sample %'
   OR name ILIKE 'Test Cluster%'
   OR name ILIKE 'Mock %'
   OR name ILIKE 'Demo %'
   OR description ILIKE '%This is a sample%'
   OR description ILIKE '%Main production database cluster%'
   OR description ILIKE '%Mock %'
   OR description ILIKE '%Demo %'
ORDER BY created_at DESC;

-- Show clusters that would be KEPT
SELECT 
    id,
    name, 
    description,
    cluster_type,
    status,
    region,
    created_by,
    created_at,
    '✅ WOULD BE KEPT' as action
FROM database_clusters 
WHERE NOT (
    id = 'c0000000-0000-0000-0000-000000000001'
    OR name = 'Production Primary'
    OR name = 'Development Primary'
    OR name = 'Sample Cluster'
    OR name ILIKE 'Sample %'
    OR name ILIKE 'Test Cluster%'
    OR name ILIKE 'Mock %'
    OR name ILIKE 'Demo %'
    OR description ILIKE '%This is a sample%'
    OR description ILIKE '%Main production database cluster%'
    OR description ILIKE '%Mock %'
    OR description ILIKE '%Demo %'
)
ORDER BY created_at DESC;

-- Summary counts
SELECT 
    'TOTAL CLUSTERS' as category,
    COUNT(*) as count
FROM database_clusters
UNION ALL
SELECT 
    'CLUSTERS TO DELETE' as category,
    COUNT(*) as count
FROM database_clusters 
WHERE id = 'c0000000-0000-0000-0000-000000000001'
   OR name = 'Production Primary'
   OR name = 'Development Primary'
   OR name = 'Sample Cluster'
   OR name ILIKE 'Sample %'
   OR name ILIKE 'Test Cluster%'
   OR name ILIKE 'Mock %'
   OR name ILIKE 'Demo %'
   OR description ILIKE '%This is a sample%'
   OR description ILIKE '%Main production database cluster%'
   OR description ILIKE '%Mock %'
   OR description ILIKE '%Demo %'
UNION ALL
SELECT 
    'CLUSTERS TO KEEP' as category,
    COUNT(*) as count
FROM database_clusters 
WHERE NOT (
    id = 'c0000000-0000-0000-0000-000000000001'
    OR name = 'Production Primary'
    OR name = 'Development Primary'
    OR name = 'Sample Cluster'
    OR name ILIKE 'Sample %'
    OR name ILIKE 'Test Cluster%'
    OR name ILIKE 'Mock %'
    OR name ILIKE 'Demo %'
    OR description ILIKE '%This is a sample%'
    OR description ILIKE '%Main production database cluster%'
    OR description ILIKE '%Mock %'
    OR description ILIKE '%Demo %'
);
