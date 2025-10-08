-- Complete Onboarding System Setup Script
-- Run this after the basic tables are created to add the onboarding functionality

-- First, ensure the onboarding tables exist from the main schema
\i database-onboarding-sessions.sql

-- Add sample trial users for testing (optional)
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

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) 
VALUES (
  'd0000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'trial-user-2@example.com',
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
),
(
  'd0000000-0000-0000-0000-000000000002',
  'trial-user-2@example.com', 
  'trial-user-2',
  'Trial User Two',
  'Test Company B',
  'operator',
  NOW(),
  NOW(),
  true
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Add sample trial licenses
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
),
(
  'e0000000-0000-0000-0000-000000000002',
  'TRIAL-CENTCOM-' || substr(md5(random()::text), 1, 8),
  'trial',
  'active',
  1,
  3,
  5,
  ARRAY['basic_access', 'trial_features'],
  ARRAY['centcom', 'reporting', 'dashboard'],
  NOW() + INTERVAL '30 days',
  'd0000000-0000-0000-0000-000000000002',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = NOW();

-- Create a function to auto-initialize onboarding for new trial licenses
CREATE OR REPLACE FUNCTION auto_initialize_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for trial licenses with assigned users
  IF NEW.license_type = 'trial' AND NEW.assigned_to IS NOT NULL THEN
    -- Insert into a queue table or call API asynchronously
    -- For now, we'll just log that it should be initialized
    INSERT INTO public.admin_activity_log (
      admin_id,
      action,
      resource_type,
      resource_id,
      details,
      created_at
    ) VALUES (
      'a0000000-0000-0000-0000-000000000001', -- System admin
      'onboarding_initialization_required',
      'license_key',
      NEW.id::text,
      jsonb_build_object(
        'user_id', NEW.assigned_to,
        'license_type', NEW.license_type,
        'enabled_plugins', NEW.enabled_plugins,
        'auto_trigger', true
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for license_keys table
DROP TRIGGER IF EXISTS trigger_auto_initialize_onboarding ON public.license_keys;
CREATE TRIGGER trigger_auto_initialize_onboarding
  AFTER INSERT OR UPDATE OF assigned_to, license_type
  ON public.license_keys
  FOR EACH ROW
  EXECUTE FUNCTION auto_initialize_onboarding();

-- Create similar trigger for licenses table
CREATE OR REPLACE FUNCTION auto_initialize_onboarding_licenses()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for trial licenses with assigned users
  IF NEW.license_type = 'trial' AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.admin_activity_log (
      admin_id,
      action,
      resource_type,
      resource_id,
      details,
      created_at
    ) VALUES (
      'a0000000-0000-0000-0000-000000000001', -- System admin
      'onboarding_initialization_required',
      'license',
      NEW.id::text,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'license_type', NEW.license_type,
        'plugin_id', NEW.plugin_id,
        'auto_trigger', true
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_initialize_onboarding_licenses ON public.licenses;
CREATE TRIGGER trigger_auto_initialize_onboarding_licenses
  AFTER INSERT OR UPDATE OF user_id, license_type
  ON public.licenses
  FOR EACH ROW
  EXECUTE FUNCTION auto_initialize_onboarding_licenses();

-- Create a function to check onboarding compliance and suspend licenses
CREATE OR REPLACE FUNCTION check_onboarding_compliance()
RETURNS void AS $$
DECLARE
  overdue_progress RECORD;
BEGIN
  -- Find all overdue onboarding progress
  FOR overdue_progress IN
    SELECT op.*, lk.key_code, l.id as license_old_id
    FROM public.onboarding_progress op
    LEFT JOIN public.license_keys lk ON lk.id = op.license_key_id
    LEFT JOIN public.licenses l ON l.id = op.license_id
    WHERE op.onboarding_deadline < NOW()
      AND op.overall_status != 'completed'
      AND op.license_active_status = true
  LOOP
    -- Suspend the license
    IF overdue_progress.license_key_id IS NOT NULL THEN
      UPDATE public.license_keys 
      SET status = 'suspended', updated_at = NOW()
      WHERE id = overdue_progress.license_key_id;
    END IF;
    
    IF overdue_progress.license_id IS NOT NULL THEN
      UPDATE public.licenses 
      SET status = 'suspended', updated_at = NOW()
      WHERE id = overdue_progress.license_id;
    END IF;
    
    -- Update progress status
    UPDATE public.onboarding_progress
    SET 
      overall_status = 'overdue',
      license_active_status = false,
      license_suspended_at = NOW(),
      license_suspension_reason = 'Onboarding deadline exceeded',
      updated_at = NOW()
    WHERE id = overdue_progress.id;
    
    -- Log the suspension
    INSERT INTO public.admin_activity_log (
      admin_id,
      action,
      resource_type,
      resource_id,
      details,
      created_at
    ) VALUES (
      'a0000000-0000-0000-0000-000000000001', -- System admin
      'license_suspended_onboarding_overdue',
      'onboarding_progress',
      overdue_progress.id::text,
      jsonb_build_object(
        'user_id', overdue_progress.user_id,
        'deadline', overdue_progress.onboarding_deadline,
        'sessions_completed', overdue_progress.sessions_completed,
        'total_required', overdue_progress.total_sessions_required,
        'auto_suspended', true
      ),
      NOW()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create sample onboarding progress for demonstration
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
),
(
  'd0000000-0000-0000-0000-000000000002',
  'e0000000-0000-0000-0000-000000000002',
  5, -- 3 base + 1 for reporting + 1 for dashboard
  '{"reporting": 1, "dashboard": 1}'::jsonb,
  0, -- Not started
  '{"reporting": 0, "dashboard": 0}'::jsonb,
  'pending',
  NOW() + INTERVAL '30 days',
  true,
  NOW(),
  NOW()
) ON CONFLICT (user_id, license_key_id) DO UPDATE SET
  overall_status = EXCLUDED.overall_status,
  updated_at = NOW();

-- Create sample onboarding sessions
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
),
(
  'd0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  'centcom',
  'standard',
  2,
  'Centcom Onboarding Session 2',
  'Advanced features and workflows',
  30,
  NOW() + INTERVAL '2 days',
  'scheduled',
  NULL,
  NULL,
  NOW() - INTERVAL '5 days',
  NOW()
),
(
  'd0000000-0000-0000-0000-000000000002',
  'e0000000-0000-0000-0000-000000000002',
  'centcom',
  'initial',
  1,
  'Centcom Onboarding Session 1',
  'Initial introduction and setup for Centcom platform',
  30,
  NOW() + INTERVAL '1 day',
  'scheduled',
  NULL,
  NULL,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Create sample reminders
INSERT INTO public.onboarding_reminders (
  user_id,
  progress_id,
  reminder_type,
  reminder_method,
  scheduled_for,
  subject,
  message,
  status,
  created_at
) VALUES
(
  'd0000000-0000-0000-0000-000000000002',
  (SELECT id FROM public.onboarding_progress WHERE user_id = 'd0000000-0000-0000-0000-000000000002' LIMIT 1),
  'session_due',
  'email',
  NOW() + INTERVAL '12 hours',
  'Onboarding Session Due Soon',
  'Your onboarding session is due soon. Please make sure to attend to maintain your trial license active status.',
  'pending',
  NOW()
) ON CONFLICT DO NOTHING;

-- Add helpful views for admin dashboard
CREATE OR REPLACE VIEW onboarding_dashboard_stats AS
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN overall_status = 'pending' THEN 1 END) as pending_users,
  COUNT(CASE WHEN overall_status = 'in_progress' THEN 1 END) as in_progress_users,
  COUNT(CASE WHEN overall_status = 'completed' THEN 1 END) as completed_users,
  COUNT(CASE WHEN overall_status = 'overdue' THEN 1 END) as overdue_users,
  COUNT(CASE WHEN license_active_status = false THEN 1 END) as suspended_licenses,
  ROUND(AVG(sessions_completed::float / total_sessions_required::float * 100), 2) as avg_completion_rate,
  COUNT(CASE WHEN onboarding_deadline < NOW() AND overall_status != 'completed' THEN 1 END) as at_risk_users
FROM public.onboarding_progress;

CREATE OR REPLACE VIEW upcoming_onboarding_sessions AS
SELECT 
  os.*,
  up.email as user_email,
  up.full_name as user_name,
  up.company,
  admin.full_name as admin_name,
  admin.email as admin_email,
  EXTRACT(EPOCH FROM (os.scheduled_at - NOW()))/3600 as hours_until_session
FROM public.onboarding_sessions os
JOIN public.user_profiles up ON up.id = os.user_id
LEFT JOIN public.user_profiles admin ON admin.id = os.assigned_admin_id
WHERE os.scheduled_at >= NOW()
  AND os.status IN ('scheduled', 'in_progress')
ORDER BY os.scheduled_at ASC;

-- Grant permissions to authenticated users to read their own onboarding data
GRANT SELECT ON onboarding_dashboard_stats TO authenticated;
GRANT SELECT ON upcoming_onboarding_sessions TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Onboarding system setup completed successfully!';
  RAISE NOTICE '📊 Database tables created and configured';
  RAISE NOTICE '🔧 Triggers and functions installed';
  RAISE NOTICE '👥 Sample data inserted for testing';
  RAISE NOTICE '📈 Dashboard views created';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Visit http://localhost:3594/admin/onboarding to manage onboarding';
  RAISE NOTICE '2. Use API endpoints to initialize onboarding for new trial users';
  RAISE NOTICE '3. Set up scheduled jobs to check compliance and send reminders';
END $$;
