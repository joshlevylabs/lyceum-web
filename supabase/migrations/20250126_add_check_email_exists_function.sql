-- Create function to check if an email already exists in user_profiles or auth.users
-- This helps prevent duplicate email signups with better error messages

CREATE OR REPLACE FUNCTION check_email_exists(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if email exists in user_profiles table
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE LOWER(email) = LOWER(check_email)
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION check_email_exists(TEXT) IS 'Checks if an email address already exists in the user_profiles table. Returns true if email exists, false otherwise. Case-insensitive comparison.';
