-- Fix email confirmations for all users
-- Run this in Supabase SQL Editor

-- Confirm all existing users' emails
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- Verify the update worked
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- Optional: Also update the user metadata to reflect confirmation
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"email_confirmed": true}'::jsonb
WHERE email_confirmed_at IS NOT NULL;





