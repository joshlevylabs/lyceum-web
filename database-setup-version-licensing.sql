-- Enhance licensing system to support version-based access control

-- Add version compatibility columns to licenses table
ALTER TABLE public.licenses 
ADD COLUMN IF NOT EXISTS supported_versions JSONB DEFAULT '{"min": "1.0.0", "max": null}',
ADD COLUMN IF NOT EXISTS version_restrictions JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS license_version TEXT DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS compatibility_matrix JSONB DEFAULT '{}';

-- Add version tracking columns to license_keys table (legacy support)
ALTER TABLE public.license_keys 
ADD COLUMN IF NOT EXISTS supported_versions JSONB DEFAULT '{"min": "1.0.0", "max": null}',
ADD COLUMN IF NOT EXISTS license_version TEXT DEFAULT '1.0.0';

-- Create application_versions table to track available versions
CREATE TABLE IF NOT EXISTS public.application_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_name TEXT NOT NULL, -- 'centcom', 'klippel_qc', 'apx500', etc.
    version_number TEXT NOT NULL,   -- '2.1.0', '3.0.0-beta', etc.
    release_date DATE NOT NULL,
    is_stable BOOLEAN DEFAULT true,
    is_supported BOOLEAN DEFAULT true,
    min_license_version TEXT DEFAULT '1.0.0',
    required_features JSONB DEFAULT '[]',
    breaking_changes JSONB DEFAULT '[]',
    deprecation_warnings JSONB DEFAULT '[]',
    download_url TEXT,
    changelog_url TEXT,
    documentation_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint for application name + version
ALTER TABLE public.application_versions 
ADD CONSTRAINT unique_app_version 
UNIQUE (application_name, version_number);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_application_versions_name ON public.application_versions(application_name);
CREATE INDEX IF NOT EXISTS idx_application_versions_supported ON public.application_versions(is_supported);
CREATE INDEX IF NOT EXISTS idx_application_versions_stable ON public.application_versions(is_stable);

-- Create license_version_compatibility table for complex compatibility rules
CREATE TABLE IF NOT EXISTS public.license_version_compatibility (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    license_type TEXT NOT NULL,     -- 'trial', 'standard', 'professional', 'enterprise'
    plugin_id TEXT NOT NULL,        -- 'centcom', 'klippel_qc', 'apx500', etc.
    application_version TEXT NOT NULL,
    is_compatible BOOLEAN DEFAULT true,
    requires_upgrade BOOLEAN DEFAULT false,
    compatibility_notes TEXT,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for compatibility table
CREATE INDEX IF NOT EXISTS idx_license_version_compat_type ON public.license_version_compatibility(license_type);
CREATE INDEX IF NOT EXISTS idx_license_version_compat_plugin ON public.license_version_compatibility(plugin_id);
CREATE INDEX IF NOT EXISTS idx_license_version_compat_version ON public.license_version_compatibility(application_version);

-- Enable RLS on new tables
ALTER TABLE public.application_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_version_compatibility ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ 
BEGIN
    -- Application versions - readable by all authenticated users
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'application_versions' 
        AND policyname = 'application_versions_read_all'
    ) THEN
        CREATE POLICY application_versions_read_all ON public.application_versions
        FOR SELECT USING (true);
    END IF;

    -- Application versions - writable by service role and admins
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'application_versions' 
        AND policyname = 'application_versions_admin_write'
    ) THEN
        CREATE POLICY application_versions_admin_write ON public.application_versions
        FOR ALL USING (
            auth.role() = 'service_role' OR
            EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'superadmin')
            )
        );
    END IF;

    -- License compatibility - readable by all authenticated users
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'license_version_compatibility' 
        AND policyname = 'license_compatibility_read_all'
    ) THEN
        CREATE POLICY license_compatibility_read_all ON public.license_version_compatibility
        FOR SELECT USING (true);
    END IF;

    -- License compatibility - writable by service role and admins
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'license_version_compatibility' 
        AND policyname = 'license_compatibility_admin_write'
    ) THEN
        CREATE POLICY license_compatibility_admin_write ON public.license_version_compatibility
        FOR ALL USING (
            auth.role() = 'service_role' OR
            EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'superadmin')
            )
        );
    END IF;
