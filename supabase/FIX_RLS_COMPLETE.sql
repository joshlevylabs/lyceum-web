-- Complete RLS fix for user_profiles table
-- Run this to fix the hanging profile queries

-- Step 1: Disable RLS temporarily (this will let queries through while we fix it)
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies to start fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_profiles';
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create new policies with correct syntax
CREATE POLICY "Enable read access for users to their own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Enable update access for users to their own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert access for users to their own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Step 5: Verify policies were created
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Step 6: Test a sample query (should work now)
SELECT
  id,
  email,
  full_name,
  email_verified
FROM user_profiles
LIMIT 5;
