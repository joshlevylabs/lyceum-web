-- Manually verify josh@joshlevylabs.com for testing
-- Run this in Supabase SQL Editor

UPDATE public.user_profiles
SET email_verified = true
WHERE email = 'josh@joshlevylabs.com';

-- Verify the update
SELECT id, email, email_verified
FROM public.user_profiles
WHERE email = 'josh@joshlevylabs.com';
