-- Quick check to see if Lyceum is receiving heartbeats from CentCom
-- Run this in Supabase SQL Editor

-- Step 1: Check if migration is applied
SELECT
  'Migration Check' as check_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'local_cluster_usage'
  AND column_name IN ('health_status', 'last_error', 'projects_metadata')
ORDER BY column_name;

-- Step 2: Check latest heartbeat data
SELECT
  'Latest Heartbeat Data' as check_type,
  cluster_key,
  cluster_id,
  last_heartbeat_at,
  NOW() - last_heartbeat_at as time_since_heartbeat,
  health_status,
  cluster_status,
  is_running,
  storage_bytes,
  project_count,
  projects_metadata IS NOT NULL as has_projects
FROM local_cluster_usage
WHERE cluster_key LIKE 'LOCAL-%'
ORDER BY last_heartbeat_at DESC
LIMIT 1;

-- Step 3: Interpretation
-- If time_since_heartbeat > 15 minutes: Heartbeats are NOT being received
-- If health_status = 'unknown': No heartbeat received since migration
-- If storage_bytes IS NULL or 0: No data being sent from CentCom
-- If has_projects = false: Projects array not being sent
