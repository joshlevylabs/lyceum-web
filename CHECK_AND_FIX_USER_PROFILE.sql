-- Check and Fix User Profile Issue

-- Step 1: Check if you have any auth users
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Check if you have matching profiles
SELECT p.id, p.email, p.username, p.full_name, p.role
FROM public.profiles p
ORDER BY p.created_at DESC
LIMIT 5;

-- Step 3: Create profiles for any auth users that don't have one
-- This will automatically create a profile for your logged-in user
INSERT INTO public.profiles (id, email, username, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)) as username,
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1)) as full_name,
  'admin' as role
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 4: Verify profiles were created
SELECT p.id, p.email, p.username, p.full_name, p.role
FROM public.profiles p
ORDER BY p.created_at DESC;

-- Step 5: Check onboarding_sessions table structure
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'onboarding_sessions' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 6: Test a simple query on onboarding_sessions (should return immediately, even if empty)
SELECT COUNT(*) as total_sessions FROM public.onboarding_sessions;

-- Success message
SELECT 'Profile check and fix complete!' as status;








