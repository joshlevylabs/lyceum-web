-- ================================================================
-- FIX LICENSE VALIDATION ENDPOINT FOR CENTCOM
-- ================================================================
-- This script fixes the license configuration for josh@thelyceum.io
-- so that the /api/licenses/validate endpoint returns proper limits
-- ================================================================

-- Step 1: Verify the columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'license_keys'
  AND column_name IN ('allows_local_cluster', 'local_cluster_limits')
ORDER BY column_name;

-- Expected output:
-- allows_local_cluster | boolean
-- local_cluster_limits | jsonb

-- Step 2: Check current license configuration
SELECT
  id,
  key_code,
  license_type,
  status,
  assigned_to,
  allows_local_cluster,
  local_cluster_limits
FROM license_keys
WHERE key_code = 'CENTCOM-9811c42f'
  AND assigned_to = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- Step 3: Update the license to enable local cluster with professional limits
UPDATE license_keys
SET
  allows_local_cluster = TRUE,
  local_cluster_limits = jsonb_build_object(
    'max_storage_gb', 500,
    'max_monthly_queries', 5000000,
    'max_users', 50,
    'lifecycle_tiers_enabled', true,
    'offline_grace_days', 60
  )
WHERE key_code = 'CENTCOM-9811c42f'
  AND assigned_to = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
RETURNING
  key_code,
  license_type,
  allows_local_cluster,
  local_cluster_limits;

-- Step 4: Verify the update worked
SELECT
  key_code,
  license_type,
  status,
  allows_local_cluster as local_cluster_enabled,
  local_cluster_limits->>'max_storage_gb' as max_storage_gb,
  local_cluster_limits->>'max_monthly_queries' as max_monthly_queries,
  local_cluster_limits->>'max_users' as max_users,
  local_cluster_limits->>'lifecycle_tiers_enabled' as lifecycle_tiers,
  local_cluster_limits->>'offline_grace_days' as grace_days
FROM license_keys
WHERE key_code = 'CENTCOM-9811c42f';

-- Expected output:
-- key_code          | CENTCOM-9811c42f
-- license_type      | professional (or whatever the actual type is)
-- status            | active
-- local_cluster_enabled | true
-- max_storage_gb    | 500
-- max_monthly_queries | 5000000
-- max_users         | 50
-- lifecycle_tiers   | true
-- grace_days        | 60

-- ================================================================
-- SUMMARY OF FIXES APPLIED
-- ================================================================

-- Backend Fixes (Already Applied):
-- 1. ✅ Updated middleware.ts to add CORS support for /api/licenses/ routes
-- 2. ✅ The /api/licenses/validate endpoint already exists and is working

-- Database Fixes (Run This Script):
-- 3. ✅ Enable allows_local_cluster = true for the test license
-- 4. ✅ Configure local_cluster_limits with professional tier values

-- Centcom App Changes Needed:
-- 5. ⚠️ OPTIONAL: Add Authorization header if you have a session token
--    However, the endpoint SHOULD work without it (uses service role key)
--
--    Example:
--    headers: {
--      'Content-Type': 'application/json',
--      'Authorization': `Bearer ${session.session_token}`  // Optional
--    }

-- ================================================================
-- EXPECTED API RESPONSE AFTER FIX
-- ================================================================

-- POST https://lyceum-sable.vercel.app/api/licenses/validate
-- Body: {
--   "license_key": "CENTCOM-9811c42f",
--   "user_id": "2c3d4747-8d67-45af-90f5-b5e9058ec246",
--   "user_type": "engineer",
--   "requested_plugin": "centcom"
-- }

-- Expected Response (200 OK):
-- {
--   "valid": true,
--   "license_id": "...",
--   "license_type": "professional",
--   "permissions": {
--     "centcom": {},
--     "access_level": "standard",
--     "can_create_projects": true,
--     "can_invite_users": true,
--     "can_export_data": false,
--     "can_use_api": false,
--     "can_collaborate": true
--   },
--   "restrictions": {
--     "time_limited": false,
--     "plugin_restricted": true,
--     "user_type_restricted": false,
--     "usage_limits": {
--       "max_users": 10,
--       "max_projects": 50,
--       "max_storage_gb": 100
--     }
--   },
--   "local_cluster": {
--     "enabled": true,
--     "limits": {
--       "max_storage_gb": 500,
--       "max_monthly_queries": 5000000,
--       "max_users": 50,
--       "lifecycle_tiers_enabled": true,
--       "offline_grace_days": 60
--     }
--   },
--   "warnings": []
-- }
