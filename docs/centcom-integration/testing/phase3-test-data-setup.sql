-- ================================================================
-- PHASE 3 E2E TESTING - TEST DATA SETUP
-- ================================================================
-- Purpose: Create comprehensive test data for end-to-end testing
-- Usage: Run this in Supabase SQL Editor after Phase 2 completes
-- Date: October 2, 2025
-- ================================================================

-- ================================================================
-- 1. TEST USERS
-- ================================================================
-- Note: Users must be created via Supabase Auth first
-- These UUIDs should match actual test user accounts

-- Test User 1: Enterprise User (existing - josh@thelyceum.io)
-- UUID: 2c3d4747-8d67-45af-90f5-b5e9058ec246
-- Already has license: PLUGIN-ENT-2025-HQ21CIBF

-- Test User 2: Professional User (create via Supabase Auth)
-- Email: test-professional@thelyceum.io
-- For testing mid-tier features

-- Test User 3: Basic User (create via Supabase Auth)
-- Email: test-basic@thelyceum.io
-- For testing basic tier limitations

-- Test User 4: Trial User (create via Supabase Auth)
-- Email: test-trial@thelyceum.io
-- For testing trial expiration

-- Test User 5: Expired User (create via Supabase Auth)
-- Email: test-expired@thelyceum.io
-- For testing expired license handling

-- ================================================================
-- 2. TEST LICENSES
-- ================================================================

-- License 1: Professional Tier (for test user 2)
INSERT INTO license_keys (
  key_code,
  license_type,
  status,
  issued_to,
  assigned_to,
  allows_local_cluster,
  local_cluster_limits,
  expires_at,
  created_at,
  updated_at
) VALUES (
  'PLUGIN-PRO-2025-TEST001',
  'professional',
  'active',
  'Test Professional User',
  NULL, -- Replace with actual UUID after user creation
  true,
  '{
    "max_storage_gb": 100,
    "max_monthly_queries": 1000000,
    "max_users": 5,
    "offline_grace_days": 14,
    "lifecycle_tiers_enabled": true
  }'::jsonb,
  NOW() + INTERVAL '1 year',
  NOW(),
  NOW()
) ON CONFLICT (key_code) DO UPDATE SET
  status = EXCLUDED.status,
  allows_local_cluster = EXCLUDED.allows_local_cluster;

-- License 2: Basic Tier (for test user 3)
INSERT INTO license_keys (
  key_code,
  license_type,
  status,
  issued_to,
  assigned_to,
  allows_local_cluster,
  local_cluster_limits,
  expires_at,
  created_at,
  updated_at
) VALUES (
  'PLUGIN-BASIC-2025-TEST002',
  'basic',
  'active',
  'Test Basic User',
  NULL, -- Replace with actual UUID after user creation
  true,
  '{
    "max_storage_gb": 10,
    "max_monthly_queries": 100000,
    "max_users": 1,
    "offline_grace_days": 7,
    "lifecycle_tiers_enabled": false
  }'::jsonb,
  NOW() + INTERVAL '1 year',
  NOW(),
  NOW()
) ON CONFLICT (key_code) DO UPDATE SET
  status = EXCLUDED.status,
  allows_local_cluster = EXCLUDED.allows_local_cluster;

-- License 3: Trial Tier (for test user 4) - expires soon
INSERT INTO license_keys (
  key_code,
  license_type,
  status,
  issued_to,
  assigned_to,
  allows_local_cluster,
  local_cluster_limits,
  expires_at,
  created_at,
  updated_at
) VALUES (
  'PLUGIN-TRIAL-2025-TEST003',
  'trial',
  'active',
  'Test Trial User',
  NULL, -- Replace with actual UUID after user creation
  true,
  '{
    "max_storage_gb": 5,
    "max_monthly_queries": 10000,
    "max_users": 1,
    "offline_grace_days": 3,
    "lifecycle_tiers_enabled": false
  }'::jsonb,
  NOW() + INTERVAL '7 days', -- Expires in 1 week for testing
  NOW(),
  NOW()
) ON CONFLICT (key_code) DO UPDATE SET
  status = EXCLUDED.status,
  allows_local_cluster = EXCLUDED.allows_local_cluster;

