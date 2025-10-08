-- ====================================
-- MINIMAL SESSION TEMPLATES SETUP
-- Simple script that just creates templates without RLS issues
-- ====================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the session templates table (completely standalone)
CREATE TABLE IF NOT EXISTS public.onboarding_session_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_name TEXT NOT NULL UNIQUE,
  plugin_id TEXT NOT NULL DEFAULT 'centcom',
  session_type TEXT NOT NULL DEFAULT 'standard',
  title TEXT NOT NULL,
  description TEXT,
  objectives TEXT[],
  prerequisites TEXT[],
  duration_minutes INTEGER DEFAULT 30,
  is_mandatory BOOLEAN DEFAULT true,
  priority_order INTEGER DEFAULT 1,
  agenda JSONB DEFAULT '[]'::jsonb,
  preparation_materials JSONB DEFAULT '[]'::jsonb,
  success_criteria TEXT,
  auto_create_on_license BOOLEAN DEFAULT false,
  license_types TEXT[] DEFAULT ARRAY['trial'],
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS completely on this table
ALTER TABLE public.onboarding_session_templates DISABLE ROW LEVEL SECURITY;

-- Insert the 5 session templates
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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_session_templates_plugin ON public.onboarding_session_templates(plugin_id);
CREATE INDEX IF NOT EXISTS idx_session_templates_active ON public.onboarding_session_templates(is_active) WHERE is_active = true;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SESSION TEMPLATES CREATED SUCCESSFULLY!';
  RAISE NOTICE '5 session templates have been created:';
  RAISE NOTICE '   - 3 Centcom sessions: Introduction, Core Workflows, Advanced Features';
  RAISE NOTICE '   - 1 APx500 plugin session';
  RAISE NOTICE '   - 1 Klippel QC plugin session';
  RAISE NOTICE '';
  RAISE NOTICE 'Templates are ready for use in the onboarding management portal!';
END $$;
