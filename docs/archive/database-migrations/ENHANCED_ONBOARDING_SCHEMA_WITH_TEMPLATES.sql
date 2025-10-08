-- ====================================
-- ENHANCED ONBOARDING SYSTEM WITH SESSION TEMPLATES
-- Complete setup script for Supabase SQL Console
-- This script creates all necessary tables and data for session templates
-- ====================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure essential tables exist first
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT,
  full_name TEXT,
  company TEXT,
  role TEXT DEFAULT 'engineer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.license_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key_code TEXT NOT NULL UNIQUE,
  license_type TEXT NOT NULL DEFAULT 'trial',
  status TEXT DEFAULT 'active',
  max_users INTEGER DEFAULT 10,
  max_projects INTEGER DEFAULT 50,
  max_storage_gb INTEGER DEFAULT 25,
  features JSONB DEFAULT '[]'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_limit_type TEXT DEFAULT 'trial_30',
  custom_trial_days INTEGER,
  trial_extension_reason TEXT,
  enabled_plugins JSONB DEFAULT '["centcom"]'::jsonb,
  plugin_permissions JSONB DEFAULT '{}'::jsonb,
  allowed_user_types JSONB DEFAULT '["engineer", "operator"]'::jsonb,
  access_level TEXT DEFAULT 'standard',
  restrictions JSONB DEFAULT '{}'::jsonb,
  license_config JSONB DEFAULT '{}'::jsonb,
  usage_stats JSONB DEFAULT '{}'::jsonb
);

-- 1. Session Templates Table
-- Defines reusable templates for onboarding sessions
CREATE TABLE IF NOT EXISTS public.onboarding_session_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Template identification
  template_name TEXT NOT NULL UNIQUE,
  plugin_id TEXT NOT NULL DEFAULT 'centcom',
  session_type TEXT NOT NULL DEFAULT 'standard' CHECK (session_type IN ('initial', 'standard', 'plugin_specific', 'followup')),
  
  -- Session details
  title TEXT NOT NULL,
  description TEXT,
  objectives TEXT[], -- Learning objectives for the session
  prerequisites TEXT[], -- What users should know before this session
  duration_minutes INTEGER DEFAULT 30,
  
  -- Classification
  is_mandatory BOOLEAN DEFAULT true,
  priority_order INTEGER DEFAULT 1, -- Order in which sessions should be scheduled
  
  -- Content and preparation
  agenda JSONB DEFAULT '[]'::jsonb, -- Session agenda items
  preparation_materials JSONB DEFAULT '[]'::jsonb, -- Links, docs, etc.
  success_criteria TEXT, -- How to determine if session was successful
  
  -- Template settings
  auto_create_on_license BOOLEAN DEFAULT false, -- Whether to auto-create when license assigned
  license_types TEXT[] DEFAULT ARRAY['trial'], -- Which license types this applies to
  
  -- Template metadata
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID, -- Removed foreign key reference to avoid RLS issues during insertion
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enhance onboarding_sessions table with template support and additional fields
-- First ensure the base table exists and disable RLS if needed
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  license_key_id UUID,
  plugin_id TEXT NOT NULL DEFAULT 'centcom',
  session_type TEXT NOT NULL DEFAULT 'standard',
  session_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  assigned_admin_id UUID,
  status TEXT NOT NULL DEFAULT 'scheduled',
  completion_status TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  user_feedback TEXT,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create base onboarding tables if they don't exist
CREATE TABLE IF NOT EXISTS public.onboarding_requirements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  license_type TEXT NOT NULL,
  plugin_id TEXT NOT NULL DEFAULT 'centcom',
  required_sessions INTEGER NOT NULL DEFAULT 3,
  session_duration_minutes INTEGER NOT NULL DEFAULT 30,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(license_type, plugin_id)
);

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  license_key_id UUID,
  total_sessions_required INTEGER NOT NULL DEFAULT 3,
  plugin_sessions_required JSONB DEFAULT '{}',
  sessions_completed INTEGER DEFAULT 0,
  plugin_sessions_completed JSONB DEFAULT '{}',
  overall_status TEXT NOT NULL DEFAULT 'pending',
  onboarding_deadline TIMESTAMP WITH TIME ZONE,
  license_active_status BOOLEAN DEFAULT true,
  license_suspended_at TIMESTAMP WITH TIME ZONE,
  license_suspension_reason TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_session_at TIMESTAMP WITH TIME ZONE,
  next_session_due TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, license_key_id)
);

