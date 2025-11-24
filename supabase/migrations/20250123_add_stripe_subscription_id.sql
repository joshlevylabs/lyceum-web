-- Migration: Add stripe_subscription_id to user_subscriptions_native_app
-- Created: 2025-01-23
-- Description: Add column to track Stripe recurring subscription IDs

-- Add stripe_subscription_id column for recurring subscriptions
ALTER TABLE user_subscriptions_native_app
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add index for Stripe subscription lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_native_app_stripe_sub
ON user_subscriptions_native_app(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN user_subscriptions_native_app.stripe_subscription_id IS 'Stripe Subscription ID for recurring payments (null for one-time payments)';

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions_native_app'
    AND column_name = 'stripe_subscription_id'
  ) THEN
    RAISE NOTICE '✅ Column stripe_subscription_id added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add column stripe_subscription_id';
  END IF;
END $$;
