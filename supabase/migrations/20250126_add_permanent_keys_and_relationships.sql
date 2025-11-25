-- Migration: Add Permanent Keys and Subscription Consolidation
-- Created: 2025-01-26
-- Description:
--   1. Add permanent sticky keys to licenses (LIC-1, LIC-2, etc.)
--   2. Add permanent sticky keys to subscriptions (SUB-1, SUB-2, etc.)
--   3. Combine user_subscriptions_native_app and plugin_subscriptions into single subscriptions table
--   4. Create license_subscription_relationships table
--   5. Ensure keys never change when records are deleted

-- ============================================
-- PART 1: Add permanent license_key to license_keys table
-- ============================================

-- Add license_key column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'license_keys' AND column_name = 'license_key'
  ) THEN
    ALTER TABLE license_keys ADD COLUMN license_key TEXT UNIQUE;
    RAISE NOTICE '✅ Added license_key column to license_keys table';
  ELSE
    RAISE NOTICE 'ℹ️ license_key column already exists in license_keys table';
  END IF;
END $$;

-- Create sequence for license keys if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS license_key_seq START 1;

-- Function to generate next license key
CREATE OR REPLACE FUNCTION generate_license_key()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  next_num := nextval('license_key_seq');
  RETURN 'LIC-' || next_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate license_key on insert if not provided
CREATE OR REPLACE FUNCTION set_license_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.license_key IS NULL THEN
    NEW.license_key := generate_license_key();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_license_key ON license_keys;
CREATE TRIGGER trigger_set_license_key
  BEFORE INSERT ON license_keys
  FOR EACH ROW
  EXECUTE FUNCTION set_license_key();

-- Backfill existing licenses with permanent keys (sorted by created_at)
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 1;
BEGIN
  -- Only backfill if there are licenses without keys
  IF EXISTS (SELECT 1 FROM license_keys WHERE license_key IS NULL LIMIT 1) THEN
    FOR rec IN
      SELECT id FROM license_keys
      WHERE license_key IS NULL
      ORDER BY created_at ASC
    LOOP
      UPDATE license_keys
      SET license_key = 'LIC-' || counter
      WHERE id = rec.id;
      counter := counter + 1;
    END LOOP;

    -- Set sequence to next available number
    PERFORM setval('license_key_seq', counter);
    RAISE NOTICE '✅ Backfilled % license keys', counter - 1;
  ELSE
    RAISE NOTICE 'ℹ️ All licenses already have keys';
  END IF;
END $$;

-- ============================================
-- PART 2: Create unified subscriptions table
-- ============================================

-- Create new subscriptions table that combines native app and plugin subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_key TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription type and category
  subscription_category TEXT NOT NULL CHECK (subscription_category IN ('native_app', 'plugin')),
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('trial', 'paid')),
  plugin_type TEXT CHECK (
    (subscription_category = 'plugin' AND plugin_type IN ('klippel_qc', 'apx500')) OR
    (subscription_category = 'native_app' AND plugin_type IS NULL)
  ),

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),

  -- Stripe payment information
  stripe_session_id TEXT,
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_setup_intent_id TEXT,
  stripe_subscription_id TEXT, -- For recurring subscriptions

  -- Payment details
  amount_paid_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'usd',

  -- Trial information
  trial_start_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE,

  -- Cancellation
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sequence for subscription keys
CREATE SEQUENCE IF NOT EXISTS subscription_key_seq START 1;

-- Function to generate next subscription key
CREATE OR REPLACE FUNCTION generate_subscription_key()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  next_num := nextval('subscription_key_seq');
  RETURN 'SUB-' || next_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate subscription_key on insert
CREATE OR REPLACE FUNCTION set_subscription_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subscription_key IS NULL THEN
    NEW.subscription_key := generate_subscription_key();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_subscription_key ON subscriptions;
CREATE TRIGGER trigger_set_subscription_key
  BEFORE INSERT ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_subscription_key();

-- Create indexes for subscriptions table
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_key ON subscriptions(subscription_key);
CREATE INDEX IF NOT EXISTS idx_subscriptions_category ON subscriptions(subscription_category);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_session ON subscriptions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plugin_type ON subscriptions(plugin_type);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can delete subscriptions"
  ON subscriptions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

-- Updated_at trigger for subscriptions
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- ============================================
-- PART 3: Migrate existing data to new subscriptions table
-- ============================================

-- Migrate native app subscriptions
DO $$
DECLARE
  counter INTEGER := 1;
  rec RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions_native_app') THEN
    FOR rec IN
      SELECT * FROM user_subscriptions_native_app
      ORDER BY created_at ASC
    LOOP
      INSERT INTO subscriptions (
        id,
        subscription_key,
        user_id,
        subscription_category,
        subscription_type,
        plugin_type,
        status,
        stripe_session_id,
        stripe_customer_id,
        stripe_payment_intent_id,
        stripe_setup_intent_id,
        stripe_subscription_id,
        amount_paid_cents,
        currency,
        trial_start_date,
        trial_end_date,
        cancelled_at,
        metadata,
        created_at,
        updated_at
      ) VALUES (
        rec.id,
        'SUB-' || counter,
        rec.user_id,
        'native_app',
        rec.subscription_type,
        NULL,
        rec.status,
        rec.stripe_session_id,
        rec.stripe_customer_id,
        rec.stripe_payment_intent_id,
        rec.stripe_setup_intent_id,
        rec.stripe_subscription_id,
        rec.amount_paid_cents,
        rec.currency,
        rec.trial_start_date,
        rec.trial_end_date,
        rec.cancelled_at,
        rec.metadata,
        rec.created_at,
        rec.updated_at
      ) ON CONFLICT (id) DO NOTHING;

      counter := counter + 1;
    END LOOP;

    RAISE NOTICE '✅ Migrated % native app subscriptions', counter - 1;

    -- Set sequence to next available number after native app subscriptions
    PERFORM setval('subscription_key_seq', counter);
  END IF;