-- Then add the enhanced columns to onboarding_sessions
ALTER TABLE public.onboarding_sessions 
ADD COLUMN IF NOT EXISTS template_id UUID,
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS action_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS session_objectives TEXT[],
ADD COLUMN IF NOT EXISTS objectives_completed TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS session_materials JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS completion_score INTEGER CHECK (completion_score >= 0 AND completion_score <= 100),
ADD COLUMN IF NOT EXISTS admin_feedback TEXT,
ADD COLUMN IF NOT EXISTS next_session_recommendations TEXT;

-- 3. Session Action Items Table
-- Tracks specific action items from onboarding sessions
CREATE TABLE IF NOT EXISTS public.onboarding_action_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Action item details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('technical', 'training', 'documentation', 'followup', 'general')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Assignment and tracking
  assigned_to UUID, -- Who is responsible (user or admin) - removed FK reference
  due_date TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'deferred')),
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Session Completion Records Table
-- Detailed records of session completion with outcomes
CREATE TABLE IF NOT EXISTS public.onboarding_completion_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Completion details
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_actual_minutes INTEGER,
  
  -- Assessment
  objectives_met TEXT[] DEFAULT ARRAY[]::TEXT[],
  objectives_failed TEXT[] DEFAULT ARRAY[]::TEXT[],
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  user_confidence_level INTEGER CHECK (user_confidence_level >= 1 AND user_confidence_level <= 10),
  
  -- Feedback
  user_feedback TEXT,
  admin_notes TEXT,
  technical_issues TEXT,
  suggestions_for_improvement TEXT,
  
  -- Follow-up
  requires_followup BOOLEAN DEFAULT false,
  followup_type TEXT CHECK (followup_type IN ('additional_training', 'technical_support', 'documentation', 'practice_session')),
  followup_scheduled_for TIMESTAMP WITH TIME ZONE,
  
  -- Certification
  is_certified BOOLEAN DEFAULT false,
  certification_level TEXT CHECK (certification_level IN ('basic', 'intermediate', 'advanced')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. License Assignment Automation Log
-- Tracks when sessions are auto-created from license assignments
CREATE TABLE IF NOT EXISTS public.onboarding_automation_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Trigger details
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('license_assigned', 'license_updated', 'manual_trigger')),
  license_key_id UUID REFERENCES public.license_keys(id),
  user_id UUID REFERENCES auth.users(id),
  
  -- Automation results
  sessions_created INTEGER DEFAULT 0,
  session_ids UUID[] DEFAULT ARRAY[]::UUID[],
  templates_used UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Status
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  error_message TEXT,
  
  -- Metadata
  triggered_by UUID, -- Removed FK reference to avoid RLS issues
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_details JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_templates_plugin ON public.onboarding_session_templates(plugin_id);
CREATE INDEX IF NOT EXISTS idx_session_templates_active ON public.onboarding_session_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_session_templates_auto_create ON public.onboarding_session_templates(auto_create_on_license) WHERE auto_create_on_license = true;

