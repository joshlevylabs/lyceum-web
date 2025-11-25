-- ================================================================
-- FIX ONBOARDING TRIGGER TO USE CORRECT COLUMN NAME
-- ================================================================
-- Migration to fix create_suggested_onboarding_session() function
-- to use 'assigned_to' instead of 'user_id'
-- ================================================================

-- Drop and recreate the function with correct column reference
DROP FUNCTION IF EXISTS create_suggested_onboarding_session() CASCADE;

CREATE OR REPLACE FUNCTION create_suggested_onboarding_session()
RETURNS TRIGGER AS $$
DECLARE
  booking_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only create onboarding session for new licenses (except paid upgrades from trials)
  -- Skip if license is being created as an upgrade from trial
  IF NEW.license_type = 'gratis' OR
     (NEW.license_type IN ('basic', 'professional', 'enterprise') AND
      EXISTS (
        SELECT 1 FROM license_keys
        WHERE assigned_to = NEW.assigned_to
          AND license_type = 'trial'
          AND status IN ('active', 'superseded')
      )) THEN
    RAISE NOTICE 'Skipping onboarding session creation for license % (gratis or paid upgrade)', NEW.id;
    RETURN NEW;
  END IF;

  -- Calculate booking deadline
  IF NEW.license_type = 'trial' THEN
    booking_deadline := NEW.created_at + INTERVAL '14 days'; -- Mandatory 14-day deadline
  ELSE
    booking_deadline := NEW.created_at + INTERVAL '30 days'; -- Recommended 30-day deadline
  END IF;

  -- Create a suggested onboarding session
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
      description
    )
    SELECT
      NEW.assigned_to,  -- FIXED: Use assigned_to instead of user_id
      NEW.id,
      -- Select an admin user (preferably one with availability)
      COALESCE(
        (SELECT DISTINCT admin_user_id
         FROM admin_availability_slots
         WHERE is_available = true
           AND start_time > NOW()
         ORDER BY RANDOM()
         LIMIT 1),
        -- Fallback to any superadmin
        (SELECT id FROM user_profiles WHERE role = 'superadmin' LIMIT 1)
      ),
      NOW() + INTERVAL '7 days', -- Suggested 7 days from now
      NOW() + INTERVAL '7 days' + INTERVAL '1 hour',
      60,
      'initial_onboarding',
      'suggested',
      (NEW.license_type = 'trial'), -- Mandatory for trials
      (NEW.license_type = 'trial'), -- Required for trials
      booking_deadline,
      'Initial Onboarding Session - ' ||
        CASE NEW.license_type
          WHEN 'trial' THEN 'Trial License'
          WHEN 'basic' THEN 'Basic License'
          WHEN 'professional' THEN 'Professional License'
          WHEN 'enterprise' THEN 'Enterprise License'
          ELSE 'License'
        END,
      'Welcome to Lyceum! This onboarding session will help you get started with your new ' ||
        NEW.license_type || ' license. We''ll cover setup, key features, and answer any questions you may have.' ||
        CASE WHEN NEW.license_type = 'trial'
          THEN ' ⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
          ELSE ''
        END;

    RAISE NOTICE 'Created suggested onboarding session for license % (type: %)', NEW.id, NEW.license_type;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_create_onboarding_on_license_creation ON license_keys;

CREATE TRIGGER trigger_create_onboarding_on_license_creation
AFTER INSERT ON license_keys
FOR EACH ROW
EXECUTE FUNCTION create_suggested_onboarding_session();

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_create_onboarding_on_license_creation'
  ) THEN
    RAISE NOTICE '✅ Onboarding trigger recreated successfully with correct column reference';
  ELSE
    RAISE EXCEPTION '❌ Failed to recreate onboarding trigger';
  END IF;
END $$;
