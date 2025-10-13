-- Fix Row Level Security for onboarding_sessions table
-- Run this in Supabase SQL Editor

-- Step 1: Check if the table exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'onboarding_sessions'
    ) THEN
        RAISE NOTICE 'WARNING: onboarding_sessions table does not exist!';
        RAISE NOTICE 'You need to create this table first.';
    ELSE
        RAISE NOTICE 'Table onboarding_sessions exists';
    END IF;
END $$;

-- Step 2: Enable RLS if not already enabled
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own onboarding sessions" ON onboarding_sessions;
DROP POLICY IF EXISTS "Allow select own sessions" ON onboarding_sessions;
DROP POLICY IF EXISTS "Users can read own sessions" ON onboarding_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON onboarding_sessions;

-- Step 4: Create a simple, permissive SELECT policy
CREATE POLICY "Users can view their own onboarding sessions"
ON onboarding_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Step 5: Grant necessary permissions
GRANT SELECT ON onboarding_sessions TO authenticated;
GRANT SELECT ON license_keys TO authenticated;

-- Step 6: Verify the policy was created
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE tablename = 'onboarding_sessions';

-- Expected output:
-- Should show one policy: "Users can view their own onboarding sessions"
-- with cmd = 'SELECT' and roles = '{authenticated}'
