-- Diagnose Signup Issue
-- Run this in Supabase SQL Editor to check the current state

-- Check 1: Verify user_profiles table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check 2: Check for constraints on company column
SELECT
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'user_profiles'
  AND (tc.constraint_type = 'CHECK' OR cc.check_clause LIKE '%company%');

-- Check 3: Verify trigger exists
SELECT
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';

-- Check 4: View the trigger function code
SELECT
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_user_profile';

-- Check 5: Test what would happen with sample user_metadata
-- This shows what the trigger would extract from typical signup data
SELECT
  'test@example.com'::text as email,
  COALESCE(
    '{"user_name": "testuser", "full_name": "Test User", "company": "Test Corp", "role": "engineer"}'::jsonb->>'user_name',
    split_part('test@example.com', '@', 1)
  ) as extracted_username,
  COALESCE(
    '{"user_name": "testuser", "full_name": "Test User", "company": "Test Corp", "role": "engineer"}'::jsonb->>'full_name',
    split_part('test@example.com', '@', 1)
  ) as extracted_full_name,
  COALESCE(
    '{"user_name": "testuser", "full_name": "Test User", "company": "Test Corp", "role": "engineer"}'::jsonb->>'company',
    ''
  ) as extracted_company,
  COALESCE(
    '{"user_name": "testuser", "full_name": "Test User", "company": "Test Corp", "role": "engineer"}'::jsonb->>'role',
    'engineer'
  ) as extracted_role;

-- Check 6: Recent auth errors (if any)
-- Note: This table might not exist in all setups
SELECT
  created_at,
  message,
  error_code
FROM auth.audit_log_entries
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND message LIKE '%error%'
ORDER BY created_at DESC
LIMIT 10;