END $$;

-- Insert sample application versions
INSERT INTO public.application_versions (application_name, version_number, release_date, is_stable, min_license_version, required_features) VALUES
('centcom', '1.0.0', '2025-01-01', true, '1.0.0', '["basic_access"]'),
('centcom', '1.5.0', '2025-02-01', true, '1.0.0', '["basic_access", "project_create"]'),
('centcom', '2.0.0', '2025-03-01', true, '2.0.0', '["basic_access", "project_create", "enhanced_ui"]'),
('centcom', '2.1.0', '2025-04-01', true, '2.0.0', '["basic_access", "project_create", "enhanced_ui", "real_time_sync"]'),
('centcom', '3.0.0-beta', '2025-05-01', false, '3.0.0', '["basic_access", "project_create", "enhanced_ui", "real_time_sync", "ai_assistance"]'),

('klippel_qc', '2.0.0', '2025-01-15', true, '1.0.0', '["qc_testing", "klippel_hardware"]'),
('klippel_qc', '2.1.0', '2025-03-15', true, '1.0.0', '["qc_testing", "klippel_hardware", "automated_testing"]'),
('klippel_qc', '2.2.0', '2025-05-15', true, '2.0.0', '["qc_testing", "klippel_hardware", "automated_testing", "batch_processing"]'),

('apx500', '1.4.0', '2025-02-01', true, '1.0.0', '["apx_control"]'),
('apx500', '1.5.0', '2025-04-01', true, '1.0.0', '["apx_control", "measurement_automation"]'),
('apx500', '2.0.0', '2025-06-01', true, '2.0.0', '["apx_control", "measurement_automation", "custom_sequences"]'),

('analytics_pro', '1.0.0', '2025-01-01', true, '1.0.0', '["advanced_analytics"]'),
('analytics_pro', '1.2.0', '2025-03-01', true, '1.0.0', '["advanced_analytics", "custom_reports"]'),
('analytics_pro', '2.0.0', '2025-05-01', true, '2.0.0', '["advanced_analytics", "custom_reports", "data_mining", "ai_insights"]')
ON CONFLICT (application_name, version_number) DO NOTHING;

-- Insert sample license compatibility rules
INSERT INTO public.license_version_compatibility (license_type, plugin_id, application_version, is_compatible, requires_upgrade, compatibility_notes) VALUES
-- Centcom version compatibility
('trial', 'centcom', '1.0.0', true, false, 'Full compatibility'),
('trial', 'centcom', '1.5.0', true, false, 'Full compatibility'),
('trial', 'centcom', '2.0.0', false, true, 'Trial licenses require upgrade for v2.0+'),
('trial', 'centcom', '2.1.0', false, true, 'Trial licenses require upgrade for v2.0+'),
('trial', 'centcom', '3.0.0-beta', false, true, 'Beta versions require professional license or higher'),

('standard', 'centcom', '1.0.0', true, false, 'Full compatibility'),
('standard', 'centcom', '1.5.0', true, false, 'Full compatibility'),
('standard', 'centcom', '2.0.0', true, false, 'Full compatibility'),
('standard', 'centcom', '2.1.0', true, false, 'Full compatibility'),
('standard', 'centcom', '3.0.0-beta', false, true, 'Beta versions require professional license or higher'),

('professional', 'centcom', '1.0.0', true, false, 'Full compatibility'),
('professional', 'centcom', '1.5.0', true, false, 'Full compatibility'),
('professional', 'centcom', '2.0.0', true, false, 'Full compatibility'),
('professional', 'centcom', '2.1.0', true, false, 'Full compatibility'),
('professional', 'centcom', '3.0.0-beta', true, false, 'Beta access included'),

('enterprise', 'centcom', '1.0.0', true, false, 'Full compatibility'),
('enterprise', 'centcom', '1.5.0', true, false, 'Full compatibility'),
('enterprise', 'centcom', '2.0.0', true, false, 'Full compatibility'),
('enterprise', 'centcom', '2.1.0', true, false, 'Full compatibility'),
('enterprise', 'centcom', '3.0.0-beta', true, false, 'Beta access included'),