CREATE INDEX IF NOT EXISTS idx_sessions_template_id ON public.onboarding_sessions(template_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mandatory ON public.onboarding_sessions(is_mandatory);

CREATE INDEX IF NOT EXISTS idx_action_items_session ON public.onboarding_action_items(session_id);
CREATE INDEX IF NOT EXISTS idx_action_items_user ON public.onboarding_action_items(user_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON public.onboarding_action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_due_date ON public.onboarding_action_items(due_date);

CREATE INDEX IF NOT EXISTS idx_completion_records_session ON public.onboarding_completion_records(session_id);
CREATE INDEX IF NOT EXISTS idx_completion_records_user ON public.onboarding_completion_records(user_id);

CREATE INDEX IF NOT EXISTS idx_automation_log_license ON public.onboarding_automation_log(license_key_id);
CREATE INDEX IF NOT EXISTS idx_automation_log_user ON public.onboarding_automation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_log_triggered_at ON public.onboarding_automation_log(triggered_at);

-- Prepare for data insertion by creating temporary permissive policies
-- First, ensure RLS is enabled but with permissive policies for data insertion

-- Drop any existing policies
DROP POLICY IF EXISTS "Everyone can view onboarding requirements" ON public.onboarding_requirements;
DROP POLICY IF EXISTS "Admin users can manage onboarding requirements" ON public.onboarding_requirements;
DROP POLICY IF EXISTS "Users can view their own onboarding sessions" ON public.onboarding_sessions;
DROP POLICY IF EXISTS "Admin users can manage onboarding sessions" ON public.onboarding_sessions;
DROP POLICY IF EXISTS "Users can view their own onboarding progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "Admin users can manage onboarding progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "Everyone can view active session templates" ON public.onboarding_session_templates;
DROP POLICY IF EXISTS "Admin users can manage session templates" ON public.onboarding_session_templates;
DROP POLICY IF EXISTS "Users can view their own action items" ON public.onboarding_action_items;
DROP POLICY IF EXISTS "Admin users can manage action items" ON public.onboarding_action_items;
DROP POLICY IF EXISTS "Users can view their own completion records" ON public.onboarding_completion_records;
DROP POLICY IF EXISTS "Admin users can manage completion records" ON public.onboarding_completion_records;
DROP POLICY IF EXISTS "Admin users can view automation log" ON public.onboarding_automation_log;
DROP POLICY IF EXISTS "Admin users can manage automation log" ON public.onboarding_automation_log;

-- Disable RLS completely for data insertion
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_session_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_requirements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_action_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_completion_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_automation_log DISABLE ROW LEVEL SECURITY;

-- Insert Session Templates
-- 3 templates for Centcom main application
INSERT INTO public.onboarding_session_templates (
  template_name,
  plugin_id,
  session_type,
  title,
  description,
  objectives,
  prerequisites,
  duration_minutes,
  is_mandatory,
  priority_order,
  agenda,
  preparation_materials,
  success_criteria,
  auto_create_on_license,
  license_types,
  is_active
) VALUES
-- Centcom Session 1: Platform Introduction
(
  'centcom_intro',
  'centcom',
  'initial',
  'Centcom Platform Introduction',
  'Initial onboarding session covering platform overview, basic navigation, and account setup.',
  ARRAY['Understand Centcom platform purpose and capabilities', 'Navigate the main interface', 'Complete basic account configuration', 'Identify key features and workflows'],
  ARRAY['Valid Centcom license', 'Computer with internet access', 'Basic computer literacy'],
  45,
  true,
  1,
  '[
    {"item": "Welcome and introductions", "duration": 5},
    {"item": "Platform overview and value proposition", "duration": 10},
    {"item": "Interface walkthrough", "duration": 15},
    {"item": "Account setup and preferences", "duration": 10},
    {"item": "Q&A and next steps", "duration": 5}
  ]'::jsonb,
  '[
    {"type": "document", "title": "Centcom User Guide", "url": "/docs/user-guide"},
    {"type": "video", "title": "Platform Overview Video", "url": "/videos/intro"},
    {"type": "checklist", "title": "Pre-session Setup", "items": ["Check system requirements", "Have license key ready"]}
  ]'::jsonb,
  'User can successfully log in, navigate main sections, and identify primary workflows',
  true,
  ARRAY['trial', 'standard', 'professional'],
  true
),

-- Centcom Session 2: Core Workflows
(
  'centcom_workflows',
  'centcom',
  'standard',
  'Core Workflows and Features',
  'Deep dive into primary Centcom workflows including project management, data analysis, and reporting.',
  ARRAY['Create and manage projects', 'Understand data import/export', 'Generate basic reports', 'Use collaboration features'],
  ARRAY['Completion of Platform Introduction session', 'Basic understanding of Centcom interface'],
  60,
  true,
  2,
  '[
    {"item": "Review of previous session", "duration": 5},
    {"item": "Project creation and management", "duration": 20},
    {"item": "Data workflows demonstration", "duration": 20},
    {"item": "Basic reporting and exports", "duration": 10},
    {"item": "Practice exercises and Q&A", "duration": 5}
  ]'::jsonb,
  '[
    {"type": "document", "title": "Workflow Guide", "url": "/docs/workflows"},
    {"type": "sample_data", "title": "Practice Dataset", "url": "/samples/data"},
    {"type": "template", "title": "Project Templates", "url": "/templates/projects"}
  ]'::jsonb,
  'User can independently create a project, import data, and generate a basic report',
  true,
  ARRAY['trial', 'standard', 'professional'],
  true
),

