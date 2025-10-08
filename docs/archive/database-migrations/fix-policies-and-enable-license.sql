-- ================================================================
-- FIX POLICIES AND ENABLE LOCAL CLUSTER FOR YOUR LICENSE
-- Run this in Supabase SQL Editor
-- ================================================================

-- 1. Drop existing policies (if they exist)
DROP POLICY IF EXISTS "Users can view their own local cluster usage" ON local_cluster_usage;
DROP POLICY IF EXISTS "Users can update their own local cluster usage" ON local_cluster_usage;
DROP POLICY IF EXISTS "Users can insert their own local cluster usage" ON local_cluster_usage;
DROP POLICY IF EXISTS "Users can view their own cluster connections" ON centcom_cluster_connections;
DROP POLICY IF EXISTS "Users can manage their own cluster connections" ON centcom_cluster_connections;

-- 2. Recreate policies
CREATE POLICY "Users can view their own local cluster usage"
  ON local_cluster_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own local cluster usage"
  ON local_cluster_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own local cluster usage"
  ON local_cluster_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own cluster connections"
  ON centcom_cluster_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own cluster connections"
  ON centcom_cluster_connections FOR ALL
  USING (auth.uid() = user_id);

-- 3. Enable local cluster support for your specific license
UPDATE license_keys
SET 
  allows_local_cluster = TRUE,
  local_cluster_limits = '{
    "max_storage_gb": 500,
    "max_monthly_queries": 10000000,
    "max_users": -1,
    "lifecycle_tiers_enabled": true,
    "offline_grace_days": 30
  }'::jsonb
WHERE key_code = 'PLUGIN-ENT-2025-HQ21CIBF';

-- 4. Verify everything is set up correctly
SELECT 
  '✅ Schema Setup' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'local_cluster_usage')
    THEN '✅ local_cluster_usage table exists'
    ELSE '❌ local_cluster_usage table missing'
  END as status
UNION ALL
SELECT 
  '✅ Schema Setup',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'centcom_cluster_connections')
    THEN '✅ centcom_cluster_connections table exists'
    ELSE '❌ centcom_cluster_connections table missing'
  END
UNION ALL
SELECT 
  '✅ License Configuration',
  CASE 
    WHEN allows_local_cluster = TRUE 
    THEN '✅ Local cluster enabled for ' || key_code
    ELSE '❌ Local cluster NOT enabled for ' || key_code
  END
FROM license_keys
WHERE key_code = 'PLUGIN-ENT-2025-HQ21CIBF';

-- 5. Show the license details
SELECT 
  key_code as "License Key",
  license_type as "Type",
  allows_local_cluster as "Local Cluster?",
  local_cluster_limits->>'max_storage_gb' as "Storage GB",
  local_cluster_limits->>'max_monthly_queries' as "Query Limit",
  local_cluster_limits->>'offline_grace_days' as "Offline Days"
FROM license_keys
WHERE key_code = 'PLUGIN-ENT-2025-HQ21CIBF';

