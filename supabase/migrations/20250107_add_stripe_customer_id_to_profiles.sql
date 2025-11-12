-- Add stripe_customer_id column to user_profiles table
-- This allows us to cache the Stripe customer ID to avoid repeated API lookups

-- Add column if it doesn't exist
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

    RAISE NOTICE 'Added stripe_customer_id column to user_profiles';
  ELSE
    RAISE NOTICE 'stripe_customer_id column already exists in user_profiles';
  END IF;
END $$;