-- Centcom Session 3: Advanced Features and Best Practices
(
  'centcom_advanced',
  'centcom',
  'standard',
  'Advanced Features and Best Practices',
  'Advanced Centcom features, optimization techniques, and industry best practices for maximum productivity.',
  ARRAY['Configure advanced settings', 'Optimize workflows for efficiency', 'Implement best practices', 'Plan long-term usage strategy'],
  ARRAY['Completion of Core Workflows session', 'Hands-on experience with basic features'],
  60,
  false, -- Optional session
  3,
  '[
    {"item": "Advanced configuration options", "duration": 15},
    {"item": "Workflow optimization techniques", "duration": 20},
    {"item": "Integration possibilities", "duration": 15},
    {"item": "Best practices and tips", "duration": 10}
  ]'::jsonb,
  '[
    {"type": "document", "title": "Advanced User Guide", "url": "/docs/advanced"},
    {"type": "video", "title": "Optimization Tips", "url": "/videos/optimization"},
    {"type": "checklist", "title": "Best Practices Checklist", "url": "/docs/best-practices"}
  ]'::jsonb,
  'User can configure advanced settings and demonstrate optimized workflows',
  true,
  ARRAY['trial', 'standard', 'professional'],
  true
),

-- APx500 Plugin Session
(
  'apx500_intro',
  'APx500',
  'plugin_specific',
  'APx500 Audio Analyzer Integration',
  'Comprehensive training on APx500 plugin installation, configuration, and usage within Centcom.',
  ARRAY['Install and configure APx500 plugin', 'Connect to APx500 hardware', 'Run basic audio measurements', 'Generate APx500 reports in Centcom'],
  ARRAY['Active Centcom license with APx500 plugin', 'APx500 hardware available', 'Completion of Centcom core sessions'],
  90,
  true,
  1,
  '[
    {"item": "APx500 plugin overview", "duration": 10},
    {"item": "Hardware connection and setup", "duration": 20},
    {"item": "Basic measurement procedures", "duration": 30},
    {"item": "Data integration with Centcom", "duration": 20},
    {"item": "Troubleshooting and Q&A", "duration": 10}
  ]'::jsonb,
  '[
    {"type": "document", "title": "APx500 Integration Guide", "url": "/docs/apx500"},
    {"type": "video", "title": "Hardware Setup", "url": "/videos/apx500-setup"},
    {"type": "software", "title": "APx500 Plugin Download", "url": "/downloads/apx500-plugin"}
  ]'::jsonb,
  'User can successfully run APx500 measurements and integrate results into Centcom workflows',
  false, -- Only auto-create if license includes APx500
  ARRAY['trial', 'standard', 'professional'],
  true
),

-- Klippel QC Plugin Session
(
  'klippel_qc_intro',
  'klippel_qc',
  'plugin_specific',
  'Klippel QC Integration and Quality Control',
  'Training on Klippel QC plugin for quality control measurements and integration with Centcom workflows.',
  ARRAY['Install and configure Klippel QC plugin', 'Set up quality control procedures', 'Run QC measurements', 'Integrate QC data with production workflows'],
  ARRAY['Active Centcom license with Klippel QC plugin', 'Klippel hardware available', 'Completion of Centcom core sessions'],
  90,
  true,
  1,
  '[
    {"item": "Klippel QC plugin overview", "duration": 10},
    {"item": "Quality control setup", "duration": 25},
    {"item": "Measurement procedures", "duration": 30},
    {"item": "Production workflow integration", "duration": 20},
    {"item": "Best practices and Q&A", "duration": 5}
  ]'::jsonb,
  '[
    {"type": "document", "title": "Klippel QC Guide", "url": "/docs/klippel-qc"},
    {"type": "video", "title": "QC Setup Procedures", "url": "/videos/klippel-setup"},
    {"type": "template", "title": "QC Workflow Templates", "url": "/templates/qc-workflows"}
  ]'::jsonb,
  'User can set up QC procedures and integrate measurements into production workflows',
  false, -- Only auto-create if license includes Klippel QC
  ARRAY['trial', 'standard', 'professional'],
  true
)
ON CONFLICT (template_name) DO UPDATE SET
  updated_at = NOW(),
  is_active = EXCLUDED.is_active;

