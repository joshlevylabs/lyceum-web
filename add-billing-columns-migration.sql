-- =====================================================================
-- ADD BILLING COLUMNS TO USER_PROFILES TABLE
-- =====================================================================
-- This migration adds Stripe billing-related columns to the user_profiles table
-- =====================================================================

-- Add billing columns to user_profiles table
DO $$
BEGIN
    -- Check if stripe_customer_id column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN stripe_customer_id VARCHAR(255);
        RAISE NOTICE 'Added stripe_customer_id column to user_profiles table';
    ELSE
        RAISE NOTICE 'stripe_customer_id column already exists in user_profiles table';
    END IF;

    -- Check if subscription_id column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'subscription_id'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN subscription_id VARCHAR(255);
        RAISE NOTICE 'Added subscription_id column to user_profiles table';
    ELSE
        RAISE NOTICE 'subscription_id column already exists in user_profiles table';
    END IF;

    -- Check if subscription_status column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN subscription_status VARCHAR(50);
        RAISE NOTICE 'Added subscription_status column to user_profiles table';
    ELSE
        RAISE NOTICE 'subscription_status column already exists in user_profiles table';
    END IF;

    -- Check if plan_name column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'plan_name'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN plan_name VARCHAR(100);
        RAISE NOTICE 'Added plan_name column to user_profiles table';
    ELSE
        RAISE NOTICE 'plan_name column already exists in user_profiles table';
    END IF;
END;
$$;

-- Add billing columns to database_clusters table
DO $$
BEGIN
    -- Check if billing_status column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'database_clusters' 
        AND column_name = 'billing_status'
    ) THEN
        ALTER TABLE database_clusters ADD COLUMN billing_status VARCHAR(50) DEFAULT 'inactive';
        RAISE NOTICE 'Added billing_status column to database_clusters table';
    ELSE
        RAISE NOTICE 'billing_status column already exists in database_clusters table';
    END IF;

    -- Check if stripe_subscription_id column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'database_clusters' 
        AND column_name = 'stripe_subscription_id'
    ) THEN
        ALTER TABLE database_clusters ADD COLUMN stripe_subscription_id VARCHAR(255);
        RAISE NOTICE 'Added stripe_subscription_id column to database_clusters table';
    ELSE
        RAISE NOTICE 'stripe_subscription_id column already exists in database_clusters table';
    END IF;
END;
$$;

-- Add check constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'user_profiles_subscription_status_check'
    ) THEN
        ALTER TABLE user_profiles 
        ADD CONSTRAINT user_profiles_subscription_status_check 
        CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired'));
        RAISE NOTICE 'Added subscription_status check constraint to user_profiles table';
    ELSE
        RAISE NOTICE 'subscription_status check constraint already exists in user_profiles table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'database_clusters_billing_status_check'
    ) THEN
        ALTER TABLE database_clusters 
        ADD CONSTRAINT database_clusters_billing_status_check 
        CHECK (billing_status IN ('active', 'inactive', 'suspended', 'terminated'));
        RAISE NOTICE 'Added billing_status check constraint to database_clusters table';
    ELSE
        RAISE NOTICE 'billing_status check constraint already exists in database_clusters table';
    END IF;
END;
$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_database_clusters_billing_status ON database_clusters(billing_status);

-- Verification query
SELECT 'BILLING COLUMNS MIGRATION COMPLETED SUCCESSFULLY! 🎉' as status;

SELECT 
    'user_profiles' as table_name,
    COUNT(*) as total_users,
    COUNT(stripe_customer_id) as users_with_stripe,
    COUNT(subscription_id) as users_with_subscription
FROM user_profiles;

SELECT 
    'database_clusters' as table_name,
    COUNT(*) as total_clusters,
    COUNT(CASE WHEN billing_status = 'active' THEN 1 END) as active_billing,
    COUNT(CASE WHEN billing_status = 'inactive' THEN 1 END) as inactive_billing
FROM database_clusters;

-- Final completion notice
DO $$
BEGIN
    RAISE NOTICE 'Billing columns migration completed successfully!';
    RAISE NOTICE 'Users can now subscribe and manage their billing through Stripe.';
END;
$$;
