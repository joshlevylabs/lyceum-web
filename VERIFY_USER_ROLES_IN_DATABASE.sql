-- Verification Script: Check User Roles in Database
-- Run this to verify what roles are actually stored in the database

-- 1. Check josh@thelyceum.io's role
SELECT
  id,
  email,
  username,
  full_name,
  role,
  is_active,
  created_at
FROM public.user_profiles
WHERE email = 'josh@thelyceum.io';

-- Expected result:
-- email: josh@thelyceum.io
-- role: 'admin' (or 'Admin' or 'super_admin')

-- 2. Check ALL user roles
SELECT
  email,
  role,
  is_active
FROM public.user_profiles
ORDER BY created_at ASC;

-- 3. Check if role column allows proper values
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name = 'role';

-- 4. Check if there's a constraint on the role column
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'user_profiles'
  AND conname LIKE '%role%';

-- 5. If josh@thelyceum.io has role='user', fix it:
-- UPDATE public.user_profiles
-- SET role = 'admin'
-- WHERE email = 'josh@thelyceum.io';

-- 6. Verify the update (run after UPDATE if needed)
-- SELECT email, role FROM public.user_profiles WHERE email = 'josh@thelyceum.io';
