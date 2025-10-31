-- Migration: Add email verification support to user_profiles
-- Created: 2025-10-31
-- Description: Adds email_verified column to user_profiles table
-- Note: company column already exists, so it's not included in this migration

-- Add email_verified column to track verification status
-- Note: Supabase auth.users has email_confirmed_at, but we track it here too for easier queries
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Create index on email_verified for filtering
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_verified ON public.user_profiles(email_verified);

-- Update existing users to have email_verified = true (grandfathering existing users)
-- This prevents locking out existing users who signed up before this feature
UPDATE public.user_profiles
SET email_verified = true
WHERE email_verified = false;

-- Add comment to document the column
COMMENT ON COLUMN public.user_profiles.email_verified IS 'Whether the user has verified their email address';
