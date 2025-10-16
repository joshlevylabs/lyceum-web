-- Add the missing license_keys table that onboarding_sessions is trying to join with

-- Drop and recreate license_keys table
DROP TABLE IF EXISTS public.license_keys CASCADE;

-- Create license_keys table (simplified version without problematic foreign keys)
CREATE TABLE public.license_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_code TEXT UNIQUE NOT NULL,
  license_type TEXT NOT NULL DEFAULT 'trial',
  status TEXT DEFAULT 'active',
  features JSONB DEFAULT '{}'::jsonb,
  enabled_plugins TEXT[] DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX license_keys_key_code_idx ON public.license_keys(key_code);
CREATE INDEX license_keys_status_idx ON public.license_keys(status);

-- Enable RLS
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policy - allow all authenticated users to view license keys
CREATE POLICY "Users can view license keys" ON public.license_keys 
  FOR SELECT USING (true);

-- Grant permissions
GRANT ALL ON public.license_keys TO authenticated;

-- Update the onboarding_sessions table to add the foreign key
ALTER TABLE public.onboarding_sessions 
  ADD COLUMN IF NOT EXISTS license_key_id UUID REFERENCES public.license_keys(id) ON DELETE SET NULL;

-- Success message
SELECT 'License keys table created successfully!' as status;





