-- Manually verify a user's email
-- Replace 'user@example.com' with the actual email address

-- Step 1: Find the user ID
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE email = 'user@example.com';

-- Step 2: Mark email as confirmed in auth.users
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'user@example.com';

-- Step 3: Mark email_verified in user_profiles
UPDATE public.user_profiles
SET email_verified = true
WHERE email = 'user@example.com';

-- Step 4: Verify the changes
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  u.confirmed_at,
  up.email_verified
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
WHERE u.email = 'user@example.com';
