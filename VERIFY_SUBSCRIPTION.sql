-- ============================================
-- VERIFY SUBSCRIPTION AND LICENSE EXISTS
-- ============================================
-- Check if subscription and license were created for farbisimo@gmail.com
-- ============================================

-- USER INFO
SELECT 'USER INFO' as section;
SELECT id, email FROM auth.users WHERE email = 'farbisimo@gmail.com';

-- SUBSCRIPTIONS
SELECT '---' as separator;
SELECT 'SUBSCRIPTIONS' as section;
SELECT
  id,
  subscription_category,
  subscription_type,
  status,
  stripe_subscription_id,
  trial_start_date,
  trial_end_date,
  created_at
FROM subscriptions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'farbisimo@gmail.com')
ORDER BY created_at DESC;

-- LICENSES
SELECT '---' as separator;
SELECT 'LICENSES' as section;
SELECT
  id,
  key_code,
  license_type,
  status,
  time_limit_type,
  expires_at,
  created_at
FROM license_keys
WHERE assigned_to = (SELECT id FROM auth.users WHERE email = 'farbisimo@gmail.com')
ORDER BY created_at DESC;

-- LICENSE-SUBSCRIPTION RELATIONSHIPS
SELECT '---' as separator;
SELECT 'RELATIONSHIPS' as section;
SELECT
  lsr.id,
  lk.key_code,
  s.subscription_type,
  s.status as subscription_status,
  lsr.relationship_type,
  lsr.created_at
FROM license_subscription_relationships lsr
JOIN license_keys lk ON lk.id = lsr.license_id
JOIN subscriptions s ON s.id = lsr.subscription_id
WHERE lk.assigned_to = (SELECT id FROM auth.users WHERE email = 'farbisimo@gmail.com')
ORDER BY lsr.created_at DESC;
