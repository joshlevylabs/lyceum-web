-- Fix banned admin user - Run this in Supabase SQL Editor
-- This will unban the superadmin user who was accidentally banned

-- First, let's check the current status of the user
SELECT 
  id, 
  email, 
  banned_until,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'josh@thelyceum.io';

-- Remove the ban by setting banned_until to NULL
UPDATE auth.users 
SET banned_until = NULL 
WHERE email = 'josh@thelyceum.io';

-- Verify the fix
SELECT 
  id, 
  email, 
  banned_until,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'josh@thelyceum.io';

-- Also check the user_profiles table status
SELECT 
  id, 
  email, 
  username, 
  full_name, 
  role, 
  is_active 
FROM user_profiles 
WHERE email = 'josh@thelyceum.io';

RAISE NOTICE 'Admin user unbanned successfully! You should now be able to log in.';





