-- Quick fix for your onboarding sessions

-- First, let's see what we're working with
SELECT
  osb.id,
  osb.title,
  osb.product_category,
  osb.product_name,
  osb.user_id,
  lk.id as license_id,
  lk.license_type,
  lk.status as license_status,
  lk.assigned_to,
  s.subscription_category,
  s.plugin_type
FROM onboarding_session_bookings osb
LEFT JOIN license_keys lk ON osb.license_key_id = lk.id
LEFT JOIN subscriptions s ON s.user_id = osb.user_id AND s.status = 'active'
WHERE osb.status = 'suggested'
ORDER BY osb.created_at DESC;

-- Now fix all suggested sessions for native app
UPDATE onboarding_session_bookings
SET
  product_category = 'native_app',
  product_name = 'Lyceum Native App',
  title = 'Native App Onboarding - Trial',
  description = 'Welcome to Lyceum Native App! This onboarding session will help you:
• Install and set up the desktop application
• Connect your local cluster
• Configure your first project
• Learn key features and workflows
• Get answers to your questions

⚠️ REQUIRED: This session must be scheduled within 14 days or your trial license will be revoked.'
WHERE status = 'suggested'
  AND (product_category IS NULL OR product_name IS NULL)
  AND EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = onboarding_session_bookings.user_id
    AND s.subscription_category = 'native_app'
    AND s.status = 'active'
  );

-- Verify the update
SELECT
  id,
  title,
  product_category,
  product_name,
  LEFT(description, 80) as desc_preview
FROM onboarding_session_bookings
WHERE status = 'suggested'
ORDER BY created_at DESC;
