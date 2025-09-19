-- ====================================
-- ADD MISSING COLUMNS TO ONBOARDING_SESSIONS TABLE
-- Run this script in Supabase SQL Console
-- ====================================

-- Add missing columns to onboarding_sessions table
ALTER TABLE public.onboarding_sessions 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.onboarding_session_templates(id),
ADD COLUMN IF NOT EXISTS plugin_id TEXT DEFAULT 'centcom',
ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'onboarding',
ADD COLUMN IF NOT EXISTS session_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 45,
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS prerequisites TEXT[],
ADD COLUMN IF NOT EXISTS objectives TEXT[],
ADD COLUMN IF NOT EXISTS session_materials JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS completion_score INTEGER CHECK (completion_score >= 0 AND completion_score <= 100),
ADD COLUMN IF NOT EXISTS admin_feedback TEXT,
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_session_recommendations TEXT[];

-- Add missing columns to onboarding_progress table if not already there
ALTER TABLE public.onboarding_progress 
ADD COLUMN IF NOT EXISTS plugin_id TEXT DEFAULT 'centcom',
ADD COLUMN IF NOT EXISTS completion_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS overdue_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_until_deadline INTEGER,
ADD COLUMN IF NOT EXISTS trial_pause_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS days_until_deactivation INTEGER;

-- Create the onboarding_requirements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.onboarding_requirements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    license_type TEXT NOT NULL,
    plugin_id TEXT NOT NULL,
    required_sessions INTEGER NOT NULL DEFAULT 1,
    session_duration_minutes INTEGER DEFAULT 45,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(license_type, plugin_id)
);

-- Ensure trial requirements exist
INSERT INTO public.onboarding_requirements (license_type, plugin_id, required_sessions, session_duration_minutes, description, is_active)
VALUES 
    ('trial', 'centcom', 3, 45, 'Trial Centcom onboarding - 3 mandatory sessions', true),
    ('trial', 'APx500', 1, 90, 'Trial APx500 plugin onboarding', true),
    ('trial', 'klippel_qc', 1, 90, 'Trial Klippel QC plugin onboarding', true)
ON CONFLICT (license_type, plugin_id) DO UPDATE SET
    required_sessions = EXCLUDED.required_sessions,
    session_duration_minutes = EXCLUDED.session_duration_minutes,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = NOW();

-- Update session templates to enable auto-creation for centcom sessions (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'onboarding_session_templates') THEN
    UPDATE public.onboarding_session_templates 
    SET auto_create_on_license = true,
        updated_at = NOW()
    WHERE plugin_id = 'centcom' AND is_mandatory = true;
    
    RAISE NOTICE 'Updated session templates for auto-creation';
  ELSE
    RAISE NOTICE 'onboarding_session_templates table does not exist';
  END IF;
END $$;

-- Clean up any existing progress records without plugin_id
UPDATE public.onboarding_progress 
SET plugin_id = 'centcom' 
WHERE plugin_id IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user_id ON public.onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_license_key_id ON public.onboarding_sessions(license_key_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_template_id ON public.onboarding_sessions(template_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status ON public.onboarding_sessions(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON public.onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_license_key_id ON public.onboarding_progress(license_key_id);

-- Show current table structure
SELECT 'onboarding_sessions columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'onboarding_sessions' 
ORDER BY ordinal_position;

SELECT 'onboarding_progress columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'onboarding_progress' 
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Missing columns added to onboarding tables!';
  RAISE NOTICE 'Auto-session creation should now work properly.';
  RAISE NOTICE 'Try assigning a trial license again.';
END $$;