-- Update existing onboarding requirements to match new plugin names
UPDATE public.onboarding_requirements 
SET plugin_id = 'APx500' 
WHERE plugin_id = 'analytics';

UPDATE public.onboarding_requirements 
SET plugin_id = 'klippel_qc' 
WHERE plugin_id = 'reporting';

-- Insert new requirements for our specific plugins
INSERT INTO public.onboarding_requirements (license_type, plugin_id, required_sessions, session_duration_minutes, description) VALUES
  ('trial', 'APx500', 1, 90, 'APx500 plugin integration training'),
  ('trial', 'klippel_qc', 1, 90, 'Klippel QC plugin integration training'),
  ('standard', 'centcom', 3, 45, 'Standard Centcom onboarding sessions'),
  ('standard', 'APx500', 1, 90, 'APx500 plugin integration training'),
  ('standard', 'klippel_qc', 1, 90, 'Klippel QC plugin integration training'),
  ('professional', 'centcom', 3, 45, 'Professional Centcom onboarding sessions'),
  ('professional', 'APx500', 1, 90, 'APx500 plugin integration training'),
  ('professional', 'klippel_qc', 1, 90, 'Klippel QC plugin integration training')
ON CONFLICT (license_type, plugin_id) DO UPDATE SET
  required_sessions = EXCLUDED.required_sessions,
  session_duration_minutes = EXCLUDED.session_duration_minutes,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Set up Row Level Security AFTER all data insertion
-- Re-enable Row Level Security on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_session_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_completion_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_automation_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Onboarding Requirements
CREATE POLICY "Everyone can view onboarding requirements" ON public.onboarding_requirements
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin users can manage onboarding requirements" ON public.onboarding_requirements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

-- RLS Policies for Onboarding Sessions
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

CREATE POLICY "Admin users can manage onboarding sessions" ON public.onboarding_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

-- RLS Policies for Onboarding Progress
CREATE POLICY "Users can view their own onboarding progress" ON public.onboarding_progress
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admin users can manage onboarding progress" ON public.onboarding_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

-- RLS Policies for Session Templates
CREATE POLICY "Everyone can view active session templates" ON public.onboarding_session_templates
  FOR SELECT USING (is_active = true AND auth.role() = 'authenticated');

CREATE POLICY "Admin users can manage session templates" ON public.onboarding_session_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

-- RLS Policies for Action Items
CREATE POLICY "Users can view their own action items" ON public.onboarding_action_items
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admin users can manage action items" ON public.onboarding_action_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

-- RLS Policies for Completion Records
CREATE POLICY "Users can view their own completion records" ON public.onboarding_completion_records
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admin users can manage completion records" ON public.onboarding_completion_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

-- RLS Policies for Automation Log
CREATE POLICY "Admin users can view automation log" ON public.onboarding_automation_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admin users can manage automation log" ON public.onboarding_automation_log
  FOR INSERT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'superadmin')
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'ENHANCED ONBOARDING SYSTEM WITH TEMPLATES SETUP COMPLETE!';
  RAISE NOTICE 'New tables created: onboarding_session_templates, onboarding_action_items, onboarding_completion_records, onboarding_automation_log';
  RAISE NOTICE 'Enhanced onboarding_sessions table with template support';
  RAISE NOTICE 'Session templates created:';
  RAISE NOTICE '   - 3 Centcom sessions: Introduction, Core Workflows, Advanced Features';
  RAISE NOTICE '   - 1 APx500 plugin session';
  RAISE NOTICE '   - 1 Klippel QC plugin session';
  RAISE NOTICE 'Automation support enabled for license assignment triggers';
  RAISE NOTICE 'Action items and completion tracking added';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready for session creation automation and enhanced tracking!';
END $$;
