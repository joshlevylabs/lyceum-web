-- Complete database setup for Centcom-Lyceum Integration
-- This script creates all necessary tables and data for version-based licensing

-- ================================================
-- 1. APPLICATION VERSIONS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS public.application_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_name TEXT NOT NULL,
    version_number TEXT NOT NULL,
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_app_version UNIQUE (application_name, version_number)
);

-- ================================================
-- 2. LICENSE VERSION COMPATIBILITY TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS public.license_version_compatibility (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    license_type TEXT NOT NULL,
    plugin_id TEXT NOT NULL,
    application_version TEXT NOT NULL,
    is_compatible BOOLEAN DEFAULT true,
    requires_upgrade BOOLEAN DEFAULT false,
    compatibility_notes TEXT,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 3. ENHANCE EXISTING TABLES
-- ================================================

-- Add version support to licenses table
ALTER TABLE public.licenses 
ADD COLUMN IF NOT EXISTS supported_versions JSONB DEFAULT '{"min": "1.0.0", "max": null}',
ADD COLUMN IF NOT EXISTS version_restrictions JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS license_version TEXT DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS compatibility_matrix JSONB DEFAULT '{}';

-- Add version support to license_keys table (legacy)
ALTER TABLE public.license_keys 
ADD COLUMN IF NOT EXISTS supported_versions JSONB DEFAULT '{"min": "1.0.0", "max": null}',
ADD COLUMN IF NOT EXISTS license_version TEXT DEFAULT '1.0.0';

-- Add client_version to license_validations for tracking
ALTER TABLE public.license_validations 
ADD COLUMN IF NOT EXISTS client_version TEXT,
ADD COLUMN IF NOT EXISTS requested_version TEXT;

-- ================================================
-- 4. INDEXES FOR PERFORMANCE
-- ================================================

CREATE INDEX IF NOT EXISTS idx_app_versions_name ON public.application_versions(application_name);
CREATE INDEX IF NOT EXISTS idx_app_versions_supported ON public.application_versions(is_supported);
CREATE INDEX IF NOT EXISTS idx_app_versions_stable ON public.application_versions(is_stable);
CREATE INDEX IF NOT EXISTS idx_app_versions_release_date ON public.application_versions(release_date);

CREATE INDEX IF NOT EXISTS idx_license_compat_type ON public.license_version_compatibility(license_type);
CREATE INDEX IF NOT EXISTS idx_license_compat_plugin ON public.license_version_compatibility(plugin_id);
CREATE INDEX IF NOT EXISTS idx_license_compat_version ON public.license_version_compatibility(application_version);
CREATE INDEX IF NOT EXISTS idx_license_compat_effective ON public.license_version_compatibility(effective_from, effective_until);

-- ================================================
-- 5. ROW LEVEL SECURITY
-- ================================================

ALTER TABLE public.application_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_version_compatibility ENABLE ROW LEVEL SECURITY;

-- Application versions - readable by all authenticated users
CREATE POLICY IF NOT EXISTS app_versions_read_all 
ON public.application_versions FOR SELECT 
USING (true);

-- Application versions - writable by service role and admins
CREATE POLICY IF NOT EXISTS app_versions_admin_write 
ON public.application_versions FOR ALL 
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'superadmin')
    )
);

-- License compatibility - readable by all authenticated users
CREATE POLICY IF NOT EXISTS license_compat_read_all 
ON public.license_version_compatibility FOR SELECT 
USING (true);

-- License compatibility - writable by service role and admins
CREATE POLICY IF NOT EXISTS license_compat_admin_write 
ON public.license_version_compatibility FOR ALL 
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'superadmin')
    )
);

-- ================================================
-- 6. VERSION COMPATIBILITY FUNCTION
-- ================================================

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
        -- Default compatibility based on license version and type
        IF p_license_type IN ('professional', 'enterprise') THEN
            compatibility_result := jsonb_set(compatibility_result, '{is_compatible}', 'true');
        ELSIF p_license_type = 'standard' AND NOT version_info.version_number LIKE '%-beta%' THEN
            compatibility_result := jsonb_set(compatibility_result, '{is_compatible}', 'true');
        ELSIF p_license_type = 'trial' AND version_info.version_number ~ '^[1]\.[0-5]\..*' THEN
            compatibility_result := jsonb_set(compatibility_result, '{is_compatible}', 'true');
        ELSE
            compatibility_result := jsonb_set(compatibility_result, '{requires_upgrade}', 'true');
            compatibility_result := jsonb_set(compatibility_result, '{notes}', 
                '"License upgrade required for this version"');
        END IF;
    END IF;

    RETURN compatibility_result;
