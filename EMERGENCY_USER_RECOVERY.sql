-- =====================================
-- EMERGENCY USER RECOVERY SCRIPT
-- =====================================
-- This script will:
-- 1. Create the user_profiles table
-- 2. Sync all auth users to user_profiles
-- 3. Verify the recovery
-- =====================================

-- Step 1: Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  username TEXT UNIQUE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if any
DROP POLICY IF EXISTS "Users can read their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role has full access to profiles" ON public.user_profiles;

-- Step 4: Create RLS policies
CREATE POLICY "Users can read their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role has full access to profiles" ON public.user_profiles
  FOR ALL USING (true);

-- Step 5: Sync ALL auth users to user_profiles
-- This will create profiles for any auth user that doesn't have one
INSERT INTO public.user_profiles (id, email, full_name, username, role, is_active)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.email
  ) as full_name,
  COALESCE(
    au.raw_user_meta_data->>'username',
    SPLIT_PART(au.email, '@', 1) || '_' || SUBSTRING(au.id::text, 1, 8)
  ) as username,
  CASE 
    WHEN au.email LIKE '%@thelyceum.io' THEN 'admin'
    WHEN au.email LIKE '%@joshlevylabs.com' THEN 'admin'
    ELSE COALESCE(au.raw_user_meta_data->>'role', 'user')
  END as role,
  true as is_active
FROM auth.users au
LEFT JOIN public.user_profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS user_profiles_email_idx ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS user_profiles_username_idx ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS user_profiles_is_active_idx ON public.user_profiles(is_active);

-- Step 7: Create auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Step 8: Verify the recovery
SELECT 
  'Auth users count' as check_type,
  COUNT(*) as count
FROM auth.users

UNION ALL

SELECT 
  'User profiles count' as check_type,
  COUNT(*) as count
FROM public.user_profiles

UNION ALL

SELECT 
  'Active profiles count' as check_type,
  COUNT(*) as count
FROM public.user_profiles
WHERE is_active = true;

-- Step 9: Show all synced users
SELECT 
  up.id,
  up.email,
  up.full_name,
  up.username,
  up.role,
  up.is_active,
  up.created_at
FROM public.user_profiles up
ORDER BY up.created_at DESC
LIMIT 20;