-- Klippel QC version compatibility
('standard', 'klippel_qc', '2.0.0', true, false, 'Basic QC features'),
('standard', 'klippel_qc', '2.1.0', true, false, 'Basic QC features'),
('standard', 'klippel_qc', '2.2.0', false, true, 'Batch processing requires professional license'),

('professional', 'klippel_qc', '2.0.0', true, false, 'Full compatibility'),
('professional', 'klippel_qc', '2.1.0', true, false, 'Full compatibility'),
('professional', 'klippel_qc', '2.2.0', true, false, 'Full compatibility'),

('enterprise', 'klippel_qc', '2.0.0', true, false, 'Full compatibility'),
('enterprise', 'klippel_qc', '2.1.0', true, false, 'Full compatibility'),
('enterprise', 'klippel_qc', '2.2.0', true, false, 'Full compatibility')
ON CONFLICT DO NOTHING;

-- Create function to check version compatibility
CREATE OR REPLACE FUNCTION public.check_version_compatibility(
    p_license_type TEXT,
    p_plugin_id TEXT,
    p_requested_version TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    compatibility_result JSONB;
    version_info RECORD;
    compat_info RECORD;
BEGIN
    -- Initialize result
    compatibility_result := jsonb_build_object(
        'is_compatible', false,
        'requires_upgrade', false,
        'version_exists', false,
        'is_stable', false,
        'notes', ''
    );

    -- Check if the requested version exists
    SELECT * INTO version_info
    FROM public.application_versions
    WHERE application_name = p_plugin_id 
    AND version_number = p_requested_version;

    IF NOT FOUND THEN
        compatibility_result := jsonb_set(compatibility_result, '{notes}', '"Requested version not found"');
        RETURN compatibility_result;
    END IF;

    -- Update result with version info
    compatibility_result := jsonb_set(compatibility_result, '{version_exists}', 'true');
    compatibility_result := jsonb_set(compatibility_result, '{is_stable}', 
        CASE WHEN version_info.is_stable THEN 'true' ELSE 'false' END);

    -- Check compatibility rules
    SELECT * INTO compat_info
    FROM public.license_version_compatibility
    WHERE license_type = p_license_type
    AND plugin_id = p_plugin_id
    AND application_version = p_requested_version
    AND (effective_until IS NULL OR effective_until >= CURRENT_DATE);

    IF FOUND THEN
        compatibility_result := jsonb_set(compatibility_result, '{is_compatible}', 
            CASE WHEN compat_info.is_compatible THEN 'true' ELSE 'false' END);
        compatibility_result := jsonb_set(compatibility_result, '{requires_upgrade}', 
            CASE WHEN compat_info.requires_upgrade THEN 'true' ELSE 'false' END);
        compatibility_result := jsonb_set(compatibility_result, '{notes}', 
            to_jsonb(COALESCE(compat_info.compatibility_notes, '')));
    ELSE
        -- Default compatibility based on license version
        IF version_info.min_license_version <= '1.0.0' OR p_license_type IN ('professional', 'enterprise') THEN
            compatibility_result := jsonb_set(compatibility_result, '{is_compatible}', 'true');
        ELSE
            compatibility_result := jsonb_set(compatibility_result, '{requires_upgrade}', 'true');
            compatibility_result := jsonb_set(compatibility_result, '{notes}', 
                '"Version requires license upgrade"');
        END IF;
    END IF;

    RETURN compatibility_result;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.application_versions TO authenticated;
GRANT SELECT ON public.license_version_compatibility TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_version_compatibility TO authenticated;

-- Comments
COMMENT ON TABLE public.application_versions IS 'Tracks available versions of Centcom and plugins';
COMMENT ON TABLE public.license_version_compatibility IS 'Defines compatibility rules between license types and application versions';
COMMENT ON FUNCTION public.check_version_compatibility IS 'Checks if a license type is compatible with a specific plugin version';







