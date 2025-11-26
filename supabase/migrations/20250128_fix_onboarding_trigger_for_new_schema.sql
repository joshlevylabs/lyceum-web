-- ================================================
-- FIX ONBOARDING TRIGGER FOR NEW LICENSE SCHEMA
-- ================================================
-- The original trigger checked license_type = 'trial', but our schema uses:
-- - license_type: 'main-application', 'klippel_qc', 'apx500' (product type)
-- - status: 'trial', 'active' (license status)
-- - time_limit_type: 'trial_30', 'unlimited'
--
-- This migration updates the trigger to work with our actual schema.
-- ================================================

-- Drop the old trigger first
DROP TRIGGER IF EXISTS trigger_create_onboarding_on_license_creation ON license_keys;

-- Replace the function with updated logic
CREATE OR REPLACE FUNCTION create_suggested_onboarding_session()
RETURNS TRIGGER AS $$
DECLARE
  is_trial_upgrade BOOLEAN := false;
  booking_deadline TIMESTAMPTZ;
  is_trial_license BOOLEAN;
  product_display_name TEXT;
BEGIN
  -- Determine if this is a trial license by checking multiple indicators
  is_trial_license := (
    NEW.status = 'trial'
    OR NEW.time_limit_type IN ('trial', 'trial_30')
    OR NEW.expires_at IS NOT NULL
  );

  -- Check if this is a paid license upgraded from a trial
  IF NOT is_trial_license THEN
    -- Check if user had a trial before for the same product
    SELECT EXISTS(
      SELECT 1 FROM license_keys
      WHERE assigned_to = NEW.assigned_to
        AND (status = 'trial' OR time_limit_type IN ('trial', 'trial_30'))
        AND license_type = NEW.license_type
        AND created_at < NEW.created_at
    ) INTO is_trial_upgrade;
  END IF;

  -- Only create suggested session if:
  -- 1. It's a trial license (mandatory), OR
  -- 2. It's a paid license NOT upgraded from trial
  IF is_trial_license OR NOT is_trial_upgrade THEN

    -- Set deadline based on license type
    IF is_trial_license THEN
      booking_deadline := NOW() + INTERVAL '14 days'; -- Mandatory for trials
    ELSE
      booking_deadline := NOW() + INTERVAL '30 days'; -- Optional for paid
    END IF;

    -- Determine product display name
    product_display_name := CASE NEW.license_type
      WHEN 'main-application' THEN 'Lyceum Main Application'
      WHEN 'klippel_qc' THEN 'Klippel QC Plugin'
      WHEN 'apx500' THEN 'APX500 Plugin'
      ELSE NEW.license_type
    END;

    -- Create suggested onboarding booking
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
        (SELECT DISTINCT admin_user_id
         FROM admin_availability_slots
         WHERE is_available = true
           AND start_time > NOW()
         ORDER BY RANDOM()
         LIMIT 1),
        -- Fallback to any superadmin
        (SELECT id FROM user_profiles WHERE role IN ('superadmin', 'super_admin') ORDER BY created_at LIMIT 1)
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
        CASE
          WHEN is_trial_license THEN 'Trial License'
          ELSE 'Paid License'
        END ||
        ' (' || product_display_name || ')',
      'Welcome to Lyceum! This onboarding session will help you get started with your ' ||
        product_display_name || ' license. We''ll cover setup, key features, and answer any questions you may have.' ||
        CASE WHEN is_trial_license
          THEN ' ⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
          ELSE ' This session is optional but highly recommended to get the most out of your license.'
        END,
      'zoom'
    WHERE
      -- Only create if admin user was found
      EXISTS (SELECT 1 FROM user_profiles WHERE role IN ('superadmin', 'super_admin'));

    RAISE NOTICE 'Created suggested onboarding session for license % (type: %, is_trial: %)',
      NEW.id, NEW.license_type, is_trial_license;
  ELSE
    RAISE NOTICE 'Skipped onboarding session creation for license % - upgraded from trial', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger
CREATE TRIGGER trigger_create_onboarding_on_license_creation
  AFTER INSERT ON license_keys
  FOR EACH ROW
  WHEN (NEW.status IN ('active', 'trial'))
  EXECUTE FUNCTION create_suggested_onboarding_session();

COMMENT ON FUNCTION create_suggested_onboarding_session IS 'Automatically creates a suggested onboarding session when a license is generated (updated for new schema)';

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Onboarding trigger updated for new license schema';
  RAISE NOTICE '🔄 Now checks: status = ''trial'', time_limit_type, and expires_at';
  RAISE NOTICE '📦 Supports: main-application, klippel_qc, apx500 license types';
  RAISE NOTICE '⚠️  Trial licenses: 14-day mandatory onboarding deadline';
  RAISE NOTICE '✨ Paid licenses: 30-day optional onboarding (unless upgraded from trial)';
END $$;