END;
$$;

-- ================================================
-- 7. INSERT SAMPLE APPLICATION VERSIONS
-- ================================================

INSERT INTO public.application_versions (application_name, version_number, release_date, is_stable, min_license_version, required_features) VALUES
-- Centcom Core versions
('centcom', '1.0.0', '2025-01-01', true, '1.0.0', '["basic_access"]'),
('centcom', '1.5.0', '2025-02-01', true, '1.0.0', '["basic_access", "project_create"]'),
('centcom', '2.0.0', '2025-03-01', true, '2.0.0', '["basic_access", "project_create", "enhanced_ui"]'),
('centcom', '2.1.0', '2025-04-01', true, '2.0.0', '["basic_access", "project_create", "enhanced_ui", "real_time_sync"]'),
('centcom', '3.0.0-beta', '2025-05-01', false, '3.0.0', '["basic_access", "project_create", "enhanced_ui", "real_time_sync", "ai_assistance"]'),

-- Klippel QC versions
('klippel_qc', '2.0.0', '2025-01-15', true, '1.0.0', '["qc_testing", "klippel_hardware"]'),
('klippel_qc', '2.1.0', '2025-03-15', true, '1.0.0', '["qc_testing", "klippel_hardware", "automated_testing"]'),
('klippel_qc', '2.2.0', '2025-05-15', true, '2.0.0', '["qc_testing", "klippel_hardware", "automated_testing", "batch_processing"]'),

-- APx500 versions
('apx500', '1.4.0', '2025-02-01', true, '1.0.0', '["apx_control"]'),
('apx500', '1.5.0', '2025-04-01', true, '1.0.0', '["apx_control", "measurement_automation"]'),
('apx500', '2.0.0', '2025-06-01', true, '2.0.0', '["apx_control", "measurement_automation", "custom_sequences"]'),

-- Analytics Pro versions
('analytics_pro', '1.0.0', '2025-01-01', true, '1.0.0', '["advanced_analytics"]'),
('analytics_pro', '1.2.0', '2025-03-01', true, '1.0.0', '["advanced_analytics", "custom_reports"]'),
('analytics_pro', '2.0.0', '2025-05-01', true, '2.0.0', '["advanced_analytics", "custom_reports", "data_mining", "ai_insights"]'),

-- Enterprise Suite versions
('enterprise_suite', '1.0.0', '2025-01-01', true, '2.0.0', '["enterprise_features", "priority_support", "custom_integrations"]')

ON CONFLICT (application_name, version_number) DO UPDATE SET
    is_supported = EXCLUDED.is_supported,
    required_features = EXCLUDED.required_features,
    updated_at = NOW();

-- ================================================
-- 8. INSERT LICENSE COMPATIBILITY RULES
-- ================================================

INSERT INTO public.license_version_compatibility (license_type, plugin_id, application_version, is_compatible, requires_upgrade, compatibility_notes) VALUES
-- Centcom Core compatibility
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

-- Klippel QC compatibility
('standard', 'klippel_qc', '2.0.0', true, false, 'Basic QC features'),
('standard', 'klippel_qc', '2.1.0', true, false, 'Basic QC features with automation'),
('standard', 'klippel_qc', '2.2.0', false, true, 'Batch processing requires professional license'),

('professional', 'klippel_qc', '2.0.0', true, false, 'Full compatibility'),
('professional', 'klippel_qc', '2.1.0', true, false, 'Full compatibility'),
('professional', 'klippel_qc', '2.2.0', true, false, 'Full compatibility with batch processing'),