-- License 4: Expired License (for test user 5)
INSERT INTO license_keys (
  key_code,
  license_type,
  status,
  issued_to,
  assigned_to,
  allows_local_cluster,
  local_cluster_limits,
  expires_at,
  created_at,
  updated_at
) VALUES (
  'PLUGIN-BASIC-2025-EXPIRED',
  'basic',
  'expired',
  'Test Expired User',
  NULL, -- Replace with actual UUID after user creation
  true,
  '{
    "max_storage_gb": 10,
    "max_monthly_queries": 100000,
    "max_users": 1,
    "offline_grace_days": 7,
    "lifecycle_tiers_enabled": false
  }'::jsonb,
  NOW() - INTERVAL '30 days', -- Already expired
  NOW(),
  NOW()
) ON CONFLICT (key_code) DO UPDATE SET
  status = EXCLUDED.status,
  allows_local_cluster = EXCLUDED.allows_local_cluster;

-- License 5: Gratis/Free Tier (for testing limitations)
INSERT INTO license_keys (
  key_code,
  license_type,
  status,
  issued_to,
  assigned_to,
  allows_local_cluster,
  local_cluster_limits,
  expires_at,
  created_at,
  updated_at
) VALUES (
  'PLUGIN-GRATIS-2025-TEST005',
  'gratis',
  'active',
  'Test Free User',
  NULL, -- Can assign to any test user
  true,
  '{
    "max_storage_gb": 1,
    "max_monthly_queries": 1000,
    "max_users": 1,
    "offline_grace_days": 1,
    "lifecycle_tiers_enabled": false
  }'::jsonb,
  NULL, -- No expiration for gratis
  NOW(),
  NOW()
) ON CONFLICT (key_code) DO UPDATE SET
  status = EXCLUDED.status,
  allows_local_cluster = EXCLUDED.allows_local_cluster;

-- ================================================================
-- 3. TEST CLUSTERS
-- ================================================================

-- Cluster 1: Dev Optimized Cluster (for enterprise user)
INSERT INTO unified_clusters (
  cluster_key,
  cluster_name,
  cluster_type,
  architecture,
  classification,
  region,
  connection_type,
  status,
  tier,
  customer_id,
  monthly_curves_limit,
  storage_limit,
  processing_endpoint,
  tier_features,
  created_at,
  updated_at
) VALUES (
  'TEST-DEV-001',
  'Test Development Cluster',
  'development',
  'optimized',
  'sandbox',
  'us-west-2',
  'cloud',
  'active',
  'starter',
  'test-customer-dev-001',
  10000,
  '5GB',
  'https://us-central1-lyceum-clusters-optimized.cloudfunctions.net/processCurves',
  ARRAY['basic_processing', 'data_storage']::text[],
  NOW(),
  NOW()
) ON CONFLICT (cluster_key) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = NOW();

-- Cluster 2: Prod Optimized Cluster (for enterprise user)
INSERT INTO unified_clusters (
  cluster_key,
  cluster_name,
  cluster_type,
  architecture,
  classification,
  region,
  connection_type,
  status,
  tier,
  customer_id,
  monthly_curves_limit,
  storage_limit,
  processing_endpoint,
  tier_features,
  created_at,
  updated_at
) VALUES (
  'TEST-PROD-002',
  'Test Production Cluster',
  'production',
  'optimized',
  'enterprise',
  'us-east-1',
  'cloud',
  'active',
  'growth',
  'test-customer-prod-002',
  100000,
  '50GB',
  'https://us-central1-lyceum-clusters-optimized.cloudfunctions.net/processCurves',
  ARRAY['basic_processing', 'advanced_analytics', 'data_storage', 'high_availability']::text[],
  NOW(),
  NOW()
) ON CONFLICT (cluster_key) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = NOW();

