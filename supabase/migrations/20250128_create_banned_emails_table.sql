-- Create banned_emails table for tracking banned email addresses
-- This prevents banned users from creating new accounts

CREATE TABLE IF NOT EXISTS public.banned_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reason TEXT,
  banned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  banned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_banned_emails_email ON public.banned_emails(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_banned_emails_banned_at ON public.banned_emails(banned_at);

-- Enable RLS
ALTER TABLE public.banned_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage banned emails
CREATE POLICY "Admins can view banned emails"
  ON public.banned_emails
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert banned emails"
  ON public.banned_emails
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update banned emails"
  ON public.banned_emails
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete banned emails"
  ON public.banned_emails
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_banned_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER banned_emails_updated_at
  BEFORE UPDATE ON public.banned_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_banned_emails_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.banned_emails IS 'Stores banned email addresses to prevent account creation by banned users';
COMMENT ON COLUMN public.banned_emails.email IS 'Banned email address (case-insensitive)';
COMMENT ON COLUMN public.banned_emails.reason IS 'Reason for banning this email';
COMMENT ON COLUMN public.banned_emails.banned_by IS 'Admin user who banned this email';
