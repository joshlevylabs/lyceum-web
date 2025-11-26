-- Fix onboarding session naming and prevent duplicates
-- Date: 2025-01-25
-- Changes:
-- 1. Change "Lyceum Native" to "Desktop Application"
-- 2. Change "Centcom" to "Desktop Application" (consistent naming)
-- 3. Prevent duplicate onboarding sessions from being created

CREATE OR REPLACE FUNCTION create_suggested_onboarding_session()
RETURNS TRIGGER AS $$
DECLARE
  is_trial_license BOOLEAN;
  booking_deadline TIMESTAMPTZ;
  product_display_name TEXT;
  existing_booking_count INT;
BEGIN
  -- Only create onboarding session for main-application licenses
  IF NEW.license_type != 'main-application' THEN
    RETURN NEW;
  END IF;

  -- Check if user already has an onboarding session for main-application
  SELECT COUNT(*) INTO existing_booking_count
  FROM onboarding_session_bookings osb
  JOIN license_keys lk ON lk.id = osb.license_key_id
  WHERE osb.user_id = NEW.assigned_to
    AND lk.license_type = 'main-application'
    AND osb.status IN ('suggested', 'scheduled', 'confirmed');

  -- If user already has an onboarding session, don't create another
  IF existing_booking_count > 0 THEN
    RETURN NEW;
  END IF;

  -- Determine if this is a trial license
  is_trial_license := (NEW.time_limit_type = 'trial_30' OR NEW.expires_at IS NOT NULL);

  -- Set booking deadline (14 days for trial, 30 days for paid)
  booking_deadline := CASE
    WHEN is_trial_license THEN NEW.created_at + INTERVAL '14 days'
    ELSE NEW.created_at + INTERVAL '30 days'
  END;

  -- Use "Desktop Application" for consistent naming
  product_display_name := 'Desktop Application';

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
    'Welcome! This onboarding session will help you get started with your ' ||
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
COMMENT ON FUNCTION create_suggested_onboarding_session() IS 'Creates onboarding session for Desktop Application licenses - prevents duplicates and uses consistent naming';
