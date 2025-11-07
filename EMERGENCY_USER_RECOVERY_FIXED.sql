-- =====================================
-- EMERGENCY USER RECOVERY SCRIPT (FIXED)
-- =====================================
-- This handles any existing role values
-- =====================================

-- Step 1: Drop the table if it exists with the wrong constraint
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Step 2: Create user_profiles table WITHOUT role constraint
-- (This allows any role value from existing users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  username TEXT UNIQUE,
  role TEXT DEFAULT 'user',  -- No CHECK constraint, allows any role
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
CREATE POLICY "Users can read their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role has full access to profiles" ON public.user_profiles
  FOR ALL USING (true);

-- Step 5: Sync ALL auth users to user_profiles
-- This preserves existing role values from metadata
INSERT INTO public.user_profiles (id, email, full_name, username, role, is_active)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    COALESCE(au.raw_user_meta_data->>'name', au.email)
  ) as full_name,
  COALESCE(
    au.raw_user_meta_data->>'username',
    SPLIT_PART(au.email, '@', 1) || '_' || SUBSTRING(au.id::text, 1, 8)
  ) as username,
  -- Preserve existing role or set to admin for lyceum/joshlevylabs emails
  CASE 
    WHEN au.email LIKE '%@thelyceum.io' THEN 'admin'
    WHEN au.email LIKE '%@joshlevylabs.com' THEN 'admin'
    ELSE COALESCE(au.raw_user_meta_data->>'role', 'user')
  END as role,
  true as is_active
FROM auth.users au
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

-- Step 9: Show all synced users with their roles
SELECT 
  up.id,
  up.email,
  up.full_name,
  up.username,
  up.role,
  up.is_active,
  up.created_at
FROM public.user_profiles up
ORDER BY up.created_at DESC;