-- Cluster 3: Traditional Cluster (for testing mixed architectures)
INSERT INTO unified_clusters (
  cluster_key,
  cluster_name,
  cluster_type,
  architecture,
  classification,
  region,
  connection_type,
  status,
  connection_string,
  admin_password_hash,
  readonly_password_hash,
  created_at,
  updated_at
) VALUES (
  'TEST-TRAD-003',
  'Test Traditional Cluster',
  'production',
  'traditional',
  'enterprise',
  'us-central-1',
  'cloud',
  'active',
  'clickhouse://test-cluster-003.lyceum.io:9000/default',
  'hashed_admin_password_placeholder',
  'hashed_readonly_password_placeholder',
  NOW(),
  NOW()
) ON CONFLICT (cluster_key) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = NOW();

-- Cluster 4-10: Additional clusters for load testing
-- (Create similar clusters with different configs)

DO $$
DECLARE
  i INT;
BEGIN
  FOR i IN 4..10 LOOP
    INSERT INTO unified_clusters (
      cluster_key,
      cluster_name,
      cluster_type,
      architecture,
      classification,
      region,
      connection_type,
      status,
      tier,
      customer_id,
      monthly_curves_limit,
      storage_limit,
      processing_endpoint,
      tier_features,
      created_at,
      updated_at
    ) VALUES (
      'TEST-LOAD-' || LPAD(i::TEXT, 3, '0'),
      'Test Load Cluster ' || i,
      'development',
      'optimized',
      'sandbox',
      'us-west-2',
      'cloud',
      'active',
      'starter',
      'test-customer-load-' || LPAD(i::TEXT, 3, '0'),
      5000,
      '2GB',
      'https://us-central1-lyceum-clusters-optimized.cloudfunctions.net/processCurves',
      ARRAY['basic_processing']::text[],
      NOW(),
      NOW()
    ) ON CONFLICT (cluster_key) DO UPDATE SET
      status = EXCLUDED.status,
      updated_at = NOW();
  END LOOP;
END $$;

-- ================================================================
-- 4. CLUSTER ASSIGNMENTS
-- ================================================================

-- Assign clusters to enterprise user (2c3d4747-8d67-45af-90f5-b5e9058ec246)
-- Note: This user already has "Second-Cluster-Test" assigned

-- Assign dev cluster
INSERT INTO cluster_user_assignments (
  cluster_id,
  user_id,
  access_level,
  assigned_by,
  is_active,
  created_at
) SELECT
  id,
  '2c3d4747-8d67-45af-90f5-b5e9058ec246'::uuid,
  'owner',
  '2c3d4747-8d67-45af-90f5-b5e9058ec246'::uuid,
  true,
  NOW()
FROM unified_clusters
WHERE cluster_key = 'TEST-DEV-001'
ON CONFLICT (cluster_id, user_id) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- Assign prod cluster
INSERT INTO cluster_user_assignments (
  cluster_id,
  user_id,
  access_level,
  assigned_by,
  is_active,
  created_at
) SELECT
  id,
  '2c3d4747-8d67-45af-90f5-b5e9058ec246'::uuid,
  'owner',
  '2c3d4747-8d67-45af-90f5-b5e9058ec246'::uuid,
  true,
  NOW()
FROM unified_clusters
WHERE cluster_key = 'TEST-PROD-002'
ON CONFLICT (cluster_id, user_id) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- Assign traditional cluster
INSERT INTO cluster_user_assignments (
  cluster_id,
  user_id,
  access_level,
  assigned_by,
  is_active,
  created_at
) SELECT
  id,
  '2c3d4747-8d67-45af-90f5-b5e9058ec246'::uuid,
  'admin',
  '2c3d4747-8d67-45af-90f5-b5e9058ec246'::uuid,
  true,
  NOW()
