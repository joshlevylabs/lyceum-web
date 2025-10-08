-- ================================================================
-- CREATE TEST LICENSE FOR CENTCOM CLUSTER TESTING
-- Run this in Supabase SQL Editor
-- ================================================================

-- 1. Create a test user if you don't have one
-- Skip this if you already have a test user
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Check if test user exists
  SELECT id INTO test_user_id
  FROM auth.users
  WHERE email = 'test@centcom-cluster.local'
  LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No test user found. Please create one through Supabase Auth UI:';
    RAISE NOTICE '1. Go to Authentication → Users';
    RAISE NOTICE '2. Click "Add User"';
    RAISE NOTICE '3. Email: test@centcom-cluster.local';
    RAISE NOTICE '4. Password: TestPassword123!';
    RAISE NOTICE '5. Then re-run this script';
  ELSE
    RAISE NOTICE 'Test user exists: %', test_user_id;
  END IF;
END $$;

-- 2. Create test license for each tier
-- This will create 5 test licenses you can use

-- Get test user ID (update this if needed)
DO $$
DECLARE
  v_test_user_id UUID;
  v_license_id UUID;
BEGIN
  -- Get the first active user (or specify your test user email)
  SELECT id INTO v_test_user_id
  FROM auth.users
  WHERE email LIKE '%test%' OR email LIKE '%@example.com'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no test user, get any user
  IF v_test_user_id IS NULL THEN
    SELECT id INTO v_test_user_id
    FROM auth.users
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  RAISE NOTICE 'Using user ID: %', v_test_user_id;
  
  -- Create Professional license (good for testing all features)
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
    v_test_user_id,
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
  ) RETURNING id INTO v_license_id;
  
  RAISE NOTICE '✅ Created Professional test license (ID: %)', v_license_id;
  
  -- Create Trial license for testing limitations
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
    'CENTCOM-TEST-TRIAL-' || SUBSTRING(md5(random()::text) FROM 1 FOR 8),
    'trial',
    'active',
    1,
    10,
    5,
    v_test_user_id,
    NOW(),
    NOW() + INTERVAL '30 days',
    TRUE,
    '{
      "max_storage_gb": 5,
      "max_monthly_queries": 50000,
      "max_users": 1,
      "lifecycle_tiers_enabled": false,
      "offline_grace_days": 3
    }'::jsonb,
    '["centcom"]'::jsonb
  ) RETURNING id INTO v_license_id;
  
  RAISE NOTICE '✅ Created Trial test license (ID: %)', v_license_id;
  
END $$;

-- 3. Display all test licenses with their key_codes
SELECT 
  key_code,
  license_type,
  status,
  allows_local_cluster,
  local_cluster_limits->>'max_storage_gb' as storage_limit_gb,
  local_cluster_limits->>'max_monthly_queries' as query_limit,
  expires_at,
  assigned_to
FROM license_keys
WHERE key_code LIKE 'CENTCOM-TEST-%'
ORDER BY created_at DESC;

-- 4. Show how to get the key_code for testing
DO $$
DECLARE
  v_key_code TEXT;
BEGIN
  SELECT key_code INTO v_key_code
  FROM license_keys
  WHERE key_code LIKE 'CENTCOM-TEST-PRO-%'
  ORDER BY created_at DESC
  LIMIT 1;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📋 COPY THIS KEY CODE FOR TESTING:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '%', v_key_code;
  RAISE NOTICE '';
  RAISE NOTICE 'Update your test script:';
  RAISE NOTICE 'TEST_CONFIG.licenseKey = "%"', v_key_code;
  RAISE NOTICE '========================================';
END $$;

