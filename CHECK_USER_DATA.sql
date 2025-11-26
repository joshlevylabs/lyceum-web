-- ============================================
-- CHECK USER DATA - Diagnostic Query
-- ============================================
-- This queries all subscription and license data for a specific user
-- Replace the email address with the user you want to check
-- ============================================

-- USER INFO
-- ============================================
SELECT 'USER INFO' as section, '==================' as separator
UNION ALL
SELECT
  'User ID: ' || u.id,
  'Email: ' || u.email
FROM auth.users u
WHERE u.email = 'farbisimo@gmail.com'
UNION ALL
SELECT
  'Full Name: ' || COALESCE(up.full_name, 'N/A'),
  'Company: ' || COALESCE(up.company, 'N/A')
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id
WHERE u.email = 'farbisimo@gmail.com'
UNION ALL
SELECT
  'Role: ' || COALESCE(up.role, 'N/A'),
  ''
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id
WHERE u.email = 'farbisimo@gmail.com';

-- SUBSCRIPTIONS
-- ============================================
SELECT 'SUBSCRIPTIONS' as section, '==================' as separator;

SELECT
  s.id as subscription_id,
  s.subscription_category,
  s.subscription_type,
  s.status,
  s.plugin_type,
  s.trial_start_date,
  s.trial_end_date,
  s.created_at,
  s.updated_at
FROM auth.users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE u.email = 'farbisimo@gmail.com'
ORDER BY s.created_at DESC;

-- LICENSES
-- ============================================
SELECT 'LICENSES' as section, '==================' as separator;

SELECT
  lk.id as license_id,
  lk.key_code,
  lk.license_type,
  lk.status,
  lk.time_limit_type,
  lk.expires_at,
  lk.created_at,
  lk.assigned_at
FROM auth.users u
LEFT JOIN license_keys lk ON lk.assigned_to = u.id
WHERE u.email = 'farbisimo@gmail.com'
ORDER BY lk.created_at DESC;

-- LICENSE-SUBSCRIPTION RELATIONSHIPS
-- ============================================
SELECT 'LICENSE-SUBSCRIPTION RELATIONSHIPS' as section, '==================' as separator;

SELECT
  lsr.id as relationship_id,
  lk.key_code as license_key,
  s.subscription_type,
  s.subscription_category,
  lsr.relationship_type,
  lsr.created_at
FROM auth.users u
LEFT JOIN license_keys lk ON lk.assigned_to = u.id
LEFT JOIN license_subscription_relationships lsr ON lsr.license_id = lk.id
LEFT JOIN subscriptions s ON s.id = lsr.subscription_id
WHERE u.email = 'farbisimo@gmail.com'
ORDER BY lsr.created_at DESC;

-- ONBOARDING SESSIONS
-- ============================================
SELECT 'ONBOARDING SESSIONS' as section, '==================' as separator;

SELECT
  osb.id as booking_id,
  osb.session_type,
  osb.status,
  osb.is_mandatory,
  osb.is_trial_required,
  osb.trial_deadline,
  osb.scheduled_start_time,
  lk.key_code as license_key,
  lk.status as license_status
FROM auth.users u
LEFT JOIN onboarding_session_bookings osb ON osb.user_id = u.id
LEFT JOIN license_keys lk ON lk.id = osb.license_key_id
WHERE u.email = 'farbisimo@gmail.com'
ORDER BY osb.created_at DESC;

-- SUMMARY COUNTS
-- ============================================
SELECT 'SUMMARY' as section, '==================' as separator;

SELECT
  COUNT(DISTINCT s.id) as total_subscriptions,
  COUNT(DISTINCT CASE WHEN s.subscription_type = 'trial' THEN s.id END) as trial_subscriptions,
  COUNT(DISTINCT CASE WHEN s.subscription_type = 'paid' THEN s.id END) as paid_subscriptions,
  COUNT(DISTINCT lk.id) as total_licenses,
  COUNT(DISTINCT CASE WHEN lk.status = 'trial' THEN lk.id END) as trial_licenses,
  COUNT(DISTINCT CASE WHEN lk.status = 'active' THEN lk.id END) as active_licenses
FROM auth.users u
LEFT JOIN subscriptions s ON s.user_id = u.id
LEFT JOIN license_keys lk ON lk.assigned_to = u.id
WHERE u.email = 'farbisimo@gmail.com';
