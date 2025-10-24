-- DEBUG: Check licenses for josh@thelyceum.io (user_id: 2c3d4747-8d67-45af-90f5-b5e9058ec246)

-- Step 1: Check if user exists
SELECT
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'josh@thelyceum.io';

-- Step 2: Check direct licenses (user_id column in licenses table)
SELECT
  id,
  key_code,
  license_type,
  license_category,
  status,
  user_id,
  allows_local_cluster,
  local_cluster_limits,
  main_app_permissions,
  created_at
FROM licenses
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- Step 3: Check user_license_assignments relationship table
SELECT
  ula.id as assignment_id,
  ula.user_id,
  ula.license_id,
  ula.assigned_at,
  ula.revoked_at,
  ula.is_primary,
  l.key_code,
  l.license_type,
  l.status,
  l.allows_local_cluster,
  l.local_cluster_limits
FROM user_license_assignments ula
LEFT JOIN licenses l ON ula.license_id = l.id
WHERE ula.user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- Step 4: Check if user_license_assignments table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'user_license_assignments'
) as table_exists;

-- Step 5: Check all licenses (to see what's in the table)
SELECT
  id,
  key_code,
  license_type,
  user_id,
  allows_local_cluster,
  CASE
    WHEN user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246' THEN 'THIS USER'
    ELSE 'other user'
  END as user_match
FROM licenses
ORDER BY created_at DESC
LIMIT 10;
