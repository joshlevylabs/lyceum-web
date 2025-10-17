-- Add cluster_key column to local_cluster_usage table and generate sequential keys
-- Run this in Supabase SQL Editor

-- Step 1: Add cluster_key column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'local_cluster_usage'
    AND column_name = 'cluster_key'
  ) THEN
    ALTER TABLE public.local_cluster_usage
    ADD COLUMN cluster_key TEXT UNIQUE;

    RAISE NOTICE '✅ Added cluster_key column';
  ELSE
    RAISE NOTICE '⚠️  cluster_key column already exists';
  END IF;
END $$;

-- Step 2: Find the highest existing CLSTR-X number from unified_clusters
DO $$
DECLARE
  max_cluster_num INTEGER;
  current_row RECORD;
  new_num INTEGER;
BEGIN
  -- Get the max cluster number from existing CLSTR-X keys
  SELECT COALESCE(
    MAX(
      CAST(
        REGEXP_REPLACE(cluster_key, '[^0-9]', '', 'g') AS INTEGER
      )
    ),
    0
  )
  INTO max_cluster_num
  FROM unified_clusters
  WHERE cluster_key ~ 'CLSTR-[0-9]+';

  RAISE NOTICE '📊 Highest existing cluster number: %', max_cluster_num;

  -- Start numbering local clusters from max + 1
  new_num := max_cluster_num + 1;

  -- Generate cluster keys for all local clusters that don't have one
  FOR current_row IN
    SELECT id
    FROM local_cluster_usage
    WHERE cluster_key IS NULL
    ORDER BY created_at ASC
  LOOP
    UPDATE local_cluster_usage
    SET cluster_key = 'CLSTR-' || new_num
    WHERE id = current_row.id;

    RAISE NOTICE '✅ Generated key CLSTR-% for cluster %', new_num, current_row.id;

    new_num := new_num + 1;
  END LOOP;

  RAISE NOTICE '🎉 Finished generating cluster keys. Total keys generated: %', (new_num - max_cluster_num - 1);
END $$;

-- Step 3: Verify the results
SELECT
  cluster_key,
  machine_fingerprint,
  clickhouse_version,
  machine_os,
  last_heartbeat_at,
  created_at
FROM local_cluster_usage
ORDER BY cluster_key;

-- Step 4: Show summary
SELECT
  COUNT(*) as total_clusters,
  COUNT(cluster_key) as clusters_with_keys,
  COUNT(*) - COUNT(cluster_key) as clusters_without_keys
FROM local_cluster_usage;

SELECT '✅ Migration complete! All local clusters now have CLSTR-X keys.' AS status;
