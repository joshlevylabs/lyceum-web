-- ====================================
-- LYCEUM ONBOARDING SYSTEM SETUP
-- Run this script in Supabase SQL Console
-- ====================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Onboarding Session Requirements
-- Defines the requirements for each license type and plugin combination
CREATE TABLE IF NOT EXISTS public.onboarding_requirements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  license_type TEXT NOT NULL CHECK (license_type IN ('trial', 'standard', 'professional', 'enterprise')),
  plugin_id TEXT NOT NULL DEFAULT 'centcom',
  required_sessions INTEGER NOT NULL DEFAULT 3,
  session_duration_minutes INTEGER NOT NULL DEFAULT 30,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(license_type, plugin_id)
);

-- 2. User Onboarding Sessions
-- Tracks individual onboarding sessions for users
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE,
  license_key_id UUID REFERENCES public.license_keys(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL DEFAULT 'centcom',
  
  -- Session details
  session_type TEXT NOT NULL DEFAULT 'standard' CHECK (session_type IN ('initial', 'standard', 'plugin_specific', 'followup')),
  session_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  assigned_admin_id UUID REFERENCES public.user_profiles(id),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  completion_status TEXT CHECK (completion_status IN ('passed', 'failed', 'needs_followup')),
  
  -- Session outcomes
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT, -- Admin notes about the session
  user_feedback TEXT, -- User feedback after session
  
  -- Reminder tracking  
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. User Onboarding Progress
-- Tracks overall onboarding progress for each user/license combination
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE,
  license_key_id UUID REFERENCES public.license_keys(id) ON DELETE CASCADE,
  
  -- Requirements
  total_sessions_required INTEGER NOT NULL DEFAULT 3,
  plugin_sessions_required JSONB DEFAULT '{}', -- {plugin_id: session_count}
  
  -- Progress tracking
  sessions_completed INTEGER DEFAULT 0,
  plugin_sessions_completed JSONB DEFAULT '{}', -- {plugin_id: completed_count}
  
  -- Status
  overall_status TEXT NOT NULL DEFAULT 'pending' CHECK (overall_status IN ('pending', 'in_progress', 'completed', 'overdue', 'suspended')),
  onboarding_deadline TIMESTAMP WITH TIME ZONE, -- When onboarding must be completed to keep license active
  
  -- Compliance tracking
  license_active_status BOOLEAN DEFAULT true,
  license_suspended_at TIMESTAMP WITH TIME ZONE,
  license_suspension_reason TEXT,
  
  -- Important dates
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_session_at TIMESTAMP WITH TIME ZONE,
  next_session_due TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, license_id),
  UNIQUE(user_id, license_key_id)
);

