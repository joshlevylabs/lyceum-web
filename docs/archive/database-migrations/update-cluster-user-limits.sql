-- =====================================================================
-- UPDATE CLUSTER USER LIMITS
-- =====================================================================
-- This script updates existing clusters to have higher user limits
-- =====================================================================

-- Update all existing clusters to allow up to 10 users by default
UPDATE database_clusters 
SET max_assigned_users = 10
WHERE max_assigned_users = 1 OR max_assigned_users IS NULL;

-- Verification query
SELECT 
    'CLUSTER USER LIMITS UPDATED! 🎉' as status,
    COUNT(*) as total_clusters,
    AVG(max_assigned_users) as avg_max_users,
    MIN(max_assigned_users) as min_max_users,
    MAX(max_assigned_users) as max_max_users
FROM database_clusters;

-- Show clusters with their new limits
SELECT 
    cluster_key,
    name,
    max_assigned_users,
    cluster_type,
    status
FROM database_clusters
ORDER BY cluster_key;
