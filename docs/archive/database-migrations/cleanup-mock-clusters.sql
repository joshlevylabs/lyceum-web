-- =============================================================================
-- CLEANUP MOCK/TEST DATABASE CLUSTERS
-- =============================================================================
-- This script removes any mock or test clusters that were created during development
-- Only REAL clusters created by users through the wizard should remain

-- First, identify clusters to be removed and handle foreign key constraints
DO $$
DECLARE
    cluster_to_delete RECORD;
    fk_constraint_exists BOOLEAN;
    constraint_name TEXT;
BEGIN
    -- Check if the foreign key constraint exists on cluster_audit_log
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'cluster_audit_log' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'cluster_id'
        AND rc.unique_constraint_name IN (
            SELECT constraint_name FROM information_schema.table_constraints 
            WHERE table_name = 'database_clusters' AND constraint_type = 'PRIMARY KEY'
        )
    ) INTO fk_constraint_exists;
    
    -- Get the constraint name if it exists
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_name = 'cluster_audit_log' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'cluster_id'
    AND rc.unique_constraint_name IN (
        SELECT constraint_name FROM information_schema.table_constraints 
        WHERE table_name = 'database_clusters' AND constraint_type = 'PRIMARY KEY'
    )
    LIMIT 1;
    
    -- Temporarily drop the foreign key constraint to avoid circular dependency
    IF fk_constraint_exists THEN
        EXECUTE 'ALTER TABLE cluster_audit_log DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Temporarily dropped FK constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No FK constraint found on cluster_audit_log.cluster_id';
    END IF;
    
    -- Log what we're about to delete (only specific mock/sample clusters)
    FOR cluster_to_delete IN 
        SELECT id, name, description, cluster_type, status, created_by, created_at
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
    LOOP
        RAISE NOTICE 'Removing mock cluster: % (ID: %)', cluster_to_delete.name, cluster_to_delete.id;
    END LOOP;
END $$;

-- Clean up associated data first (in proper order to avoid FK violations)
DELETE FROM project_assets 
WHERE project_id IN (
    SELECT cp.id FROM cluster_projects cp
    JOIN database_clusters dc ON cp.cluster_id = dc.id
    WHERE dc.id = 'c0000000-0000-0000-0000-000000000001'
       OR dc.name = 'Production Primary'
       OR dc.name = 'Development Primary'
       OR dc.name = 'Sample Cluster'
       OR dc.name ILIKE 'Sample %'
       OR dc.name ILIKE 'Test Cluster%'
       OR dc.name ILIKE 'Mock %'
       OR dc.name ILIKE 'Demo %'
       OR dc.description ILIKE '%This is a sample%'
       OR dc.description ILIKE '%Main production database cluster%'
       OR dc.description ILIKE '%Mock %'
       OR dc.description ILIKE '%Demo %'
);

DELETE FROM cluster_projects 
WHERE cluster_id IN (
    SELECT id FROM database_clusters 
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
);

DELETE FROM cluster_team_access 
WHERE cluster_id IN (
    SELECT id FROM database_clusters 
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
);

DELETE FROM cluster_usage_metrics 
WHERE cluster_id IN (
    SELECT id FROM database_clusters 
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
);

DELETE FROM cluster_access_tokens 
WHERE cluster_id IN (
    SELECT id FROM database_clusters 
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
);

-- Clean up audit log entries for clusters we're about to delete
DELETE FROM cluster_audit_log 
WHERE cluster_id IN (
    SELECT id FROM database_clusters 
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
);

-- Finally, remove the mock clusters themselves
DELETE FROM database_clusters 
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
   OR description ILIKE '%Demo %';

-- Re-add the foreign key constraint
DO $$
DECLARE
    fk_constraint_exists BOOLEAN;
BEGIN
    -- Check if the foreign key constraint is missing
    SELECT NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'cluster_audit_log' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'cluster_id'
        AND rc.unique_constraint_name IN (
            SELECT constraint_name FROM information_schema.table_constraints 
            WHERE table_name = 'database_clusters' AND constraint_type = 'PRIMARY KEY'
        )
    ) INTO fk_constraint_exists;
    
    -- Re-add the foreign key constraint if it was dropped
    IF fk_constraint_exists THEN
        ALTER TABLE cluster_audit_log 
        ADD CONSTRAINT cluster_audit_log_cluster_id_fkey 
        FOREIGN KEY (cluster_id) REFERENCES database_clusters(id) ON DELETE CASCADE;
        RAISE NOTICE 'Re-added FK constraint: cluster_audit_log_cluster_id_fkey';
    ELSE
        RAISE NOTICE 'FK constraint already exists on cluster_audit_log.cluster_id';
    END IF;
END $$;

-- Show remaining clusters (should only be real user-created ones)
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
