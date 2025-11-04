-- Diagnostic script to check RLS status and policies on user_profiles

-- 1. Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'user_profiles';

-- 2. Check existing policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- 3. Test query as authenticated user (this simulates what your app is doing)
-- Replace 'YOUR_USER_ID' with actual user ID: 2c3d4747-8d67-45af-90f5-b5e9058ec246
SELECT * FROM user_profiles WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';
