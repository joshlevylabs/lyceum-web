-- Migration: Prevent duplicate main-application licenses per user
-- Created: 2025-01-23
-- Description: Add unique constraint to prevent multiple active main-application licenses per user

-- First, check for existing duplicates and mark older ones as superseded
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Find users with multiple active main-application licenses
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT assigned_to, COUNT(*) as license_count
    FROM license_keys
    WHERE license_type = 'main-application'
      AND status IN ('active', 'trial')
      AND assigned_to IS NOT NULL
    GROUP BY assigned_to
    HAVING COUNT(*) > 1
  ) AS duplicates;

  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % users with duplicate licenses. Marking older licenses as superseded...', duplicate_count;

    -- Keep the newest license for each user, mark older ones as superseded
    UPDATE license_keys lk
    SET status = 'superseded',
        updated_at = NOW()
    WHERE lk.id IN (
      SELECT id
      FROM (
        SELECT id, assigned_to,
               ROW_NUMBER() OVER (PARTITION BY assigned_to ORDER BY created_at DESC) as rn
        FROM license_keys
        WHERE license_type = 'main-application'
          AND status IN ('active', 'trial')
          AND assigned_to IS NOT NULL
      ) ranked
      WHERE rn > 1
    );

    RAISE NOTICE '✅ Cleaned up duplicate licenses';
  ELSE
    RAISE NOTICE '✅ No duplicate licenses found';
  END IF;
END $$;

-- Add partial unique index to prevent duplicate active main-application licenses
-- Using partial index because we only want to enforce uniqueness for active/trial licenses
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_main_app_license_per_user
ON license_keys(assigned_to, license_type)
WHERE license_type = 'main-application'
  AND status IN ('active', 'trial')
  AND assigned_to IS NOT NULL;

COMMENT ON INDEX idx_unique_active_main_app_license_per_user IS
  'Ensures each user can only have one active or trial main-application license';

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_unique_active_main_app_license_per_user'
  ) THEN
    RAISE NOTICE '✅ Unique constraint on licenses created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create unique constraint';
  END IF;
END $$;

-- Show any remaining potential conflicts
SELECT assigned_to, COUNT(*) as license_count, ARRAY_AGG(key_code) as licenses
FROM license_keys
WHERE license_type = 'main-application'
  AND status IN ('active', 'trial')
  AND assigned_to IS NOT NULL
GROUP BY assigned_to
HAVING COUNT(*) > 1;
