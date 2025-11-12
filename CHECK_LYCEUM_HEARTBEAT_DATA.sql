-- Quick check to see if Lyceum is receiving and storing heartbeat data
-- Run this in Supabase SQL Editor

-- ============================================================================
-- PART 1: Check Latest Heartbeat Data
-- ============================================================================

SELECT
  '1. Latest Heartbeat Data' as check_name,
  cluster_key,
  cluster_id,

  -- Heartbeat timing
  last_heartbeat_at,
  NOW() - last_heartbeat_at as heartbeat_age,
  CASE
    WHEN NOW() - last_heartbeat_at < INTERVAL '10 minutes' THEN '✅ Very Recent'
    WHEN NOW() - last_heartbeat_at < INTERVAL '15 minutes' THEN '✅ Recent'
    WHEN NOW() - last_heartbeat_at < INTERVAL '1 hour' THEN '⚠️ Stale'
    ELSE '❌ Very Old'
  END as heartbeat_status,

  -- Health and status
  health_status,
  cluster_status,
  is_running,

  -- Statistics
  storage_bytes,
  storage_used_gb,
  ROUND((storage_bytes::numeric / (1024 * 1024)), 2) as storage_mb,
  project_count,
  measurement_count,
  table_count,
  queries_this_month,

  -- Projects metadata
  projects_metadata IS NOT NULL as has_projects,
  CASE
    WHEN projects_metadata IS NOT NULL
    THEN jsonb_array_length(projects_metadata)
    ELSE 0
  END as projects_count,

  -- Error tracking
  last_error,

  -- Timestamps
  created_at,
  updated_at

FROM local_cluster_usage
WHERE cluster_key = 'LOCAL-0001'  -- Replace with your cluster key if different
ORDER BY last_heartbeat_at DESC
LIMIT 1;

-- ============================================================================
-- PART 2: Expected vs Actual Comparison
-- ============================================================================

SELECT
  '2. Data Validation' as check_name,

  -- Expected from CentCom logs
  2 as expected_project_count,
  315 as expected_measurement_count,
  4 as expected_table_count,
  1445195 as expected_storage_bytes,
  'healthy' as expected_health_status,
  'online' as expected_cluster_status,

  -- Actual from database
  project_count as actual_project_count,
  measurement_count as actual_measurement_count,
  table_count as actual_table_count,
  storage_bytes as actual_storage_bytes,
  health_status as actual_health_status,
  cluster_status as actual_cluster_status,

  -- Validation
  CASE WHEN project_count = 2 THEN '✅' ELSE '❌' END as project_count_ok,
  CASE WHEN measurement_count = 315 THEN '✅' ELSE '❌' END as measurement_count_ok,
  CASE WHEN table_count = 4 THEN '✅' ELSE '❌' END as table_count_ok,
  CASE WHEN storage_bytes = 1445195 THEN '✅' ELSE '❌' END as storage_bytes_ok,
  CASE WHEN health_status = 'healthy' THEN '✅' ELSE '❌' END as health_status_ok,
  CASE WHEN cluster_status = 'online' THEN '✅' ELSE '❌' END as cluster_status_ok

FROM local_cluster_usage
WHERE cluster_key = 'LOCAL-0001'
LIMIT 1;

-- ============================================================================
-- PART 3: Projects Metadata Check
-- ============================================================================

SELECT
  '3. Projects Metadata' as check_name,
  cluster_key,

  -- Projects data check
  projects_metadata IS NOT NULL as has_projects_data,
  CASE
    WHEN projects_metadata IS NOT NULL
    THEN jsonb_array_length(projects_metadata)
    ELSE 0
  END as projects_array_length,

  -- First project details (if exists)
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
    WHEN projects_metadata IS NULL THEN '❌ No projects data'
    WHEN jsonb_array_length(projects_metadata) = 0 THEN '⚠️ Empty projects array'
    WHEN jsonb_array_length(projects_metadata) = 2 THEN '✅ 2 projects (expected)'
    ELSE '⚠️ Unexpected project count'
  END as projects_validation

FROM local_cluster_usage
WHERE cluster_key = 'LOCAL-0001'
LIMIT 1;

-- ============================================================================
-- PART 4: Migration Check
-- ============================================================================

SELECT
  '4. Migration Check' as check_name,
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

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================

/*

✅ SUCCESS INDICATORS (Everything Working):
-------------------------------------------------
PART 1:
- heartbeat_age: < 10 minutes
- heartbeat_status: "✅ Very Recent" or "✅ Recent"
- health_status: "healthy"
- cluster_status: "online"
- is_running: true
- storage_bytes: 1445195
- storage_mb: 1.38
- project_count: 2
- measurement_count: 315
- table_count: 4
- has_projects: true
- projects_count: 2
- last_error: NULL

PART 2:
- All validation columns show "✅"

PART 3:
- projects_validation: "✅ 2 projects (expected)"
- first_project_name: "Test Project 1" or "Test Project 2"
- first_project_measurements: 150 or 165

PART 4:
- Should see 3 rows (health_status, last_error, projects_metadata)


❌ FAILURE INDICATORS (Not Working):
-------------------------------------------------

1. Heartbeat Not Reaching Lyceum:
   - heartbeat_age: > 15 minutes
   - heartbeat_status: "❌ Very Old"
   - health_status: "unknown"
   - storage_bytes: 0 or NULL
   - project_count: 0 or NULL

   → CentCom heartbeats are not reaching Lyceum backend
   → Check Lyceum terminal for heartbeat logs
   → Check Authorization header in CentCom

2. Data Not Being Stored:
   - heartbeat is recent BUT data is wrong/missing
   - health_status: "unknown" (should be "healthy")
   - storage_bytes: 0 (should be 1445195)
   - project_count: 0 (should be 2)

   → Heartbeats are reaching Lyceum but data isn't being stored
   → Check heartbeat endpoint is storing all fields
   → Check CentCom is sending all fields in payload

3. Projects Not Being Sent:
   - projects_validation: "❌ No projects data"
   - projects_count: 0

   → CentCom is not sending projects array in heartbeat
   → Check CentCom payload includes "projects" field

4. Migration Not Applied:
   - PART 4 returns 0 rows

   → Migration hasn't been run
   → Apply: supabase/migrations/20250107_add_cluster_health_and_projects.sql


NEXT STEPS BASED ON RESULTS:
-------------------------------------------------

If ALL ✅ (data is correct):
→ Issue is in Lyceum FRONTEND display
→ Check browser Network tab for API responses
→ Check browser console for React errors
→ Verify frontend components are rendering the data

If SOME ❌ (data is missing/wrong):
→ Issue is in HEARTBEAT STORAGE
→ Check Lyceum terminal for heartbeat logs
→ Verify heartbeat endpoint is storing all fields
→ Check CentCom payload structure

If heartbeat_age > 15 minutes:
→ Issue is HEARTBEATS NOT REACHING LYCEUM
→ Check Lyceum dev server is running
→ Check CentCom Authorization header
→ Check network connectivity

*/
