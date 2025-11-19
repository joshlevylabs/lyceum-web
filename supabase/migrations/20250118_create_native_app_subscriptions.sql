-- Migration: Create Native App Subscriptions System
-- Created: 2025-01-18
-- Description: Create tables for managing native app subscriptions and licenses

-- ============================================
-- Table: user_subscriptions_native_app
-- Purpose: Track trial and paid subscriptions for native desktop app
-- ============================================

CREATE TABLE IF NOT EXISTS user_subscriptions_native_app (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('trial', 'paid')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  stripe_session_id TEXT,
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_setup_intent_id TEXT,
  amount_paid_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  trial_start_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Index for finding user's active subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_native_app_user_status
ON user_subscriptions_native_app(user_id, status);

-- Index for Stripe session lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_native_app_stripe_session
ON user_subscriptions_native_app(stripe_session_id);

-- Index for finding subscriptions by user
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_native_app_user_id
ON user_subscriptions_native_app(user_id);

-- Index for finding expired trials
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_native_app_trial_end
ON user_subscriptions_native_app(trial_end_date)
WHERE subscription_type = 'trial' AND status = 'active';

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE user_subscriptions_native_app ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON user_subscriptions_native_app
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for API endpoints)
CREATE POLICY "Service role has full access"
ON user_subscriptions_native_app
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- Updated At Trigger
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER set_subscriptions_updated_at
BEFORE UPDATE ON user_subscriptions_native_app
FOR EACH ROW
EXECUTE FUNCTION update_subscriptions_updated_at();

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE user_subscriptions_native_app IS 'Tracks trial and paid subscriptions for the native desktop application';
COMMENT ON COLUMN user_subscriptions_native_app.subscription_type IS 'Type of subscription: trial (30-day free) or paid (lifetime $49)';
COMMENT ON COLUMN user_subscriptions_native_app.status IS 'Subscription status: active, cancelled, or expired';
COMMENT ON COLUMN user_subscriptions_native_app.stripe_session_id IS 'Stripe Checkout or Setup session ID';
COMMENT ON COLUMN user_subscriptions_native_app.stripe_setup_intent_id IS 'Stripe Setup Intent ID (for trial payment method collection)';
COMMENT ON COLUMN user_subscriptions_native_app.stripe_payment_intent_id IS 'Stripe Payment Intent ID (for paid subscriptions)';
COMMENT ON COLUMN user_subscriptions_native_app.amount_paid_cents IS 'Amount paid in cents (0 for trial, 4900 for $49 paid)';
COMMENT ON COLUMN user_subscriptions_native_app.trial_start_date IS 'When trial period started (null for paid)';
COMMENT ON COLUMN user_subscriptions_native_app.trial_end_date IS 'When trial period ends (null for paid)';

-- ============================================
-- Verification Queries
-- ============================================

-- Check that table was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'user_subscriptions_native_app'
  ) THEN
    RAISE NOTICE '✅ Table user_subscriptions_native_app created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create table user_subscriptions_native_app';
  END IF;
END $$;

-- Show table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_subscriptions_native_app'
ORDER BY ordinal_position;
