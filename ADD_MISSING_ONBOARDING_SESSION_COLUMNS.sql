-- Add missing columns to onboarding_sessions table
-- Run this in Supabase SQL Editor

-- Check current schema
DO $$
BEGIN
  RAISE NOTICE '🔍 Checking onboarding_sessions table schema...';
END $$;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'onboarding_sessions'
ORDER BY ordinal_position;

-- Add assigned_admin_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'onboarding_sessions'
    AND column_name = 'assigned_admin_id'
  ) THEN
    ALTER TABLE public.onboarding_sessions
    ADD COLUMN assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    RAISE NOTICE '✅ Added assigned_admin_id column';
  ELSE
    RAISE NOTICE '⚠️  assigned_admin_id column already exists';
  END IF;
END $$;

-- Add session_number column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'onboarding_sessions'
    AND column_name = 'session_number'
  ) THEN
    ALTER TABLE public.onboarding_sessions
    ADD COLUMN session_number INTEGER DEFAULT 1;

    RAISE NOTICE '✅ Added session_number column';
  ELSE
    RAISE NOTICE '⚠️  session_number column already exists';
  END IF;
END $$;

-- Add started_at column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'onboarding_sessions'
    AND column_name = 'started_at'
  ) THEN
    ALTER TABLE public.onboarding_sessions
    ADD COLUMN started_at TIMESTAMPTZ;

    RAISE NOTICE '✅ Added started_at column';
  ELSE
    RAISE NOTICE '⚠️  started_at column already exists';
  END IF;
END $$;

-- Add completed_at column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'onboarding_sessions'
    AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.onboarding_sessions
    ADD COLUMN completed_at TIMESTAMPTZ;

    RAISE NOTICE '✅ Added completed_at column';
  ELSE
    RAISE NOTICE '⚠️  completed_at column already exists';
  END IF;
END $$;

-- Add completion_status column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'onboarding_sessions'
    AND column_name = 'completion_status'
  ) THEN
    ALTER TABLE public.onboarding_sessions
    ADD COLUMN completion_status TEXT CHECK (completion_status IN ('passed', 'failed', 'needs_followup'));

    RAISE NOTICE '✅ Added completion_status column';
  ELSE
    RAISE NOTICE '⚠️  completion_status column already exists';
  END IF;
END $$;

-- Add reminder_sent_at column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'onboarding_sessions'
    AND column_name = 'reminder_sent_at'
  ) THEN
    ALTER TABLE public.onboarding_sessions
    ADD COLUMN reminder_sent_at TIMESTAMPTZ;

    RAISE NOTICE '✅ Added reminder_sent_at column';
  ELSE
    RAISE NOTICE '⚠️  reminder_sent_at column already exists';
  END IF;
END $$;

-- Add reminder_count column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'onboarding_sessions'
    AND column_name = 'reminder_count'
  ) THEN
    ALTER TABLE public.onboarding_sessions
    ADD COLUMN reminder_count INTEGER DEFAULT 0;

    RAISE NOTICE '✅ Added reminder_count column';
  ELSE
    RAISE NOTICE '⚠️  reminder_count column already exists';
  END IF;
END $$;

-- Add is_mandatory column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'onboarding_sessions'
    AND column_name = 'is_mandatory'
  ) THEN
    ALTER TABLE public.onboarding_sessions
    ADD COLUMN is_mandatory BOOLEAN DEFAULT FALSE;

    RAISE NOTICE '✅ Added is_mandatory column';
  ELSE
    RAISE NOTICE '⚠️  is_mandatory column already exists';
  END IF;
END $$;

-- Add meeting_link column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'onboarding_sessions'
    AND column_name = 'meeting_link'
  ) THEN
    ALTER TABLE public.onboarding_sessions
    ADD COLUMN meeting_link TEXT;

    RAISE NOTICE '✅ Added meeting_link column';
  ELSE
    RAISE NOTICE '⚠️  meeting_link column already exists';
  END IF;
END $$;

-- Verify all columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'onboarding_sessions'
ORDER BY ordinal_position;

-- Success message
SELECT '✅ Migration complete! All missing columns have been added to onboarding_sessions table.' AS status;
