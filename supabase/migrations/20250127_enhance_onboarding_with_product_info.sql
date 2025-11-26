-- Migration: Enhance Onboarding Sessions with Product Information
-- Created: 2025-01-27
-- Description: Add product category and improve titles/descriptions for onboarding sessions

-- ============================================
-- PART 1: Add product_category field
-- ============================================

-- Add product_category column to track which product triggered the onboarding
ALTER TABLE onboarding_session_bookings
ADD COLUMN IF NOT EXISTS product_category TEXT;

ALTER TABLE onboarding_session_bookings
ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Drop old constraint if it exists and add new one with simplified categories
ALTER TABLE onboarding_session_bookings
DROP CONSTRAINT IF EXISTS valid_product_category;

ALTER TABLE onboarding_session_bookings
ADD CONSTRAINT valid_product_category
CHECK (product_category IN ('native_app', 'plugin', 'other') OR product_category IS NULL);

-- Add index for product_category
CREATE INDEX IF NOT EXISTS idx_onboarding_bookings_product_category
  ON onboarding_session_bookings(product_category);

COMMENT ON COLUMN onboarding_session_bookings.product_category IS 'The product category that triggered this onboarding session (native_app, plugin, other)';
COMMENT ON COLUMN onboarding_session_bookings.product_name IS 'Human-readable product name (e.g., "Desktop Application", "Klippel QC", "APx500")';

-- ============================================
-- PART 2: Update trigger function to populate product information
-- ============================================

CREATE OR REPLACE FUNCTION create_suggested_onboarding_session()
RETURNS TRIGGER AS $$
DECLARE
  is_trial_upgrade BOOLEAN := false;
  booking_deadline TIMESTAMPTZ;
  product_category_val TEXT;
  product_name_val TEXT;
  session_title TEXT;
  session_description TEXT;
  related_subscription RECORD;
BEGIN
  -- Check if this is a paid license upgraded from a trial
  IF NEW.license_type != 'trial' AND NEW.license_type != 'gratis' THEN
    -- Check if user had a trial before
    SELECT EXISTS(
      SELECT 1 FROM license_keys
      WHERE user_id = NEW.user_id
        AND license_type = 'trial'
        AND status IN ('expired', 'upgraded')
        AND created_at < NEW.created_at
    ) INTO is_trial_upgrade;
  END IF;

  -- Only create suggested session if:
  -- 1. It's a trial license (mandatory), OR
  -- 2. It's a paid license NOT upgraded from trial
  IF NEW.license_type = 'trial' OR (NEW.license_type NOT IN ('trial', 'gratis') AND NOT is_trial_upgrade) THEN

    -- Determine product category based on license information
    -- Check if there's a related subscription to determine product type
    SELECT
      s.subscription_category,
      s.plugin_type,
      s.subscription_type
    INTO related_subscription
    FROM subscriptions s
    WHERE s.user_id = NEW.user_id
      AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;

    -- Determine product category and name
    IF related_subscription.subscription_category = 'native_app' OR NEW.license_type = 'main-application' THEN
      product_category_val := 'native_app';
      product_name_val := 'Desktop Application';
      session_title := 'Desktop Application Onboarding - ' ||
        CASE
          WHEN NEW.license_type = 'trial' OR NEW.status = 'trial' THEN 'Trial'
          WHEN NEW.license_type = 'basic' THEN 'Basic Plan'
          WHEN NEW.license_type = 'professional' THEN 'Professional Plan'
          WHEN NEW.license_type = 'enterprise' THEN 'Enterprise Plan'
          ELSE 'Subscription'
        END;
      session_description := 'Welcome to the Desktop Application! This onboarding session will help you:
