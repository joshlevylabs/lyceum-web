-- =====================================================================
-- ADD PRICING COLUMNS TO DATABASE_CLUSTERS TABLE
-- =====================================================================
-- This migration adds pricing-related columns to the database_clusters table
-- for backwards compatibility with existing installations
-- =====================================================================

-- Add pricing columns to database_clusters table
DO $$
BEGIN
    -- Check if pricing_model column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'database_clusters' 
        AND column_name = 'pricing_model'
    ) THEN
        ALTER TABLE database_clusters ADD COLUMN pricing_model VARCHAR(50) DEFAULT 'free';
        RAISE NOTICE 'Added pricing_model column to database_clusters table';
    ELSE
        RAISE NOTICE 'pricing_model column already exists in database_clusters table';
    END IF;

    -- Check if max_assigned_users column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'database_clusters' 
        AND column_name = 'max_assigned_users'
    ) THEN
        ALTER TABLE database_clusters ADD COLUMN max_assigned_users INTEGER DEFAULT 1;
        RAISE NOTICE 'Added max_assigned_users column to database_clusters table';
    ELSE
        RAISE NOTICE 'max_assigned_users column already exists in database_clusters table';
    END IF;

    -- Check if trial_length_days column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'database_clusters' 
        AND column_name = 'trial_length_days'
    ) THEN
        ALTER TABLE database_clusters ADD COLUMN trial_length_days INTEGER DEFAULT 30;
        RAISE NOTICE 'Added trial_length_days column to database_clusters table';
    ELSE
        RAISE NOTICE 'trial_length_days column already exists in database_clusters table';
    END IF;

    -- Check if requires_payment column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'database_clusters' 
        AND column_name = 'requires_payment'
    ) THEN
        ALTER TABLE database_clusters ADD COLUMN requires_payment BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added requires_payment column to database_clusters table';
    ELSE
        RAISE NOTICE 'requires_payment column already exists in database_clusters table';
    END IF;
END;
$$;

-- Add check constraints for pricing_model
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'database_clusters_pricing_model_check'
    ) THEN
        ALTER TABLE database_clusters 
        ADD CONSTRAINT database_clusters_pricing_model_check 
        CHECK (pricing_model IN ('free', 'trial', 'paid'));
        RAISE NOTICE 'Added pricing_model check constraint to database_clusters table';
    ELSE
        RAISE NOTICE 'pricing_model check constraint already exists in database_clusters table';
    END IF;
END;
$$;

-- Update existing clusters with default pricing model if null
UPDATE database_clusters 
SET 
    pricing_model = 'free',
    max_assigned_users = 1,
    trial_length_days = 30,
    requires_payment = false
WHERE pricing_model IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_database_clusters_pricing_model ON database_clusters(pricing_model);
CREATE INDEX IF NOT EXISTS idx_database_clusters_requires_payment ON database_clusters(requires_payment);

-- Verification query
SELECT 'PRICING COLUMNS MIGRATION COMPLETED SUCCESSFULLY! 🎉' as status;

SELECT 
    'database_clusters' as table_name,
    COUNT(*) as total_clusters,
    COUNT(CASE WHEN pricing_model = 'free' THEN 1 END) as free_clusters,
    COUNT(CASE WHEN pricing_model = 'trial' THEN 1 END) as trial_clusters,
    COUNT(CASE WHEN pricing_model = 'paid' THEN 1 END) as paid_clusters
FROM database_clusters;

-- Final completion notice
DO $$
BEGIN
    RAISE NOTICE 'Pricing columns migration completed successfully!';
    RAISE NOTICE 'All clusters now have pricing configuration capabilities.';
END;
$$;