('enterprise', 'klippel_qc', '2.0.0', true, false, 'Full compatibility'),
('enterprise', 'klippel_qc', '2.1.0', true, false, 'Full compatibility'),
('enterprise', 'klippel_qc', '2.2.0', true, false, 'Full compatibility with all features'),

-- APx500 compatibility
('standard', 'apx500', '1.4.0', true, false, 'Basic APx control'),
('standard', 'apx500', '1.5.0', true, false, 'Basic APx control with automation'),
('standard', 'apx500', '2.0.0', false, true, 'Custom sequences require professional license'),

('professional', 'apx500', '1.4.0', true, false, 'Full compatibility'),
('professional', 'apx500', '1.5.0', true, false, 'Full compatibility'),
('professional', 'apx500', '2.0.0', true, false, 'Full compatibility with custom sequences'),

('enterprise', 'apx500', '1.4.0', true, false, 'Full compatibility'),
('enterprise', 'apx500', '1.5.0', true, false, 'Full compatibility'),
('enterprise', 'apx500', '2.0.0', true, false, 'Full compatibility with all features'),

-- Analytics Pro compatibility (Professional+ only)
('professional', 'analytics_pro', '1.0.0', true, false, 'Basic analytics features'),
('professional', 'analytics_pro', '1.2.0', true, false, 'Analytics with custom reports'),
('professional', 'analytics_pro', '2.0.0', false, true, 'AI insights require enterprise license'),

('enterprise', 'analytics_pro', '1.0.0', true, false, 'Full compatibility'),
('enterprise', 'analytics_pro', '1.2.0', true, false, 'Full compatibility'),
('enterprise', 'analytics_pro', '2.0.0', true, false, 'Full compatibility with AI insights'),

-- Enterprise Suite compatibility (Enterprise only)
('enterprise', 'enterprise_suite', '1.0.0', true, false, 'Full enterprise features')

ON CONFLICT DO NOTHING;

-- ================================================
-- 9. GRANT PERMISSIONS
-- ================================================

GRANT SELECT ON public.application_versions TO authenticated;
GRANT SELECT ON public.license_version_compatibility TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_version_compatibility TO authenticated;
GRANT ALL ON public.application_versions TO service_role;
GRANT ALL ON public.license_version_compatibility TO service_role;

-- ================================================
-- 10. UTILITY VIEWS
-- ================================================

-- View for getting latest versions by application
CREATE OR REPLACE VIEW public.latest_application_versions AS
SELECT DISTINCT ON (application_name)
    application_name,
    version_number as latest_version,
    release_date,
    is_stable,
    required_features
FROM public.application_versions
WHERE is_supported = true
ORDER BY application_name, release_date DESC;

-- View for compatibility summary
CREATE OR REPLACE VIEW public.license_compatibility_summary AS
SELECT 
    license_type,
    plugin_id,
    COUNT(*) as total_versions,
    COUNT(*) FILTER (WHERE is_compatible = true) as compatible_versions,
    COUNT(*) FILTER (WHERE requires_upgrade = true) as upgrade_required_versions
FROM public.license_version_compatibility
WHERE effective_until IS NULL OR effective_until >= CURRENT_DATE
GROUP BY license_type, plugin_id;

GRANT SELECT ON public.latest_application_versions TO authenticated;
GRANT SELECT ON public.license_compatibility_summary TO authenticated;

-- ================================================
-- 11. COMMENTS
-- ================================================

COMMENT ON TABLE public.application_versions IS 'Tracks all available versions of Centcom and its plugins';
COMMENT ON TABLE public.license_version_compatibility IS 'Defines compatibility rules between license types and application versions';
COMMENT ON FUNCTION public.check_version_compatibility IS 'Checks if a license type is compatible with a specific plugin version';
COMMENT ON VIEW public.latest_application_versions IS 'Shows the latest version for each application';
COMMENT ON VIEW public.license_compatibility_summary IS 'Summary of version compatibility by license type';

-- ================================================
-- SETUP COMPLETE
-- ================================================

SELECT 'Version-based licensing database schema setup complete!' as status,
       COUNT(*) as total_versions_added
FROM public.application_versions;

SELECT 'License compatibility rules setup complete!' as status,
       COUNT(*) as total_rules_added  
FROM public.license_version_compatibility;