• Install and set up the desktop application
• Connect your local cluster
• Configure your first project
• Learn key features and workflows
• Get answers to your questions' ||
        CASE WHEN NEW.license_type = 'trial' OR NEW.status = 'trial'
          THEN E'\n\n⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
          ELSE ''
        END;

    ELSIF related_subscription.plugin_type = 'klippel_qc' THEN
      product_category_val := 'plugin';
      product_name_val := 'Klippel QC';
      session_title := 'Klippel QC Onboarding - ' ||
        CASE WHEN NEW.license_type = 'trial' OR NEW.status = 'trial' THEN 'Trial' ELSE 'Subscription' END;
      session_description := 'Welcome to Klippel QC! This onboarding session will cover:
• Plugin installation and activation
• Integration with your Klippel QC system
• Data import and analysis workflows
• Best practices and tips
• Q&A session' ||
        CASE WHEN NEW.license_type = 'trial' OR NEW.status = 'trial'
          THEN E'\n\n⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
          ELSE ''
        END;

    ELSIF related_subscription.plugin_type = 'apx500' THEN
      product_category_val := 'plugin';
      product_name_val := 'APx500';
      session_title := 'APx500 Onboarding - ' ||
        CASE WHEN NEW.license_type = 'trial' OR NEW.status = 'trial' THEN 'Trial' ELSE 'Subscription' END;
      session_description := 'Welcome to APx500! This onboarding session will cover:
• Plugin installation and activation
• Integration with Audio Precision APx500
• Measurement workflows and automation
• Best practices and tips
• Q&A session' ||
        CASE WHEN NEW.license_type = 'trial' OR NEW.status = 'trial'
          THEN E'\n\n⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
          ELSE ''
        END;

    ELSE
      -- Default/fallback for other license types
      product_category_val := 'other';
      product_name_val := 'Product';
      session_title := 'Onboarding Session - ' ||
        CASE NEW.license_type
          WHEN 'trial' THEN 'Trial'
          WHEN 'basic' THEN 'Basic Plan'
          WHEN 'professional' THEN 'Professional Plan'
          WHEN 'enterprise' THEN 'Enterprise Plan'
          ELSE 'Subscription'
        END;
      session_description := 'Welcome! This onboarding session will help you get started. We''ll cover setup, key features, and answer any questions you may have.' ||
        CASE WHEN NEW.license_type = 'trial'
          THEN E'\n\n⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
          ELSE ''
        END;
    END IF;

    -- Set deadline for trials (14 days from now)
    IF NEW.license_type = 'trial' OR NEW.status = 'trial' THEN
      booking_deadline := NOW() + INTERVAL '14 days';
    ELSE
      booking_deadline := NOW() + INTERVAL '30 days'; -- Optional for paid licenses
    END IF;

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
      product_category,
      product_name
    )
    SELECT
      NEW.user_id,
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
      (NEW.license_type = 'trial' OR NEW.status = 'trial'), -- Mandatory for trials
      (NEW.license_type = 'trial' OR NEW.status = 'trial'), -- Required for trials
      booking_deadline,
      session_title,
      session_description,
      product_category_val,
      product_name_val;

    RAISE NOTICE 'Created suggested onboarding session for license % (type: %, product: %)',
      NEW.id, NEW.license_type, product_name_val;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger (drop and recreate to ensure it uses the new function)
DROP TRIGGER IF EXISTS trigger_create_onboarding_on_license_creation ON license_keys;
CREATE TRIGGER trigger_create_onboarding_on_license_creation
  AFTER INSERT ON license_keys
  FOR EACH ROW
  WHEN (NEW.status IN ('active', 'trial'))
  EXECUTE FUNCTION create_suggested_onboarding_session();

-- ============================================
-- PART 3: Backfill existing onboarding sessions
-- ============================================

