-- Add missing company column to user_profiles table
-- Run this in Supabase SQL Editor

-- Check if column already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'company'
  ) THEN
    -- Add the company column
    ALTER TABLE public.user_profiles
    ADD COLUMN company TEXT;

    RAISE NOTICE '✅ Added company column to user_profiles table';
  ELSE
    RAISE NOTICE '⚠️ company column already exists in user_profiles table';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Success message
SELECT '✅ Migration complete! Company column is now available in user_profiles table.' AS status;
