-- Test the check_local_cluster_allowed function directly

-- First, verify the function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'check_local_cluster_allowed';

-- Test the function with your user ID
SELECT * FROM check_local_cluster_allowed('2c3d4747-8d67-45af-90f5-b5e9058ec246');

-- If the above fails, let's see what's in the license_keys table
SELECT 
  id,
  key_code,
  allows_local_cluster,
  assigned_to,
  status
FROM license_keys
WHERE assigned_to = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
  AND status = 'active';

