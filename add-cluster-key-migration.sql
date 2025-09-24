-- Add cluster_key column to database_clusters table
-- Each cluster gets a unique key like CLSTR-1, CLSTR-2, etc.

-- First, add the column
ALTER TABLE database_clusters 
ADD COLUMN cluster_key VARCHAR(20) UNIQUE;

-- Create a function to generate the next cluster key
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

-- Update existing clusters with generated keys
DO $$
DECLARE
    cluster_record RECORD;
    key_counter INTEGER := 1;
BEGIN
    -- Loop through all existing clusters and assign keys
    FOR cluster_record IN 
        SELECT id FROM database_clusters 
        WHERE cluster_key IS NULL 
        ORDER BY created_at ASC
    LOOP
        UPDATE database_clusters 
        SET cluster_key = 'CLSTR-' || key_counter
        WHERE id = cluster_record.id;
        
        key_counter := key_counter + 1;
    END LOOP;
END;
$$;

-- Add a NOT NULL constraint after populating existing data
ALTER TABLE database_clusters 
ALTER COLUMN cluster_key SET NOT NULL;

-- Create an index for performance
CREATE INDEX idx_database_clusters_cluster_key 
ON database_clusters(cluster_key);

-- Create a trigger to automatically generate keys for new clusters
CREATE OR REPLACE FUNCTION auto_generate_cluster_key()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cluster_key IS NULL THEN
        NEW.cluster_key := generate_next_cluster_key();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_cluster_key
    BEFORE INSERT ON database_clusters
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_cluster_key();

-- Verify the migration
SELECT 'Migration completed successfully. Cluster keys added:' as status;
SELECT cluster_key, name, created_at 
FROM database_clusters 
ORDER BY cluster_key;
