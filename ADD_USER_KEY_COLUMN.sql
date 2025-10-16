-- Migration: Add persistent user_key column to user_profiles
-- This fixes the issue where user keys were dynamically generated based on array indices
-- causing wrong user profiles to be displayed in the admin portal

-- Step 1: Add the user_key column to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS user_key TEXT UNIQUE;

-- Step 2: Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_key ON public.user_profiles(user_key);

-- Step 3: Backfill existing users with stable keys based on creation order
-- This ensures existing users maintain their expected key assignments
WITH numbered_users AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM public.user_profiles
  WHERE user_key IS NULL
)
UPDATE public.user_profiles up
SET user_key = 'USER-' || nu.row_num
FROM numbered_users nu
WHERE up.id = nu.id;

-- Step 4: Create a function to auto-generate the next available user key
CREATE OR REPLACE FUNCTION generate_next_user_key()
RETURNS TEXT AS $$
DECLARE
  next_key_num INTEGER;
  next_key TEXT;
BEGIN
  -- Find the highest existing key number
  SELECT COALESCE(MAX(CAST(SUBSTRING(user_key FROM 'USER-(.*)') AS INTEGER)), 0) + 1
  INTO next_key_num
  FROM public.user_profiles
  WHERE user_key ~ '^USER-[0-9]+$';

  -- Generate the next key
  next_key := 'USER-' || next_key_num;

  RETURN next_key;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a trigger to auto-assign user keys on insert
CREATE OR REPLACE FUNCTION assign_user_key_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_key IS NULL THEN
    NEW.user_key := generate_next_user_key();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_user_key ON public.user_profiles;
CREATE TRIGGER trigger_assign_user_key
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_user_key_on_insert();

-- Step 6: Verify the migration
SELECT
  id,
  email,
  user_key,
  created_at
FROM public.user_profiles
ORDER BY created_at ASC;
