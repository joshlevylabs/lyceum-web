-- CentCom Heartbeat Integration Verification Script
-- Run this in Supabase SQL Editor to verify heartbeat data is being received and stored

-- ============================================================================
-- STEP 1: Verify Migration is Applied
-- ============================================================================

SELECT
  'Migration Check' as check_name,
  column_name,
  data_type,
  CASE
    WHEN column_name = 'health_status' THEN '✅ Health status column exists'
    WHEN column_name = 'last_error' THEN '✅ Last error column exists'
    WHEN column_name = 'projects_metadata' THEN '✅ Projects metadata column exists'
  END as status
FROM information_schema.columns
WHERE table_name = 'local_cluster_usage'
  AND column_name IN ('health_status', 'last_error', 'projects_metadata')
ORDER BY column_name;

-- Expected: 3 rows (health_status, last_error, projects_metadata)
-- If no rows returned, migration needs to be applied

-- ============================================================================
-- STEP 2: Check Latest Heartbeat Data
-- ============================================================================

SELECT
  'Latest Heartbeat' as check_name,
  cluster_key,
  cluster_id,

  -- Connection status
  last_heartbeat_at,
  NOW() - last_heartbeat_at as time_since_heartbeat,
  CASE
    WHEN NOW() - last_heartbeat_at < INTERVAL '15 minutes' THEN '✅ Connected (< 15 min)'
    WHEN NOW() - last_heartbeat_at < INTERVAL '1 hour' THEN '⚠️ Recently offline (< 1 hour)'
    ELSE '❌ Offline (> 1 hour)'
  END as connection_status,

  -- Health and status
  health_status,
  cluster_status,
  is_running,

  -- Storage metrics
  storage_bytes,
  storage_used_gb,
  ROUND((storage_bytes::numeric / (1024 * 1024)), 2) as storage_mb,

  -- Project metrics
  project_count,
  measurement_count,
  table_count,

  -- Projects metadata check
  projects_metadata IS NOT NULL as has_projects_data,
  CASE
    WHEN projects_metadata IS NOT NULL
    THEN jsonb_array_length(projects_metadata)
    ELSE 0
  END as projects_array_length,

  -- Error tracking
  last_error,

  -- Version info
  clickhouse_version,
  machine_os

FROM local_cluster_usage
ORDER BY last_heartbeat_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 3: Detailed Health Status Check
-- ============================================================================

SELECT
  'Health Status Check' as check_name,
  cluster_key,

  -- Expected vs Actual
  health_status as actual_health,
  CASE
    WHEN health_status = 'healthy' THEN '✅ Healthy'
    WHEN health_status = 'degraded' THEN '⚠️ Degraded'
    WHEN health_status = 'offline' THEN '❌ Offline'
    WHEN health_status = 'unknown' THEN '⚠️ Unknown (needs heartbeat)'
    ELSE '❓ Invalid status'
  END as health_status_label,

  cluster_status as actual_status,
  CASE
    WHEN cluster_status = 'online' THEN '✅ Online'
    WHEN cluster_status = 'offline' THEN '❌ Offline'
    ELSE '❓ Unknown'
  END as cluster_status_label,

  is_running,

  -- Heartbeat freshness
  EXTRACT(EPOCH FROM (NOW() - last_heartbeat_at))::int as seconds_since_heartbeat,
  CASE
    WHEN NOW() - last_heartbeat_at < INTERVAL '10 minutes' THEN '✅ Very recent (< 10 min)'
    WHEN NOW() - last_heartbeat_at < INTERVAL '15 minutes' THEN '✅ Recent (< 15 min)'
    WHEN NOW() - last_heartbeat_at < INTERVAL '30 minutes' THEN '⚠️ Stale (< 30 min)'
    WHEN NOW() - last_heartbeat_at < INTERVAL '1 hour' THEN '⚠️ Old (< 1 hour)'
    ELSE '❌ Very old (> 1 hour)'
  END as heartbeat_freshness

FROM local_cluster_usage
ORDER BY last_heartbeat_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 4: Projects Metadata Verification
-- ============================================================================

SELECT
  'Projects Metadata Check' as check_name,
  cluster_key,

  -- Projects data presence
  projects_metadata IS NOT NULL as has_projects,
  CASE
    WHEN projects_metadata IS NOT NULL
    THEN jsonb_array_length(projects_metadata)
    ELSE 0
  END as projects_count,

  -- Sample first project if exists
  CASE
    WHEN projects_metadata IS NOT NULL AND jsonb_array_length(projects_metadata) > 0
    THEN (projects_metadata->0->>'project_name')
    ELSE NULL
  END as first_project_name,

  CASE
    WHEN projects_metadata IS NOT NULL AND jsonb_array_length(projects_metadata) > 0
    THEN (projects_metadata->0->>'measurement_count')::int
    ELSE 0
  END as first_project_measurements,

  -- Validation
  CASE
    WHEN projects_metadata IS NULL THEN '❌ No projects data (heartbeat not sending projects)'
    WHEN jsonb_array_length(projects_metadata) = 0 THEN '⚠️ Empty projects array'
    WHEN jsonb_array_length(projects_metadata) > 0 THEN '✅ Projects data present'
  END as projects_status

FROM local_cluster_usage
WHERE cluster_type = 'local' OR architecture = 'centcom'
ORDER BY last_heartbeat_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 5: Expand Projects Metadata (Pretty Print)
-- ============================================================================

