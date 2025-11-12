-- Fix user's subscription from trial to paid
-- This converts the trial subscription to a paid subscription since user has payment methods

-- First, check what columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'native_app_subscriptions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Update the subscription (only update columns that exist)
-- Based on the error, we'll only update subscription_type
UPDATE native_app_subscriptions
SET
  subscription_type = 'paid',
  updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'josh@thelyceum.io')
  AND subscription_type = 'trial'
  AND status = 'active';

-- Also check if expires_at column exists and clear it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'native_app_subscriptions'
      AND column_name = 'expires_at'
  ) THEN
    UPDATE native_app_subscriptions
    SET expires_at = NULL
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'josh@thelyceum.io')
      AND subscription_type = 'paid'
      AND status = 'active';
    RAISE NOTICE 'Cleared expires_at for paid subscription';
  END IF;
END $$;

-- Verify the update
SELECT
  'Updated Subscription:' as info,
  *
FROM native_app_subscriptions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'josh@thelyceum.io')
ORDER BY created_at DESC
LIMIT 1;
