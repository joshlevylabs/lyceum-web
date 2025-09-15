-- Enhanced Onboarding Schema with Calendar and Notes Support
-- Run this in your Supabase SQL Console

-- Add new columns to onboarding_sessions for enhanced functionality
ALTER TABLE public.onboarding_sessions 
ADD COLUMN IF NOT EXISTS session_notes TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.user_profiles(id),
ADD COLUMN IF NOT EXISTS session_type VARCHAR(20) DEFAULT 'virtual_call' CHECK (session_type IN ('automated', 'virtual_call')),
ADD COLUMN IF NOT EXISTS meeting_link TEXT,
ADD COLUMN IF NOT EXISTS live_session_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS overdue_days INTEGER DEFAULT 0;

-- Add new columns to onboarding_progress for trial management
ALTER TABLE public.onboarding_progress 
ADD COLUMN IF NOT EXISTS trial_pause_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_cancellation_warning_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS days_until_deactivation INTEGER,
ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- Create index for calendar queries
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_scheduled_at ON public.onboarding_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_admin_id ON public.onboarding_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_overdue ON public.onboarding_sessions(is_overdue) WHERE is_overdue = true;

-- Update sample data with enhanced fields
UPDATE public.onboarding_sessions 
SET 
  session_type = CASE 
    WHEN session_number = 1 THEN 'virtual_call'
    WHEN session_number = 2 THEN 'automated' 
    ELSE 'virtual_call'
  END,
  session_notes = CASE 
    WHEN status = 'completed' THEN 'Session completed successfully. User demonstrated good understanding of basic features.'
    WHEN status = 'scheduled' THEN 'Initial onboarding session - cover dashboard overview and basic navigation.'
    ELSE ''
  END,
  meeting_link = CASE 
    WHEN session_type = 'virtual_call' AND status = 'scheduled' THEN 'https://meet.google.com/abc-defg-hij'
    ELSE NULL
  END
WHERE id IS NOT NULL;

-- Update overdue status based on current date
UPDATE public.onboarding_sessions 
SET 
  is_overdue = CASE 
    WHEN scheduled_at < NOW() - INTERVAL '1 day' AND status != 'completed' THEN true
    ELSE false
  END,
  overdue_days = CASE 
    WHEN scheduled_at < NOW() - INTERVAL '1 day' AND status != 'completed' 
    THEN EXTRACT(DAY FROM NOW() - scheduled_at)::INTEGER
    ELSE 0
  END;

-- Update progress with trial management data
UPDATE public.onboarding_progress 
SET 
  days_until_deactivation = CASE 
    WHEN overall_status != 'completed' AND onboarding_deadline IS NOT NULL 
    THEN GREATEST(0, EXTRACT(DAY FROM onboarding_deadline - NOW())::INTEGER)
    ELSE NULL
  END,
  trial_pause_date = CASE 
    WHEN overall_status = 'overdue' AND onboarding_deadline < NOW() - INTERVAL '7 days'
    THEN NOW()
    ELSE NULL
  END,
  deactivation_reason = CASE 
    WHEN overall_status = 'overdue' AND onboarding_deadline < NOW() - INTERVAL '14 days'
    THEN 'Trial deactivated due to incomplete onboarding sessions (14+ days overdue)'
    ELSE NULL
  END;

-- Create function to calculate trial status
CREATE OR REPLACE FUNCTION calculate_trial_status(user_id UUID, license_id UUID)
RETURNS TABLE (
  status VARCHAR(20),
  days_remaining INTEGER,
  action_required TEXT,
  warning_level VARCHAR(10)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN p.overall_status = 'completed' THEN 'active'::VARCHAR(20)
      WHEN p.days_until_deactivation <= 0 THEN 'deactivated'::VARCHAR(20)
      WHEN p.days_until_deactivation <= 3 THEN 'critical'::VARCHAR(20)
      WHEN p.days_until_deactivation <= 7 THEN 'warning'::VARCHAR(20)
      ELSE 'active'::VARCHAR(20)
    END as status,
    p.days_until_deactivation as days_remaining,
    CASE 
      WHEN p.days_until_deactivation <= 0 THEN 'Trial license has been deactivated'
      WHEN p.days_until_deactivation <= 3 THEN 'URGENT: Complete onboarding sessions immediately'
      WHEN p.days_until_deactivation <= 7 THEN 'Schedule remaining onboarding sessions soon'
      ELSE 'Continue with scheduled onboarding sessions'
    END as action_required,
    CASE 
      WHEN p.days_until_deactivation <= 0 THEN 'critical'::VARCHAR(10)
      WHEN p.days_until_deactivation <= 3 THEN 'critical'::VARCHAR(10)
      WHEN p.days_until_deactivation <= 7 THEN 'warning'::VARCHAR(10)
      ELSE 'normal'::VARCHAR(10)
    END as warning_level
  FROM public.onboarding_progress p
  WHERE p.user_id = calculate_trial_status.user_id 
    AND p.license_key_id = calculate_trial_status.license_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_trial_status(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION calculate_trial_status IS 'Calculate trial license status based on onboarding progress and deadlines';
