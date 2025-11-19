-- ============================================
-- Fix Admin Role for Production User
-- ============================================
-- Run this in Supabase SQL Editor for your production database

-- 1. Check current user role (replace with your email)
SELECT
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'your-email@example.com';  -- REPLACE WITH YOUR EMAIL

-- 2. Check user_profiles table for this user
SELECT
  up.id,
  up.full_name,
  up.role,
  up.company,
  au.email
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE au.email = 'your-email@example.com';  -- REPLACE WITH YOUR EMAIL

-- 3. Update role to admin (use the user_id from query #1)
-- UNCOMMENT AND UPDATE THE USER ID BELOW:
-- UPDATE public.user_profiles
-- SET role = 'admin'
-- WHERE id = 'YOUR-USER-ID-HERE';

-- 4. Verify the update
SELECT
  up.id,
  up.full_name,
  up.role,
  up.company,
  au.email
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE au.email = 'your-email@example.com';  -- REPLACE WITH YOUR EMAIL

-- 5. Check all admin users
SELECT
  up.id,
  up.full_name,
  up.role,
  up.company,
  au.email
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE up.role IN ('admin', 'super_admin')
ORDER BY up.created_at;
