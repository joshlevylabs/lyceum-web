-- Verification Script: Check User Key Implementation
-- Run this after deploying the migration to verify everything is working correctly

-- 1. Check that user_key column exists and has values
SELECT
  id,
  user_key,
  email,
  full_name,
  created_at
FROM public.user_profiles
ORDER BY created_at ASC;

-- 2. Check for any NULL user_keys (should be none)
SELECT COUNT(*) as null_user_keys
FROM public.user_profiles
WHERE user_key IS NULL;

-- 3. Check for duplicate user_keys (should be none)
SELECT user_key, COUNT(*) as count
FROM public.user_profiles
WHERE user_key IS NOT NULL
GROUP BY user_key
HAVING COUNT(*) > 1;

-- 4. Verify the trigger is working - check that it exists
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'user_profiles'
  AND trigger_name = 'trigger_assign_user_key';

-- 5. Check the index exists
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_profiles'
  AND indexname = 'idx_user_profiles_user_key';

-- 6. Test the generate_next_user_key function
SELECT generate_next_user_key() as next_available_key;

-- 7. Check specific user by key (replace USER-3 with the key you want to test)
SELECT
  id,
  user_key,
  email,
  full_name,
  role,
  is_active
FROM public.user_profiles
WHERE user_key = 'USER-3';

-- 8. Verify user_key sequence matches creation order
SELECT
  CAST(SUBSTRING(user_key FROM 'USER-(.*)') AS INTEGER) as key_number,
  user_key,
  email,
  created_at,
  ROW_NUMBER() OVER (ORDER BY created_at ASC) as expected_number
FROM public.user_profiles
WHERE user_key ~ '^USER-[0-9]+$'
ORDER BY key_number;
