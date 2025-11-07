-- Fix User Profile Trigger to Handle Required Company Field
-- Run this in Supabase SQL Editor to update the trigger function

-- Update the function to properly handle company from user_metadata
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
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
    COALESCE(NEW.raw_user_meta_data->>'company', ''), -- Company from signup form
    COALESCE(NEW.raw_user_meta_data->>'role', 'engineer'), -- Role from signup or default
    true,
    false -- Email not verified yet
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    company = CASE
      WHEN EXCLUDED.company != '' THEN EXCLUDED.company
      ELSE user_profiles.company
    END,
    role = EXCLUDED.role;

  -- Also create/update onboarding record
  INSERT INTO public.user_onboarding (
    user_id,
    onboarding_stage
  ) VALUES (
    NEW.id,
    'pending'
  ) ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

-- Set proper permissions
ALTER FUNCTION public.create_user_profile() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO anon;