END $$;

-- Migrate plugin subscriptions
DO $$
DECLARE
  rec RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plugin_subscriptions') THEN
    FOR rec IN
      SELECT * FROM plugin_subscriptions
      ORDER BY created_at ASC
    LOOP
      INSERT INTO subscriptions (
        id,
        subscription_key,
        user_id,
        subscription_category,
        subscription_type,
        plugin_type,
        status,
        stripe_session_id,
        stripe_customer_id,
        amount_paid_cents,
        currency,
        trial_start_date,
        trial_end_date,
        cancelled_at,
        metadata,
        created_at,
        updated_at
      ) VALUES (
        rec.id,
        generate_subscription_key(),
        rec.user_id,
        'plugin',
        rec.subscription_type,
        rec.plugin_type,
        rec.status,
        rec.stripe_session_id,
        rec.stripe_customer_id,
        rec.amount_paid_cents,
        rec.currency,
        rec.trial_start_date,
        rec.trial_end_date,
        rec.cancelled_at,
        '{}',  -- plugin_subscriptions doesn't have metadata column, use empty object
        rec.created_at,
        rec.updated_at
      ) ON CONFLICT (id) DO NOTHING;
    END LOOP;

    RAISE NOTICE '✅ Migrated plugin subscriptions';
  END IF;
END $$;

-- Ensure subscription sequence is set correctly (in case plugin_subscriptions table doesn't exist)
DO $$
DECLARE
  sub_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO sub_count FROM subscriptions;
  IF sub_count > 0 THEN
    PERFORM setval('subscription_key_seq', sub_count + 1);
    RAISE NOTICE '✅ Set subscription sequence to %', sub_count + 1;
  END IF;
END $$;

-- ============================================
-- PART 4: Create license-subscription relationship table
-- ============================================

CREATE TABLE IF NOT EXISTS license_subscription_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES license_keys(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

  -- Relationship metadata
  relationship_type TEXT DEFAULT 'standard' CHECK (relationship_type IN ('standard', 'trial_conversion', 'upgrade', 'addon')),
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one license doesn't have duplicate subscriptions
  UNIQUE(license_id, subscription_id)
);

-- Indexes for relationships table
CREATE INDEX IF NOT EXISTS idx_license_subscription_relationships_license
  ON license_subscription_relationships(license_id);
CREATE INDEX IF NOT EXISTS idx_license_subscription_relationships_subscription
  ON license_subscription_relationships(subscription_id);

-- Enable RLS
ALTER TABLE license_subscription_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for relationships
CREATE POLICY "Users can view own license-subscription relationships"
  ON license_subscription_relationships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = license_subscription_relationships.subscription_id
      AND subscriptions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all license-subscription relationships"
  ON license_subscription_relationships
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

-- Updated_at trigger for relationships
CREATE OR REPLACE FUNCTION update_license_subscription_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_license_subscription_relationships_updated_at
  ON license_subscription_relationships;
CREATE TRIGGER update_license_subscription_relationships_updated_at
  BEFORE UPDATE ON license_subscription_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_license_subscription_relationships_updated_at();

-- ============================================
-- PART 5: Add helper functions
-- ============================================

-- Function to get all subscriptions for a license
CREATE OR REPLACE FUNCTION get_subscriptions_for_license(p_license_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  subscription_key TEXT,
  subscription_category TEXT,
  subscription_type TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.subscription_key,
    s.subscription_category,
    s.subscription_type,
    s.status,
    s.created_at
  FROM subscriptions s
  INNER JOIN license_subscription_relationships lsr
    ON s.id = lsr.subscription_id
  WHERE lsr.license_id = p_license_id
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get all licenses for a subscription
CREATE OR REPLACE FUNCTION get_licenses_for_subscription(p_subscription_id UUID)
RETURNS TABLE (
  license_id UUID,
  license_key TEXT,
  license_type TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lk.id,
    lk.license_key,
    lk.license_type,
    lk.status,
    lk.created_at
  FROM license_keys lk
  INNER JOIN license_subscription_relationships lsr
    ON lk.id = lsr.license_id
  WHERE lsr.subscription_id = p_subscription_id
  ORDER BY lk.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  license_count INTEGER;
  subscription_count INTEGER;
  relationship_count INTEGER;
BEGIN
  -- Count licenses with keys
  SELECT COUNT(*) INTO license_count
  FROM license_keys
  WHERE license_key IS NOT NULL;

  -- Count subscriptions
  SELECT COUNT(*) INTO subscription_count
  FROM subscriptions;

  -- Count relationships
  SELECT COUNT(*) INTO relationship_count
  FROM license_subscription_relationships;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Licenses with permanent keys: %', license_count;
  RAISE NOTICE '✅ Total subscriptions (unified): %', subscription_count;
  RAISE NOTICE '✅ License-Subscription relationships: %', relationship_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎯 Keys are now permanent and will not change when records are deleted!';
  RAISE NOTICE '========================================';
END $$;

-- Show sample data
SELECT 'License Keys Sample:' as info;
SELECT license_key, license_type, status, created_at
FROM license_keys
WHERE license_key IS NOT NULL
ORDER BY created_at ASC
LIMIT 5;

SELECT 'Subscription Keys Sample:' as info;
SELECT subscription_key, subscription_category, subscription_type, status, created_at
FROM subscriptions
ORDER BY created_at ASC
LIMIT 5;
