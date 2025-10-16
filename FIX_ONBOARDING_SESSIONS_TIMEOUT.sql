-- Fix: Onboarding Sessions Query Timeout
-- This script adds indices and optimizes RLS policies to fix the 5-second timeout

-- ========================================
-- STEP 1: Add Performance Indices
-- ========================================

-- Index on user_id for RLS filtering (most important)
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user_id
ON public.onboarding_sessions(user_id)
WHERE user_id IS NOT NULL;

-- Composite index for the common query pattern (status + scheduled_at)
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status_scheduled
ON public.onboarding_sessions(user_id, status, scheduled_at)
WHERE status IN ('scheduled', 'pending', 'rescheduled');

-- Index on license_key_id if it's used in RLS policies
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_license_key
ON public.onboarding_sessions(license_key_id)
WHERE license_key_id IS NOT NULL;

-- Index on created_at for general performance
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_created_at
ON public.onboarding_sessions(created_at DESC);

-- ========================================
-- STEP 2: Check Current RLS Policies
-- ========================================

-- View current policies
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
WHERE tablename = 'onboarding_sessions';

-- ========================================
-- STEP 3: Optimize RLS Policy (if needed)
-- ========================================

-- Drop existing complex policy if it exists
DROP POLICY IF EXISTS "Users can view their own onboarding sessions" ON public.onboarding_sessions;
DROP POLICY IF EXISTS "Users can read their own sessions" ON public.onboarding_sessions;
DROP POLICY IF EXISTS "Enable read access for own sessions" ON public.onboarding_sessions;

-- Create a simple, performant RLS policy
CREATE POLICY "Users can view their own onboarding sessions"
ON public.onboarding_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow service role to bypass RLS
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 4: Create Policy for Inserts/Updates
-- ========================================

-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.onboarding_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.onboarding_sessions;

-- Allow users to create their own sessions
CREATE POLICY "Users can create their own sessions"
ON public.onboarding_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own sessions
CREATE POLICY "Users can update their own sessions"
ON public.onboarding_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- STEP 5: Verify Performance
-- ========================================

-- Test query performance with EXPLAIN ANALYZE
-- Replace 'YOUR-USER-UUID' with an actual user ID
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get a sample user ID
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;

  RAISE NOTICE 'Testing query performance for user: %', test_user_id;

  -- This would normally show EXPLAIN ANALYZE output
  -- Run this separately in SQL editor:
  -- EXPLAIN ANALYZE
  -- SELECT *
  -- FROM public.onboarding_sessions
  -- WHERE user_id = 'test_user_id'
  --   AND status IN ('scheduled', 'pending', 'rescheduled')
  -- ORDER BY scheduled_at ASC;
END $$;

-- ========================================
-- STEP 6: Verify Indices Were Created
-- ========================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'onboarding_sessions'
ORDER BY indexname;

-- ========================================
-- STEP 7: Check Table Statistics
-- ========================================

SELECT
  schemaname,
  relname as tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE relname = 'onboarding_sessions';

-- ========================================
-- STEP 8: Analyze Table (Update Statistics)
-- ========================================

ANALYZE public.onboarding_sessions;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- 1. Count sessions by status
SELECT
  status,
  COUNT(*) as count
FROM public.onboarding_sessions
GROUP BY status
ORDER BY count DESC;

-- 2. Check for orphaned sessions (sessions without users)
SELECT COUNT(*) as orphaned_sessions
FROM public.onboarding_sessions os
LEFT JOIN auth.users u ON os.user_id = u.id
WHERE u.id IS NULL;

-- 3. Check average query time (run this after the fix)
-- You can monitor this in Supabase dashboard under "Database > Performance"

COMMIT;