-- 4. Onboarding Reminders
-- Manages reminder scheduling and delivery
CREATE TABLE IF NOT EXISTS public.onboarding_reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  progress_id UUID REFERENCES public.onboarding_progress(id) ON DELETE CASCADE,
  
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('session_scheduled', 'session_due', 'session_overdue', 'license_at_risk', 'license_suspended')),
  reminder_method TEXT NOT NULL DEFAULT 'email' CHECK (reminder_method IN ('email', 'sms', 'in_app', 'webhook')),
  
  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Content
  subject TEXT,
  message TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user_id ON public.onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status ON public.onboarding_sessions(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_scheduled_at ON public.onboarding_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_assigned_admin ON public.onboarding_sessions(assigned_admin_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON public.onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_status ON public.onboarding_progress(overall_status);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_deadline ON public.onboarding_progress(onboarding_deadline);

CREATE INDEX IF NOT EXISTS idx_onboarding_reminders_scheduled ON public.onboarding_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_onboarding_reminders_status ON public.onboarding_reminders(status);

-- Insert default onboarding requirements
INSERT INTO public.onboarding_requirements (license_type, plugin_id, required_sessions, session_duration_minutes, description) VALUES
  ('trial', 'centcom', 3, 30, 'Base onboarding sessions required for Centcom trial license'),
  ('trial', 'analytics', 1, 30, 'Additional session required for Analytics plugin'),
  ('trial', 'reporting', 1, 30, 'Additional session required for Reporting plugin'),
  ('trial', 'dashboard', 1, 30, 'Additional session required for Dashboard plugin'),
  ('trial', 'integrations', 1, 30, 'Additional session required for Integrations plugin')
ON CONFLICT (license_type, plugin_id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.onboarding_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Onboarding Requirements (readable by all authenticated users, manageable by admins)
DROP POLICY IF EXISTS "Everyone can view onboarding requirements" ON public.onboarding_requirements;
CREATE POLICY "Everyone can view onboarding requirements" ON public.onboarding_requirements
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin users can manage onboarding requirements" ON public.onboarding_requirements;
CREATE POLICY "Admin users can manage onboarding requirements" ON public.onboarding_requirements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

-- Onboarding Sessions (users can view their own, admins can manage all)
DROP POLICY IF EXISTS "Users can view their own onboarding sessions" ON public.onboarding_sessions;
CREATE POLICY "Users can view their own onboarding sessions" ON public.onboarding_sessions
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = assigned_admin_id OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admin users can manage onboarding sessions" ON public.onboarding_sessions;
CREATE POLICY "Admin users can manage onboarding sessions" ON public.onboarding_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

-- Onboarding Progress (users can view their own, admins can manage all)
DROP POLICY IF EXISTS "Users can view their own onboarding progress" ON public.onboarding_progress;
CREATE POLICY "Users can view their own onboarding progress" ON public.onboarding_progress
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admin users can manage onboarding progress" ON public.onboarding_progress;
CREATE POLICY "Admin users can manage onboarding progress" ON public.onboarding_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

-- Onboarding Reminders (users can view their own, admins can manage all)  
DROP POLICY IF EXISTS "Users can view their own onboarding reminders" ON public.onboarding_reminders;
CREATE POLICY "Users can view their own onboarding reminders" ON public.onboarding_reminders
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admin users can manage onboarding reminders" ON public.onboarding_reminders;
CREATE POLICY "Admin users can manage onboarding reminders" ON public.onboarding_reminders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

-- Create some sample data for testing
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) 
VALUES (
  'd0000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'trial-user-1@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Add user profiles for test users
INSERT INTO public.user_profiles (id, email, username, full_name, company, role, created_at, updated_at, is_active) VALUES
(
  'd0000000-0000-0000-0000-000000000001',
  'trial-user-1@example.com',
  'trial-user-1',
  'Trial User One',
  'Test Company A',
  'engineer',
  NOW(),
  NOW(),
  true
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Add sample trial license
INSERT INTO public.license_keys (
  id,
  key_code,
  license_type,
  status,
  max_users,
  max_projects,
  max_storage_gb,
  features,
  enabled_plugins,
  expires_at,
  assigned_to,
  created_at,
  updated_at
) VALUES
(
  'e0000000-0000-0000-0000-000000000001',
  'TRIAL-CENTCOM-' || substr(md5(random()::text), 1, 8),
  'trial',
  'active',
  2,
  5,
  10,
  ARRAY['basic_access', 'trial_features'],
  ARRAY['centcom', 'analytics'],
  NOW() + INTERVAL '30 days',
  'd0000000-0000-0000-0000-000000000001',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = NOW();

-- Create sample onboarding progress
INSERT INTO public.onboarding_progress (
  user_id,
  license_key_id,
  total_sessions_required,
  plugin_sessions_required,
  sessions_completed,
  plugin_sessions_completed,
  overall_status,
  onboarding_deadline,
  license_active_status,
  started_at,
  updated_at
) VALUES
(
  'd0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  4, -- 3 base + 1 for analytics
  '{"analytics": 1}'::jsonb,
  1, -- Completed 1 session
  '{"analytics": 0}'::jsonb,
  'in_progress',
  NOW() + INTERVAL '25 days',
  true,
  NOW() - INTERVAL '5 days',
  NOW()
) ON CONFLICT (user_id, license_key_id) DO UPDATE SET
  overall_status = EXCLUDED.overall_status,
  updated_at = NOW();

-- Create sample onboarding session
INSERT INTO public.onboarding_sessions (
  user_id,
  license_key_id,
  plugin_id,
  session_type,
  session_number,
  title,
  description,
  duration_minutes,
  scheduled_at,
  status,
  completed_at,
  notes,
  created_at,
  updated_at
) VALUES
(
  'd0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  'centcom',
  'initial',
  1,
  'Centcom Onboarding Session 1',
  'Initial introduction and setup for Centcom platform',
  30,
  NOW() - INTERVAL '3 days',
  'completed',
  NOW() - INTERVAL '3 days' + INTERVAL '35 minutes',
  'User successfully completed initial onboarding. Good understanding of basic features.',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '3 days'
) ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Onboarding system tables created successfully!';
  RAISE NOTICE 'Tables created: onboarding_requirements, onboarding_sessions, onboarding_progress, onboarding_reminders';
  RAISE NOTICE 'Sample data added for testing';
  RAISE NOTICE 'You can now access the onboarding admin portal at /admin/onboarding';
END $$;
