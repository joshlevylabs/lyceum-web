-- =====================================================================
-- DATABASE CLUSTERS - CLUSTER KEY MIGRATION
-- =====================================================================
-- This script adds cluster keys (CLSTR-1, CLSTR-2, etc.) to your existing clusters
-- Run this in your Supabase SQL Editor
-- =====================================================================

-- Step 1: Check current clusters
SELECT 'BEFORE MIGRATION: Current clusters in your database:' as status;
SELECT 
  id, 
  name, 
  cluster_type, 
  status, 
  created_at 
FROM database_clusters 
ORDER BY created_at 
LIMIT 10;

-- Step 2: Add the cluster_key column (safely)
DO $$
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'database_clusters' 
        AND column_name = 'cluster_key'
    ) THEN
        -- Add the column
        ALTER TABLE database_clusters ADD COLUMN cluster_key VARCHAR(20);
        RAISE NOTICE 'Added cluster_key column successfully';
    ELSE
        RAISE NOTICE 'cluster_key column already exists, skipping...';
    END IF;
END;
$$;

-- Step 3: Create the key generation function
CREATE OR REPLACE FUNCTION generate_next_cluster_key()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    new_key TEXT;
BEGIN
    -- Find the highest existing number
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(cluster_key FROM 'CLSTR-(\d+)') AS INTEGER)), 
        0
    ) + 1 INTO next_number
    FROM database_clusters 
    WHERE cluster_key LIKE 'CLSTR-%';
    
    -- Generate the new key
    new_key := 'CLSTR-' || next_number;
    
    RETURN new_key;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Assign keys to existing clusters
DO $$
DECLARE
    cluster_record RECORD;
    key_counter INTEGER := 1;
    cluster_count INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO cluster_count FROM database_clusters WHERE cluster_key IS NULL;
    
    IF cluster_count > 0 THEN
        RAISE NOTICE 'Assigning keys to % existing clusters...', cluster_count;
        
        -- Loop through all existing clusters and assign keys
        FOR cluster_record IN 
            SELECT id, name FROM database_clusters 
            WHERE cluster_key IS NULL 
            ORDER BY created_at ASC
        LOOP
            UPDATE database_clusters 
            SET cluster_key = 'CLSTR-' || key_counter
            WHERE id = cluster_record.id;
            
            RAISE NOTICE 'Assigned % to cluster: %', 'CLSTR-' || key_counter, cluster_record.name;
            key_counter := key_counter + 1;
        END LOOP;
        
        RAISE NOTICE 'Successfully assigned keys to % clusters', cluster_count;
    ELSE
        RAISE NOTICE 'No clusters need key assignment';
    END IF;
END;
$$;

-- Step 5: Make cluster_key NOT NULL (safely)
DO $$
BEGIN
    -- Only add NOT NULL constraint if all clusters have keys
    IF NOT EXISTS (
        SELECT 1 FROM database_clusters WHERE cluster_key IS NULL
    ) THEN
        ALTER TABLE database_clusters ALTER COLUMN cluster_key SET NOT NULL;
        RAISE NOTICE 'Made cluster_key NOT NULL';
    ELSE
        RAISE NOTICE 'Some clusters still missing keys, skipping NOT NULL constraint';
    END IF;
END;
$$;

-- Step 6: Add unique constraint (safely)
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'database_clusters' 
        AND constraint_name = 'database_clusters_cluster_key_key'
        AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE database_clusters ADD CONSTRAINT database_clusters_cluster_key_key UNIQUE (cluster_key);
        RAISE NOTICE 'Added unique constraint to cluster_key';
    ELSE
        RAISE NOTICE 'Unique constraint already exists on cluster_key';
    END IF;
END;
$$;

-- Step 7: Create index for performance (safely)
DO $$
BEGIN
    -- Check if index already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'database_clusters' 
        AND indexname = 'idx_database_clusters_cluster_key'
    ) THEN
        CREATE INDEX idx_database_clusters_cluster_key ON database_clusters(cluster_key);
        RAISE NOTICE 'Created performance index on cluster_key';
    ELSE
        RAISE NOTICE 'Index already exists on cluster_key';
    END IF;
END;
$$;

-- Step 8: Create trigger for auto-generating keys for new clusters
CREATE OR REPLACE FUNCTION auto_generate_cluster_key()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cluster_key IS NULL THEN
        NEW.cluster_key := generate_next_cluster_key();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create it
DROP TRIGGER IF EXISTS trigger_auto_generate_cluster_key ON database_clusters;
CREATE TRIGGER trigger_auto_generate_cluster_key
    BEFORE INSERT ON database_clusters
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_cluster_key();

-- Step 9: Verify the migration
SELECT 'AFTER MIGRATION: Clusters with their new keys:' as status;
SELECT 
  cluster_key,
  name, 
  cluster_type,
  status,
  created_at 
FROM database_clusters 
ORDER BY 
  CAST(SUBSTRING(cluster_key FROM 'CLSTR-(\d+)') AS INTEGER);

SELECT 'MIGRATION COMPLETED SUCCESSFULLY! 🎉' as status;
SELECT 
  COUNT(*) as total_clusters,
  COUNT(cluster_key) as clusters_with_keys,
  COUNT(*) - COUNT(cluster_key) as clusters_missing_keys
FROM database_clusters;
