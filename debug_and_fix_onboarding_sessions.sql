-- Debug and Fix Onboarding Sessions Product Information

-- Step 1: Check current state of onboarding sessions
SELECT
  osb.id,
  osb.title,
  osb.product_category,
  osb.product_name,
  osb.status,
  osb.license_key_id,
  lk.license_type,
  lk.status as license_status,
  s.subscription_category,
  s.plugin_type
FROM onboarding_session_bookings osb
LEFT JOIN license_keys lk ON osb.license_key_id = lk.id
LEFT JOIN license_subscription_relationships lsr ON lsr.license_id = lk.id
LEFT JOIN subscriptions s ON s.id = lsr.subscription_id
WHERE osb.status IN ('suggested', 'scheduled', 'confirmed')
ORDER BY osb.created_at DESC;

-- Step 2: Fix sessions that don't have product information
-- Update based on license type
UPDATE onboarding_session_bookings osb
SET
  product_category = CASE
    WHEN lk.license_type = 'main-application' THEN 'native_app'
    WHEN s.plugin_type = 'klippel_qc' THEN 'plugin_klippel_qc'
    WHEN s.plugin_type = 'apx500' THEN 'plugin_apx500'
    ELSE 'other'
  END,
  product_name = CASE
    WHEN lk.license_type = 'main-application' THEN 'Lyceum Native App'
    WHEN s.plugin_type = 'klippel_qc' THEN 'Klippel QC Plugin'
    WHEN s.plugin_type = 'apx500' THEN 'APX500 Plugin'
    ELSE 'Lyceum Product'
  END,
  title = CASE
    WHEN lk.license_type = 'main-application' THEN
      'Native App Onboarding - ' ||
      CASE
        WHEN lk.status = 'trial' THEN 'Trial'
        WHEN lk.license_type = 'basic' THEN 'Basic Plan'
        WHEN lk.license_type = 'professional' THEN 'Professional Plan'
        WHEN lk.license_type = 'enterprise' THEN 'Enterprise Plan'
        ELSE 'Subscription'
      END
    WHEN s.plugin_type = 'klippel_qc' THEN
      'Klippel QC Plugin Onboarding - ' ||
      CASE WHEN lk.status = 'trial' THEN 'Trial' ELSE 'Subscription' END
    WHEN s.plugin_type = 'apx500' THEN
      'APX500 Plugin Onboarding - ' ||
      CASE WHEN lk.status = 'trial' THEN 'Trial' ELSE 'Subscription' END
    ELSE osb.title
  END,
  description = CASE
    WHEN lk.license_type = 'main-application' THEN
      'Welcome to Lyceum Native App! This onboarding session will help you:
• Install and set up the desktop application
• Connect your local cluster
• Configure your first project
• Learn key features and workflows
• Get answers to your questions' ||
      CASE WHEN lk.status = 'trial'
        THEN E'\n\n⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
        ELSE ''
      END
    WHEN s.plugin_type = 'klippel_qc' THEN
      'Welcome to the Klippel QC Plugin! This onboarding session will cover:
• Plugin installation and activation
• Integration with your Klippel QC system
• Data import and analysis workflows
• Best practices and tips
• Q&A session' ||
      CASE WHEN lk.status = 'trial'
        THEN E'\n\n⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
        ELSE ''
      END
    WHEN s.plugin_type = 'apx500' THEN
      'Welcome to the APX500 Plugin! This onboarding session will cover:
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
LEFT JOIN license_subscription_relationships lsr ON lsr.license_id = lk.id
LEFT JOIN subscriptions s ON s.id = lsr.subscription_id
WHERE osb.license_key_id = lk.id
  AND (osb.product_category IS NULL OR osb.product_name IS NULL);

-- Step 3: For sessions without relationships, try to infer from user's subscriptions
UPDATE onboarding_session_bookings osb
SET
  product_category = CASE
    WHEN s.subscription_category = 'native_app' THEN 'native_app'
    WHEN s.plugin_type = 'klippel_qc' THEN 'plugin_klippel_qc'
    WHEN s.plugin_type = 'apx500' THEN 'plugin_apx500'
    ELSE 'other'
  END,
  product_name = CASE
    WHEN s.subscription_category = 'native_app' THEN 'Lyceum Native App'
    WHEN s.plugin_type = 'klippel_qc' THEN 'Klippel QC Plugin'
    WHEN s.plugin_type = 'apx500' THEN 'APX500 Plugin'
    ELSE 'Lyceum Product'
  END,
  title = CASE
    WHEN s.subscription_category = 'native_app' THEN
      'Native App Onboarding - ' ||
      CASE WHEN s.subscription_type = 'trial' THEN 'Trial' ELSE 'Subscription' END
    WHEN s.plugin_type = 'klippel_qc' THEN
      'Klippel QC Plugin Onboarding - ' ||
      CASE WHEN s.subscription_type = 'trial' THEN 'Trial' ELSE 'Subscription' END
    WHEN s.plugin_type = 'apx500' THEN
      'APX500 Plugin Onboarding - ' ||
      CASE WHEN s.subscription_type = 'trial' THEN 'Trial' ELSE 'Subscription' END
    ELSE osb.title
  END,
  description = CASE
    WHEN s.subscription_category = 'native_app' THEN
      'Welcome to Lyceum Native App! This onboarding session will help you:
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
      'Welcome to the Klippel QC Plugin! This onboarding session will cover:
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
      'Welcome to the APX500 Plugin! This onboarding session will cover:
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
  AND (osb.product_category IS NULL OR osb.product_name IS NULL)
  AND osb.status IN ('suggested', 'scheduled', 'confirmed');

-- Step 4: Verify the fix
SELECT
  osb.id,
  osb.title,
  osb.product_category,
  osb.product_name,
  osb.status,
  LEFT(osb.description, 100) as description_preview
FROM onboarding_session_bookings osb
WHERE osb.status IN ('suggested', 'scheduled', 'confirmed')
ORDER BY osb.created_at DESC;