FROM unified_clusters
WHERE cluster_key = 'TEST-TRAD-003'
ON CONFLICT (cluster_id, user_id) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- ================================================================
-- 5. INITIAL USAGE DATA (for testing)
-- ================================================================

-- Create initial usage record for enterprise user
INSERT INTO local_cluster_usage (
  user_id,
  license_id,
  machine_fingerprint,
  storage_used_gb,
  queries_this_month,
  clickhouse_version,
  machine_os,
  machine_memory_gb,
  machine_cpu_cores,
  last_heartbeat_at,
  created_at,
  updated_at
) SELECT
  '2c3d4747-8d67-45af-90f5-b5e9058ec246'::uuid,
  id,
  'test-machine-initial',
  2.5,
  15000,
  '24.1.0',
  'Windows 11',
  16,
  8,
  NOW(),
  NOW(),
  NOW()
FROM license_keys
WHERE key_code = 'PLUGIN-ENT-2025-HQ21CIBF'
ON CONFLICT (user_id, machine_fingerprint) DO UPDATE SET
  storage_used_gb = EXCLUDED.storage_used_gb,
  queries_this_month = EXCLUDED.queries_this_month,
  last_heartbeat_at = EXCLUDED.last_heartbeat_at,
  updated_at = NOW();

-- ================================================================
-- 6. VERIFICATION QUERIES
-- ================================================================

-- Verify test licenses
SELECT 
  key_code,
  license_type,
  status,
  allows_local_cluster,
  local_cluster_limits->'max_storage_gb' as max_storage_gb,
  local_cluster_limits->'max_monthly_queries' as max_queries,
  expires_at
FROM license_keys
WHERE key_code LIKE 'PLUGIN-%TEST%'
ORDER BY key_code;

-- Verify test clusters
SELECT 
  cluster_key,
  cluster_name,
  cluster_type,
  architecture,
  classification,
  status
FROM unified_clusters
WHERE cluster_key LIKE 'TEST-%'
ORDER BY cluster_key;

-- Verify cluster assignments for enterprise user
SELECT 
  uc.cluster_key,
  uc.cluster_name,
  cua.access_level,
  cua.is_active
FROM cluster_user_assignments cua
JOIN unified_clusters uc ON uc.id = cua.cluster_id
WHERE cua.user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'::uuid
ORDER BY uc.cluster_key;

-- Verify usage data
SELECT 
  lcu.machine_fingerprint,
  lcu.storage_used_gb,
  lcu.queries_this_month,
  lcu.last_heartbeat_at,
  lk.key_code
FROM local_cluster_usage lcu
JOIN license_keys lk ON lk.id = lcu.license_id
WHERE lcu.user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'::uuid;

-- ================================================================
-- 7. CLEANUP (Run after testing completes)
-- ================================================================

/*
-- Uncomment to clean up test data:

-- Delete test cluster assignments
DELETE FROM cluster_user_assignments 
WHERE cluster_id IN (
  SELECT id FROM unified_clusters WHERE cluster_key LIKE 'TEST-%'
);

-- Delete test clusters
DELETE FROM unified_clusters 
WHERE cluster_key LIKE 'TEST-%';

-- Delete test usage data
DELETE FROM local_cluster_usage
WHERE license_id IN (
  SELECT id FROM license_keys WHERE key_code LIKE 'PLUGIN-%TEST%'
);

-- Delete test licenses
DELETE FROM license_keys 
WHERE key_code LIKE 'PLUGIN-%TEST%';

-- Note: Test users should be deleted via Supabase Auth UI
*/

-- ================================================================
-- SETUP COMPLETE
-- ================================================================

SELECT 'Phase 3 test data setup complete!' as status,
       COUNT(*) FILTER (WHERE key_code LIKE 'PLUGIN-%TEST%') as test_licenses,
       COUNT(*) FILTER (WHERE cluster_key LIKE 'TEST-%') as test_clusters
FROM license_keys, unified_clusters;




