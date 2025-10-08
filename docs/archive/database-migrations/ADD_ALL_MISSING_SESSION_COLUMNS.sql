-- Add all missing columns to onboarding_sessions table for full functionality
-- Run this script in Supabase SQL Editor to enable all session features

DO $$ 
BEGIN 
    -- Add meeting_link column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_sessions' 
        AND column_name = 'meeting_link'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.onboarding_sessions 
        ADD COLUMN meeting_link TEXT;
        
        RAISE NOTICE 'Added meeting_link column to onboarding_sessions';
    ELSE
        RAISE NOTICE 'meeting_link column already exists';
    END IF;

    -- Add session_notes column if it doesn't exist  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_sessions' 
        AND column_name = 'session_notes'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.onboarding_sessions 
        ADD COLUMN session_notes TEXT;
        
        RAISE NOTICE 'Added session_notes column to onboarding_sessions';
    ELSE
        RAISE NOTICE 'session_notes column already exists';
    END IF;

    -- Add completed_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_sessions' 
        AND column_name = 'completed_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.onboarding_sessions 
        ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Added completed_at column to onboarding_sessions';
    ELSE
        RAISE NOTICE 'completed_at column already exists';
    END IF;

    -- Add started_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_sessions' 
        AND column_name = 'started_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.onboarding_sessions 
        ADD COLUMN started_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Added started_at column to onboarding_sessions';
    ELSE
        RAISE NOTICE 'started_at column already exists';
    END IF;

    -- Add session_objectives column if it doesn't exist (CRITICAL FOR SESSION CREATION)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_sessions' 
        AND column_name = 'session_objectives'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.onboarding_sessions 
        ADD COLUMN session_objectives TEXT[];
        
        RAISE NOTICE 'Added session_objectives column to onboarding_sessions';
    ELSE
        RAISE NOTICE 'session_objectives column already exists';
    END IF;

    -- Add session_materials column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_sessions' 
        AND column_name = 'session_materials'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.onboarding_sessions 
        ADD COLUMN session_materials JSONB DEFAULT '[]'::jsonb;
        
        RAISE NOTICE 'Added session_materials column to onboarding_sessions';
    ELSE
        RAISE NOTICE 'session_materials column already exists';
    END IF;

    -- Add objectives_completed column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_sessions' 
        AND column_name = 'objectives_completed'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.onboarding_sessions 
        ADD COLUMN objectives_completed TEXT[];
        
        RAISE NOTICE 'Added objectives_completed column to onboarding_sessions';
    ELSE
        RAISE NOTICE 'objectives_completed column already exists';
    END IF;

    -- Add follow_up_required column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_sessions' 
        AND column_name = 'follow_up_required'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.onboarding_sessions 
        ADD COLUMN follow_up_required BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Added follow_up_required column to onboarding_sessions';
    ELSE
        RAISE NOTICE 'follow_up_required column already exists';
    END IF;

    -- Add follow_up_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_sessions' 
        AND column_name = 'follow_up_date'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.onboarding_sessions 
        ADD COLUMN follow_up_date TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Added follow_up_date column to onboarding_sessions';
    ELSE
        RAISE NOTICE 'follow_up_date column already exists';
    END IF;

    -- Add completion_score column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_sessions' 
        AND column_name = 'completion_score'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.onboarding_sessions 
        ADD COLUMN completion_score INTEGER CHECK (completion_score >= 0 AND completion_score <= 100);
        
        RAISE NOTICE 'Added completion_score column to onboarding_sessions';
    ELSE
        RAISE NOTICE 'completion_score column already exists';
    END IF;

    -- Add admin_feedback column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_sessions' 
        AND column_name = 'admin_feedback'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.onboarding_sessions 
        ADD COLUMN admin_feedback TEXT;
        
        RAISE NOTICE 'Added admin_feedback column to onboarding_sessions';
    ELSE
        RAISE NOTICE 'admin_feedback column already exists';
    END IF;

    -- Add next_session_recommendations column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_sessions' 
        AND column_name = 'next_session_recommendations'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.onboarding_sessions 
        ADD COLUMN next_session_recommendations TEXT;
        
        RAISE NOTICE 'Added next_session_recommendations column to onboarding_sessions';
    ELSE
        RAISE NOTICE 'next_session_recommendations column already exists';
    END IF;

    -- Add notes column alias if it doesn't exist (for legacy compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_sessions' 
        AND column_name = 'notes'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.onboarding_sessions 
        ADD COLUMN notes TEXT;
        
        RAISE NOTICE 'Added notes column to onboarding_sessions';
    ELSE
        RAISE NOTICE 'notes column already exists';
    END IF;

    -- Add assigned_admin_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_sessions' 
        AND column_name = 'assigned_admin_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.onboarding_sessions 
        ADD COLUMN assigned_admin_id UUID REFERENCES auth.users(id);
        
        RAISE NOTICE 'Added assigned_admin_id column to onboarding_sessions';
    ELSE
        RAISE NOTICE 'assigned_admin_id column already exists';
    END IF;

END $$;

-- Show the current structure of onboarding_sessions table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'onboarding_sessions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show a confirmation message
SELECT 'All missing columns have been added to onboarding_sessions table. Session creation should now work properly.' as status;
