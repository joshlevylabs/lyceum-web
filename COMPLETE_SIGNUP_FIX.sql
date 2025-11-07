-- Complete Signup Fix
-- This script fixes all potential issues with the signup process
-- Run this in Supabase SQL Editor

-- ===================================
-- Step 1: Ensure email_verified column exists
-- ===================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;

    RAISE NOTICE '✅ Added email_verified column to user_profiles';
  ELSE
    RAISE NOTICE 'ℹ️  email_verified column already exists';
  END IF;
END $$;

-- ===================================
-- Step 2: Ensure user_onboarding table exists
-- ===================================
CREATE TABLE IF NOT EXISTS public.user_onboarding (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_stage TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_onboarding
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- Create policy for user_onboarding
DROP POLICY IF EXISTS "Users can manage their own onboarding" ON public.user_onboarding;
CREATE POLICY "Users can manage their own onboarding"
  ON public.user_onboarding
  FOR ALL
  USING (auth.uid() = user_id);

-- ===================================
-- Step 3: Update trigger function
-- ===================================
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user profile
  INSERT INTO public.user_profiles (
    id,
    email,
    username,
    full_name,
    company,
    role,
    is_active,
    email_verified
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'engineer'),
    true,
    false
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    company = CASE
      WHEN EXCLUDED.company != '' THEN EXCLUDED.company
      ELSE user_profiles.company
    END,
    role = EXCLUDED.role;

  -- Create onboarding record
  INSERT INTO public.user_onboarding (
    user_id,
    onboarding_stage
  ) VALUES (
    NEW.id,
    'pending'
  ) ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in create_user_profile trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- Step 4: Ensure trigger exists
-- ===================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

-- ===================================
-- Step 5: Set permissions
-- ===================================
ALTER FUNCTION public.create_user_profile() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO anon;

-- ===================================
-- Step 6: Verification
-- ===================================
SELECT '✅ Setup complete!' as status;

-- Show trigger status
SELECT
  'Trigger: ' || trigger_name || ' on ' || event_object_table as info
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';

-- Show table columns
SELECT
  'Column: ' || column_name || ' (' || data_type || ')' as info
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name IN ('company', 'email_verified')
ORDER BY column_name;
