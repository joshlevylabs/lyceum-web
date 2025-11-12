-- ==============================================================================
-- APPLY ALL PAYMENT SYSTEM MIGRATIONS
-- ==============================================================================
-- This script applies all necessary migrations for the payment system
-- Run this in Supabase SQL Editor to set up all required tables and columns
-- ==============================================================================

-- ==============================================================================
-- MIGRATION 1: Add stripe_customer_id to user_profiles
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN stripe_customer_id TEXT;

    -- Create index for faster lookups by Stripe customer ID
    CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id
    ON user_profiles(stripe_customer_id);

    -- Add comment
    COMMENT ON COLUMN user_profiles.stripe_customer_id IS 'Stripe customer ID for payment processing';

    RAISE NOTICE '✅ Added stripe_customer_id column to user_profiles';
  ELSE
    RAISE NOTICE '✅ stripe_customer_id column already exists in user_profiles';
  END IF;
END $$;

-- ==============================================================================
-- MIGRATION 2: Create stored_payment_methods table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS stored_payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_last_four TEXT NOT NULL,
  card_brand TEXT NOT NULL,
  card_exp_month INTEGER NOT NULL,
  card_exp_year INTEGER NOT NULL,
  billing_zip TEXT NOT NULL,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_card UNIQUE (user_id, card_last_four, card_exp_month, card_exp_year)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_stored_payment_methods_user_id
ON stored_payment_methods(user_id);

-- Enable RLS
ALTER TABLE stored_payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own payment methods" ON stored_payment_methods;
DROP POLICY IF EXISTS "Users can insert their own payment methods" ON stored_payment_methods;
DROP POLICY IF EXISTS "Users can update their own payment methods" ON stored_payment_methods;
DROP POLICY IF EXISTS "Users can delete their own payment methods" ON stored_payment_methods;

-- Policy: Users can view their own payment methods
CREATE POLICY "Users can view their own payment methods"
ON stored_payment_methods
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own payment methods
CREATE POLICY "Users can insert their own payment methods"
ON stored_payment_methods
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own payment methods
CREATE POLICY "Users can update their own payment methods"
ON stored_payment_methods
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can delete their own payment methods
CREATE POLICY "Users can delete their own payment methods"
ON stored_payment_methods
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stored_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_stored_payment_methods_updated_at_trigger ON stored_payment_methods;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_stored_payment_methods_updated_at_trigger
BEFORE UPDATE ON stored_payment_methods
FOR EACH ROW
EXECUTE FUNCTION update_stored_payment_methods_updated_at();

-- Comments
COMMENT ON TABLE stored_payment_methods IS 'Stores user payment methods for reuse (PCI-compliant - no full card numbers)';
COMMENT ON COLUMN stored_payment_methods.card_last_four IS 'Last 4 digits of card number';
COMMENT ON COLUMN stored_payment_methods.card_brand IS 'Card brand (visa, mastercard, amex, discover)';
COMMENT ON COLUMN stored_payment_methods.is_default IS 'Whether this is the default payment method';

-- ==============================================================================
-- MIGRATION 3: Create payment_transactions table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL,
  subscription_type TEXT,
  card_last_four TEXT,
  card_brand TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON payment_transactions;

-- Policy: Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
ON payment_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Service role can insert transactions
CREATE POLICY "Users can insert their own transactions"
ON payment_transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_payment_transactions_updated_at_trigger ON payment_transactions;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_payment_transactions_updated_at_trigger
BEFORE UPDATE ON payment_transactions
FOR EACH ROW
EXECUTE FUNCTION update_payment_transactions_updated_at();

-- Comments
COMMENT ON TABLE payment_transactions IS 'Tracks all payment transactions for billing history';
COMMENT ON COLUMN payment_transactions.transaction_id IS 'Stripe payment intent ID or charge ID';
COMMENT ON COLUMN payment_transactions.status IS 'Transaction status (pending, completed, failed, refunded)';

-- ==============================================================================
-- MIGRATION 4: Create native_app_subscriptions table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS native_app_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL,
  status TEXT NOT NULL,
  trial_end_date TIMESTAMP WITH TIME ZONE,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_native_app_subscriptions_user_id ON native_app_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_native_app_subscriptions_status ON native_app_subscriptions(status);

-- Enable RLS
ALTER TABLE native_app_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON native_app_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON native_app_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON native_app_subscriptions;

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON native_app_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own subscriptions
CREATE POLICY "Users can insert their own subscriptions"
ON native_app_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own subscriptions
CREATE POLICY "Users can update their own subscriptions"
ON native_app_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_native_app_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_native_app_subscriptions_updated_at_trigger ON native_app_subscriptions;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_native_app_subscriptions_updated_at_trigger
BEFORE UPDATE ON native_app_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_native_app_subscriptions_updated_at();

-- Comments
COMMENT ON TABLE native_app_subscriptions IS 'Manages native app subscription status (trial/paid)';
COMMENT ON COLUMN native_app_subscriptions.subscription_type IS 'Type of subscription (trial, monthly, annual)';
COMMENT ON COLUMN native_app_subscriptions.status IS 'Subscription status (active, expired, cancelled)';

-- ==============================================================================
-- FINAL STATUS CHECK
-- ==============================================================================
DO $$
DECLARE
  v_has_stripe_column BOOLEAN;
  v_has_payment_methods BOOLEAN;
  v_has_transactions BOOLEAN;
  v_has_subscriptions BOOLEAN;
BEGIN
  -- Check stripe_customer_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'stripe_customer_id'
  ) INTO v_has_stripe_column;

  -- Check tables
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'stored_payment_methods'
  ) INTO v_has_payment_methods;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions'
  ) INTO v_has_transactions;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'native_app_subscriptions'
  ) INTO v_has_subscriptions;

  RAISE NOTICE '';
  RAISE NOTICE '==============================================================================';
  RAISE NOTICE 'MIGRATION STATUS SUMMARY';
  RAISE NOTICE '==============================================================================';

  IF v_has_stripe_column THEN
    RAISE NOTICE '✅ stripe_customer_id column exists in user_profiles';
  ELSE
    RAISE NOTICE '❌ stripe_customer_id column missing from user_profiles';
  END IF;

  IF v_has_payment_methods THEN
    RAISE NOTICE '✅ stored_payment_methods table exists';
  ELSE
    RAISE NOTICE '❌ stored_payment_methods table missing';
  END IF;

  IF v_has_transactions THEN
    RAISE NOTICE '✅ payment_transactions table exists';
  ELSE
    RAISE NOTICE '❌ payment_transactions table missing';
  END IF;

  IF v_has_subscriptions THEN
    RAISE NOTICE '✅ native_app_subscriptions table exists';
  ELSE
    RAISE NOTICE '❌ native_app_subscriptions table missing';
  END IF;

  IF v_has_stripe_column AND v_has_payment_methods AND v_has_transactions AND v_has_subscriptions THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ALL MIGRATIONS APPLIED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run QUICK_DIAGNOSTIC.sql to verify everything is set up correctly';
    RAISE NOTICE '2. Test payment method detection by clicking "Start Free Trial"';
    RAISE NOTICE '3. Check browser console and terminal logs for detailed output';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Some migrations failed. Please check the errors above.';
  END IF;

  RAISE NOTICE '==============================================================================';
END $$;
