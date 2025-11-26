-- Fix DISTINCT/ORDER BY error in create_suggested_onboarding_session trigger
-- Date: 2025-01-25
-- Issue: PostgreSQL error when creating licenses due to DISTINCT + ORDER BY RANDOM()

-- Drop and recreate the trigger function with the fix
CREATE OR REPLACE FUNCTION create_suggested_onboarding_session()
RETURNS TRIGGER AS $$
DECLARE
  is_trial_license BOOLEAN;
  booking_deadline TIMESTAMPTZ;
  product_display_name TEXT;
BEGIN
  -- Only create onboarding session for main-application licenses
  IF NEW.license_type != 'main-application' THEN
    RETURN NEW;
  END IF;

  -- Determine if this is a trial license
  is_trial_license := (NEW.time_limit_type = 'trial_30' OR NEW.expires_at IS NOT NULL);

  -- Set booking deadline (14 days for trial, 30 days for paid)
  booking_deadline := CASE
    WHEN is_trial_license THEN NEW.created_at + INTERVAL '14 days'
    ELSE NEW.created_at + INTERVAL '30 days'
  END;

  -- Determine product display name
  product_display_name := CASE
    WHEN NEW.license_config->>'brand_type' = 'centcom' THEN 'Centcom'
    ELSE 'Lyceum Native'
  END;

  -- Create suggested onboarding session booking
  INSERT INTO onboarding_session_bookings (
    user_id,
    license_key_id,
    admin_user_id,
    scheduled_start_time,
    scheduled_end_time,
    duration_minutes,
    session_type,
    status,
    is_mandatory,
    is_trial_required,
    trial_deadline,
    title,
    description,
    meeting_platform
  )
  SELECT
    NEW.assigned_to,
    NEW.id,
    -- Select an admin user (preferably one with availability)
    -- FIXED: Removed DISTINCT to avoid DISTINCT/ORDER BY conflict
    COALESCE(
      (SELECT admin_user_id
       FROM admin_availability_slots
       WHERE is_available = true
       AND start_time > NOW()
       ORDER BY RANDOM()
       LIMIT 1),
      -- Fallback to any superadmin
      (SELECT id
       FROM user_profiles
       WHERE role IN ('superadmin', 'super_admin')
       ORDER BY created_at
       LIMIT 1)
    ),
    NOW() + INTERVAL '7 days', -- Suggested 7 days from now
    NOW() + INTERVAL '7 days' + INTERVAL '1 hour',
    60,
    'initial_onboarding',
    'suggested',
    is_trial_license, -- Mandatory for trials
    is_trial_license, -- Required for trials
    booking_deadline,
    'Initial Onboarding Session - ' ||
      CASE WHEN is_trial_license THEN 'Trial License' ELSE 'Paid License' END ||
      ' (' || product_display_name || ')',
    'Welcome to Lyceum! This onboarding session will help you get started with your ' ||
      product_display_name ||
      ' license. We''ll cover setup, key features, and answer any questions you may have.' ||
      CASE
        WHEN is_trial_license THEN
          ' ⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
        ELSE
          ' This session is optional but highly recommended to get the most out of your license.'
      END,
    'zoom'
  WHERE
    -- Only create if admin user was found
    EXISTS (SELECT 1 FROM user_profiles WHERE role IN ('superadmin', 'super_admin'));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is properly attached
DROP TRIGGER IF EXISTS after_license_created_create_onboarding ON license_keys;

CREATE TRIGGER after_license_created_create_onboarding
  AFTER INSERT ON license_keys
  FOR EACH ROW
  EXECUTE FUNCTION create_suggested_onboarding_session();

-- Add comment
COMMENT ON FUNCTION create_suggested_onboarding_session() IS 'Fixed DISTINCT/ORDER BY error - removed DISTINCT from admin user selection query';