WITH projects_expanded AS (
  SELECT
    cluster_key,
    last_heartbeat_at,
    jsonb_array_elements(projects_metadata) as project
  FROM local_cluster_usage
  WHERE projects_metadata IS NOT NULL
    AND jsonb_array_length(projects_metadata) > 0
  ORDER BY last_heartbeat_at DESC
  LIMIT 1  -- Only latest cluster
)
SELECT
  'Projects Detailed View' as check_name,
  cluster_key,
  project->>'project_name' as project_name,
  (project->>'measurement_count')::int as measurements,
  jsonb_array_length(project->'table_names') as table_count,
  project->'table_names' as table_names,
  project->>'created_at' as created_at,
  project->>'last_updated_at' as last_updated_at
FROM projects_expanded;

-- ============================================================================
-- STEP 6: Storage Metrics Verification
-- ============================================================================

SELECT
  'Storage Metrics Check' as check_name,
  cluster_key,

  -- Raw values
  storage_bytes,
  storage_used_gb,

  -- Calculated conversions
  ROUND((storage_bytes::numeric / 1024), 2) as storage_kb,
  ROUND((storage_bytes::numeric / (1024 * 1024)), 2) as storage_mb,
  ROUND((storage_bytes::numeric / (1024 * 1024 * 1024)), 4) as calculated_gb,

  -- Validation
  CASE
    WHEN storage_bytes IS NULL THEN '❌ No storage_bytes (heartbeat not sending)'
    WHEN storage_bytes = 0 THEN '⚠️ Zero storage (empty cluster)'
    WHEN storage_bytes > 0 THEN '✅ Storage data present'
  END as storage_status,

  -- Usage metrics
  project_count,
  measurement_count,
  table_count,
  queries_this_month

FROM local_cluster_usage
WHERE cluster_type = 'local' OR architecture = 'centcom'
ORDER BY last_heartbeat_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 7: Error Tracking
-- ============================================================================

SELECT
  'Error Check' as check_name,
  cluster_key,
  last_heartbeat_at,
  health_status,
  last_error,
  CASE
    WHEN last_error IS NULL THEN '✅ No errors'
    WHEN last_error = '' THEN '✅ No errors'
    ELSE '⚠️ Error present: ' || LEFT(last_error, 50)
  END as error_status
FROM local_cluster_usage
WHERE cluster_type = 'local' OR architecture = 'centcom'
ORDER BY last_heartbeat_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 8: Historical Heartbeat Pattern
-- ============================================================================

SELECT
  'Heartbeat History' as check_name,
  cluster_key,
  last_heartbeat_at,
  health_status,
  cluster_status,
  is_running,
  storage_bytes,
  CASE
    WHEN projects_metadata IS NOT NULL
    THEN jsonb_array_length(projects_metadata)
    ELSE 0
  END as projects_count,
  EXTRACT(EPOCH FROM (NOW() - last_heartbeat_at))::int as seconds_ago
FROM local_cluster_usage
WHERE cluster_type = 'local' OR architecture = 'centcom'
ORDER BY last_heartbeat_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 9: Connection Status Summary
-- ============================================================================

SELECT
  'Connection Summary' as check_name,

  -- Count by status
  COUNT(*) as total_clusters,
  COUNT(*) FILTER (WHERE NOW() - last_heartbeat_at < INTERVAL '15 minutes') as connected_count,
  COUNT(*) FILTER (WHERE NOW() - last_heartbeat_at >= INTERVAL '15 minutes') as offline_count,

  -- Health breakdown
  COUNT(*) FILTER (WHERE health_status = 'healthy') as healthy_count,
  COUNT(*) FILTER (WHERE health_status = 'degraded') as degraded_count,
  COUNT(*) FILTER (WHERE health_status = 'offline') as offline_health_count,
  COUNT(*) FILTER (WHERE health_status = 'unknown') as unknown_count,

  -- Data completeness
  COUNT(*) FILTER (WHERE projects_metadata IS NOT NULL) as has_projects_count,
  COUNT(*) FILTER (WHERE storage_bytes IS NOT NULL AND storage_bytes > 0) as has_storage_count

FROM local_cluster_usage
WHERE cluster_type = 'local' OR architecture = 'centcom';

-- ============================================================================
-- STEP 10: Most Recent Cluster Full Details
-- ============================================================================

SELECT
  'Latest Cluster Full Details' as check_name,
  *
FROM local_cluster_usage
WHERE cluster_type = 'local' OR architecture = 'centcom'
ORDER BY last_heartbeat_at DESC
LIMIT 1;

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================

/*

✅ SUCCESS INDICATORS:
- health_status = 'healthy'
- cluster_status = 'online'
- time_since_heartbeat < 15 minutes
- storage_bytes > 0
- projects_metadata IS NOT NULL
- projects_count >= 0
- connection_status = '✅ Connected'

⚠️ WARNING SIGNS:
- health_status = 'unknown' (needs first heartbeat after migration)
- time_since_heartbeat between 15-60 minutes (may be temporarily offline)
- storage_bytes = 0 (might be empty cluster)
- projects_metadata IS NULL (heartbeat not sending projects yet)

❌ FAILURE INDICATORS:
- Migration Check returns 0 rows (columns don't exist - apply migration!)
- time_since_heartbeat > 1 hour (heartbeat not working)
- health_status = 'offline' (cluster reported offline)
- last_error IS NOT NULL (error occurred)

COMMON ISSUES:

1. Migration not applied:
   - STEP 1 returns 0 rows
   - Solution: Run 20250107_add_cluster_health_and_projects.sql

2. Heartbeat not reaching Lyceum:
   - time_since_heartbeat > 15 minutes
   - health_status = 'unknown'
   - Solution: Check Authorization header in CentCom

3. Projects not being sent:
   - projects_metadata IS NULL
   - Solution: Verify CentCom is including 'projects' array in payload

4. Old data still present:
   - health_status = 'unknown' even though heartbeat is recent
   - Solution: Wait for next heartbeat cycle (10 minutes)

*/