-- Update existing sessions to have product information based on their license
UPDATE onboarding_session_bookings osb
SET
  product_category = CASE
    WHEN lk.license_type = 'main-application' THEN 'native_app'
    WHEN lk.license_type IN ('klippel_qc', 'apx500') THEN 'plugin'
    ELSE 'other'
  END,
  product_name = CASE
    WHEN lk.license_type = 'main-application' THEN 'Desktop Application'
    WHEN lk.license_type = 'klippel_qc' THEN 'Klippel QC'
    WHEN lk.license_type = 'apx500' THEN 'APx500'
    ELSE 'Product'
  END,
  title = CASE
    WHEN lk.license_type = 'main-application' THEN
      'Desktop Application Onboarding - ' ||
      CASE
        WHEN lk.status = 'trial' THEN 'Trial'
        WHEN lk.license_type = 'basic' THEN 'Basic Plan'
        WHEN lk.license_type = 'professional' THEN 'Professional Plan'
        WHEN lk.license_type = 'enterprise' THEN 'Enterprise Plan'
        ELSE 'Subscription'
      END
    WHEN lk.license_type = 'klippel_qc' THEN
      'Klippel QC Onboarding - ' ||
      CASE WHEN lk.status = 'trial' THEN 'Trial' ELSE 'Subscription' END
    WHEN lk.license_type = 'apx500' THEN
      'APx500 Onboarding - ' ||
      CASE WHEN lk.status = 'trial' THEN 'Trial' ELSE 'Subscription' END
    ELSE osb.title
  END,
  description = CASE
    WHEN lk.license_type = 'main-application' THEN
      'Welcome to the Desktop Application! This onboarding session will help you:
• Install and set up the desktop application
• Connect your local cluster
• Configure your first project
• Learn key features and workflows
• Get answers to your questions' ||
      CASE WHEN lk.status = 'trial'
        THEN E'\n\n⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
        ELSE ''
      END
    WHEN lk.license_type = 'klippel_qc' THEN
      'Welcome to Klippel QC! This onboarding session will cover:
• Plugin installation and activation
• Integration with your Klippel QC system
• Data import and analysis workflows
• Best practices and tips
• Q&A session' ||
      CASE WHEN lk.status = 'trial'
        THEN E'\n\n⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
        ELSE ''
      END
    WHEN lk.license_type = 'apx500' THEN
      'Welcome to APx500! This onboarding session will cover:
• Plugin installation and activation
• Integration with Audio Precision APx500
• Measurement workflows and automation
• Best practices and tips
• Q&A session' ||
      CASE WHEN lk.status = 'trial'
        THEN E'\n\n⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
        ELSE ''
      END
    ELSE osb.description
  END
FROM license_keys lk
WHERE osb.license_key_id = lk.id
  AND osb.product_category IS NULL;

-- ============================================
-- PART 4: Update view to include product information
-- ============================================

-- Drop the existing view first to avoid column order conflicts
DROP VIEW IF EXISTS v_upcoming_onboarding_sessions;

CREATE VIEW v_upcoming_onboarding_sessions AS
SELECT
  osb.id,
  osb.scheduled_start_time,
  osb.scheduled_end_time,
  osb.duration_minutes,
  osb.session_type,
  osb.status,
  osb.is_mandatory,
  osb.is_trial_required,
  osb.trial_deadline,
  osb.title,
  osb.description,
  osb.meeting_link,
  osb.meeting_platform,
  osb.product_category,
  osb.product_name,

  -- User details
  u.id AS user_id,
  u.email AS user_email,
  u.full_name AS user_name,

  -- Admin details
  a.id AS admin_id,
  a.email AS admin_email,
  a.full_name AS admin_name,

  -- License details
  lk.license_type,
  lk.status AS license_status
FROM onboarding_session_bookings osb
JOIN user_profiles u ON osb.user_id = u.id
JOIN user_profiles a ON osb.admin_user_id = a.id
LEFT JOIN license_keys lk ON osb.license_key_id = lk.id
WHERE osb.scheduled_start_time > NOW()
  AND osb.status IN ('suggested', 'scheduled', 'confirmed')
ORDER BY osb.scheduled_start_time ASC;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Onboarding sessions enhanced with product information';
  RAISE NOTICE '📦 Added fields: product_category, product_name';
  RAISE NOTICE '🔄 Updated trigger: create_suggested_onboarding_session()';
  RAISE NOTICE '✨ Improved titles and descriptions with product-specific content';
  RAISE NOTICE '🔙 Backfilled existing sessions with product information';
END $$;
