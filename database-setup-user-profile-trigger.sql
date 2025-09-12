-- User Profile Auto-Creation Trigger
-- Run this SQL in Supabase SQL Editor to automatically create user_profiles when users sign up

-- Function to create user profile when a new user is created
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
    is_active
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    'engineer', -- default role
    true
  ) ON CONFLICT (id) DO NOTHING; -- Don't overwrite existing profiles

  -- Also create onboarding record
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

-- Trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

-- Set function owner to postgres for proper permissions
ALTER FUNCTION public.create_user_profile() OWNER TO postgres;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO service_role;

