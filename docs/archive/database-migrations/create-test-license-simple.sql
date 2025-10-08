-- ================================================================
-- CREATE TEST LICENSE FOR CENTCOM CLUSTER TESTING (SIMPLE VERSION)
-- This version returns results you can see in Supabase SQL Editor
-- ================================================================

-- Step 1: Get a user ID to assign the license to
-- Run this first to see what users you have
SELECT 
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Create test license (UPDATE THE USER ID BELOW!)
-- Replace 'YOUR_USER_ID_HERE' with an actual UUID from Step 1
INSERT INTO license_keys (
  key_code,
  license_type,
  status,
  max_users,
  max_projects,
  max_storage_gb,
  assigned_to,
  assigned_at,
  expires_at,
  allows_local_cluster,
  local_cluster_limits,
  enabled_plugins
) VALUES (
  'CENTCOM-TEST-PRO-' || SUBSTRING(md5(random()::text) FROM 1 FOR 8),
  'professional',
  'active',
  5,
  100,
  50,
  'YOUR_USER_ID_HERE',  -- ⚠️ REPLACE THIS WITH A REAL UUID FROM STEP 1
  NOW(),
  NOW() + INTERVAL '1 year',
  TRUE,
  '{
    "max_storage_gb": 50,
    "max_monthly_queries": 1000000,
    "max_users": 5,
    "lifecycle_tiers_enabled": true,
    "offline_grace_days": 14
  }'::jsonb,
  '["centcom"]'::jsonb
)
RETURNING 
  key_code as "📋 LICENSE KEY (Copy This!)",
  license_type,
  status,
  allows_local_cluster,
  assigned_to,
  expires_at;

