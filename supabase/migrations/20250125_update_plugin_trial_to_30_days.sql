-- Update plugin trial duration from 14 days to 30 days
-- This affects all plugins in the store

-- 1. Update the default value for new plugins
ALTER TABLE plugins
ALTER COLUMN trial_duration_days SET DEFAULT 30;

-- 2. Update existing plugins that currently have 14-day trials to 30 days
UPDATE plugins
SET trial_duration_days = 30,
    updated_at = NOW()
WHERE trial_duration_days = 14
   AND has_free_trial = true;

-- 3. Log the changes
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM plugins
    WHERE trial_duration_days = 30 AND has_free_trial = true;

    RAISE NOTICE '✅ Updated plugin trial duration to 30 days';
    RAISE NOTICE '   Total plugins with 30-day trials: %', updated_count;
END $$;
