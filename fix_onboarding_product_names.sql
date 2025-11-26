-- Fix Onboarding Sessions Product Names and Categories
-- This script updates all existing onboarding sessions to use the new naming convention:
-- - "Lyceum Native App" → "Desktop Application"
-- - "Lyceum Product" → Determined by license type
-- - Plugin categories simplified to just "plugin"

-- ============================================
-- STEP 1: Check current state
-- ============================================
SELECT
  'Current State' as step,
  product_category,
  product_name,
  COUNT(*) as count
FROM onboarding_session_bookings
WHERE status IN ('suggested', 'scheduled', 'confirmed')
GROUP BY product_category, product_name
ORDER BY product_category, product_name;

-- ============================================
-- STEP 2: Update all sessions based on license type
-- ============================================

-- Update sessions linked to licenses
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
WHERE osb.license_key_id = lk.id;

-- ============================================
-- STEP 3: Update sessions based on user's subscription (for sessions without direct license link)
-- ============================================

UPDATE onboarding_session_bookings osb
SET
  product_category = CASE
    WHEN s.subscription_category = 'native_app' THEN 'native_app'
    WHEN s.subscription_category = 'plugin' THEN 'plugin'
    ELSE osb.product_category
  END,
  product_name = CASE
    WHEN s.subscription_category = 'native_app' THEN 'Desktop Application'
    WHEN s.plugin_type = 'klippel_qc' THEN 'Klippel QC'
    WHEN s.plugin_type = 'apx500' THEN 'APx500'
    ELSE osb.product_name
  END,
  title = CASE
    WHEN s.subscription_category = 'native_app' THEN
      'Desktop Application Onboarding - ' ||
      CASE WHEN s.subscription_type = 'trial' THEN 'Trial' ELSE 'Subscription' END
    WHEN s.plugin_type = 'klippel_qc' THEN
      'Klippel QC Onboarding - ' ||
      CASE WHEN s.subscription_type = 'trial' THEN 'Trial' ELSE 'Subscription' END
    WHEN s.plugin_type = 'apx500' THEN
      'APx500 Onboarding - ' ||
      CASE WHEN s.subscription_type = 'trial' THEN 'Trial' ELSE 'Subscription' END
    ELSE osb.title
  END,
  description = CASE
    WHEN s.subscription_category = 'native_app' THEN
      'Welcome to the Desktop Application! This onboarding session will help you:
• Install and set up the desktop application
• Connect your local cluster
• Configure your first project
• Learn key features and workflows
• Get answers to your questions' ||
      CASE WHEN s.subscription_type = 'trial'
        THEN E'\n\n⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
        ELSE ''
      END
    WHEN s.plugin_type = 'klippel_qc' THEN
      'Welcome to Klippel QC! This onboarding session will cover:
• Plugin installation and activation
• Integration with your Klippel QC system
• Data import and analysis workflows
• Best practices and tips
• Q&A session' ||
      CASE WHEN s.subscription_type = 'trial'
        THEN E'\n\n⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
        ELSE ''
      END
    WHEN s.plugin_type = 'apx500' THEN
      'Welcome to APx500! This onboarding session will cover:
• Plugin installation and activation
• Integration with Audio Precision APx500
• Measurement workflows and automation
• Best practices and tips
• Q&A session' ||
      CASE WHEN s.subscription_type = 'trial'
        THEN E'\n\n⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
        ELSE ''
      END
    ELSE osb.description
  END
FROM subscriptions s
WHERE osb.user_id = s.user_id
  AND s.status = 'active'
  AND (osb.product_category IN ('other', 'plugin_klippel_qc', 'plugin_apx500') OR osb.product_name LIKE '%Lyceum%');

-- ============================================
-- STEP 4: Update old plugin category names to simplified "plugin"
-- ============================================

UPDATE onboarding_session_bookings
SET product_category = 'plugin'
WHERE product_category IN ('plugin_klippel_qc', 'plugin_apx500');

-- ============================================
-- STEP 5: Verify the updates
-- ============================================

SELECT
  'After Update' as step,
  product_category,
  product_name,
  COUNT(*) as count
FROM onboarding_session_bookings
WHERE status IN ('suggested', 'scheduled', 'confirmed')
GROUP BY product_category, product_name
ORDER BY product_category, product_name;

-- ============================================
-- STEP 6: Show detailed view of all active sessions
-- ============================================

SELECT
  osb.id,
  osb.title,
  osb.product_category,
  osb.product_name,
  osb.status,
  LEFT(osb.description, 80) as description_preview,
  lk.license_type,
  s.subscription_category,
  s.plugin_type
FROM onboarding_session_bookings osb
LEFT JOIN license_keys lk ON osb.license_key_id = lk.id
LEFT JOIN subscriptions s ON s.user_id = osb.user_id AND s.status = 'active'
WHERE osb.status IN ('suggested', 'scheduled', 'confirmed')
ORDER BY osb.created_at DESC;
