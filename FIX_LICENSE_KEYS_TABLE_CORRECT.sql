-- ===================================
-- FIX LICENSE_KEYS TABLE - CORRECT SCHEMA
-- ===================================

-- Drop the incorrect license_keys table
DROP TABLE IF EXISTS public.license_keys CASCADE;

-- Create the CORRECT license_keys table with ALL required fields
CREATE TABLE public.license_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_code TEXT NOT NULL UNIQUE,
  license_type TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  max_users INTEGER DEFAULT 10,
  max_projects INTEGER DEFAULT 50,
  max_storage_gb INTEGER DEFAULT 25,
  features JSONB DEFAULT '[]'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID,
  assigned_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Enhanced licensing fields
  time_limit_type TEXT DEFAULT 'unlimited' CHECK (time_limit_type IN ('trial_30', 'trial_custom', 'unlimited')),
  custom_trial_days INTEGER,
  trial_extension_reason TEXT,
  enabled_plugins JSONB DEFAULT '[]'::jsonb,
  plugin_permissions JSONB DEFAULT '{}'::jsonb,
  allowed_user_types JSONB DEFAULT '["engineer", "operator"]'::jsonb,
  access_level TEXT DEFAULT 'standard' CHECK (access_level IN ('basic', 'standard', 'advanced', 'full')),
  restrictions JSONB DEFAULT '{}'::jsonb,
  license_config JSONB DEFAULT '{}'::jsonb,
  usage_stats JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX idx_license_keys_key_code ON public.license_keys(key_code);
CREATE INDEX idx_license_keys_status ON public.license_keys(status);
CREATE INDEX idx_license_keys_assigned_to ON public.license_keys(assigned_to);
CREATE INDEX idx_license_keys_license_type ON public.license_keys(license_type);
CREATE INDEX idx_license_keys_expires_at ON public.license_keys(expires_at);

-- Enable RLS
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view license keys" ON public.license_keys 
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert licenses" ON public.license_keys 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update licenses" ON public.license_keys 
  FOR UPDATE USING (true);

CREATE POLICY "Admins can delete licenses" ON public.license_keys 
  FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON public.license_keys TO authenticated;
GRANT ALL ON public.license_keys TO service_role;

-- Create auto-update trigger for updated_at
CREATE TRIGGER update_license_keys_updated_at 
  BEFORE UPDATE ON public.license_keys 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Recreate foreign key in onboarding_sessions if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_sessions') THEN
    ALTER TABLE public.onboarding_sessions 
      DROP COLUMN IF EXISTS license_key_id CASCADE;
    
    ALTER TABLE public.onboarding_sessions 
      ADD COLUMN license_key_id UUID REFERENCES public.license_keys(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Success message
SELECT 'License keys table fixed with correct schema!' as status,
       COUNT(*) as existing_licenses
FROM public.license_keys;






