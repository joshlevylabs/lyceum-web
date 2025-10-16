-- Debug script: Check for existing tables and schema conflicts
-- Run this to see what's already in your database

-- 1. Check if these tables already exist
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_sessions',
    'session_activity',
    'data_clusters',
    'projects',
    'measurements',
    'user_storage'
  )
ORDER BY table_name;

-- 2. If user_sessions exists, show its columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_sessions'
ORDER BY ordinal_position;

-- 3. Check for any RLS policies on existing tables
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
WHERE tablename IN (
  'user_sessions',
  'session_activity',
  'data_clusters',
  'projects',
  'measurements',
  'user_storage'
)
ORDER BY tablename, policyname;

-- 4. Check if projects table already exists with different structure
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'projects'
ORDER BY ordinal_position;
