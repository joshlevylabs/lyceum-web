-- Create license_validations table for tracking Centcom license usage
CREATE TABLE IF NOT EXISTS public.license_validations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    plugin_id TEXT NOT NULL,
    feature_requested TEXT,
    access_granted BOOLEAN NOT NULL DEFAULT false,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_type TEXT DEFAULT 'centcom',
    client_version TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_license_validations_user_id ON public.license_validations(user_id);
CREATE INDEX IF NOT EXISTS idx_license_validations_plugin_id ON public.license_validations(plugin_id);
CREATE INDEX IF NOT EXISTS idx_license_validations_validated_at ON public.license_validations(validated_at);
CREATE INDEX IF NOT EXISTS idx_license_validations_access_granted ON public.license_validations(access_granted);

-- Add foreign key constraint to user_profiles
ALTER TABLE public.license_validations 
ADD CONSTRAINT fk_license_validations_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.license_validations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ 
BEGIN
    -- Policy for service role (full access)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'license_validations' 
        AND policyname = 'service_role_all_license_validations'
    ) THEN
        CREATE POLICY service_role_all_license_validations ON public.license_validations
        FOR ALL USING (auth.role() = 'service_role');
    END IF;

    -- Policy for authenticated users (can only see their own validations)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'license_validations' 
        AND policyname = 'users_own_license_validations'
    ) THEN
        CREATE POLICY users_own_license_validations ON public.license_validations
        FOR SELECT USING (auth.uid() = user_id);
    END IF;

    -- Policy for admins (can see all validations)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'license_validations' 
        AND policyname = 'admin_all_license_validations'
    ) THEN
        CREATE POLICY admin_all_license_validations ON public.license_validations
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'superadmin')
            )
        );
    END IF;
END $$;

-- Create a view for license validation analytics
CREATE OR REPLACE VIEW public.license_validation_analytics AS
SELECT 
    plugin_id,
    feature_requested,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE access_granted = true) as granted_requests,
    COUNT(*) FILTER (WHERE access_granted = false) as denied_requests,
    ROUND(
        (COUNT(*) FILTER (WHERE access_granted = true)::numeric / COUNT(*)::numeric) * 100, 
        2
    ) as success_rate_percent,
    COUNT(DISTINCT user_id) as unique_users,
    DATE_TRUNC('day', validated_at) as validation_date
FROM public.license_validations
GROUP BY plugin_id, feature_requested, DATE_TRUNC('day', validated_at)
ORDER BY validation_date DESC, plugin_id;

-- Grant permissions
GRANT SELECT ON public.license_validation_analytics TO authenticated;
GRANT ALL ON public.license_validations TO service_role;
GRANT SELECT ON public.license_validations TO authenticated;

-- Create function to clean up old validation logs (optional)
CREATE OR REPLACE FUNCTION public.cleanup_old_license_validations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete validation logs older than 90 days
    DELETE FROM public.license_validations 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Log the cleanup
    RAISE NOTICE 'Cleaned up license validation logs older than 90 days';
END;
$$;

-- Create a scheduled cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-license-validations', '0 2 * * 0', 'SELECT public.cleanup_old_license_validations();');

COMMENT ON TABLE public.license_validations IS 'Tracks license validation requests from Centcom and other clients';
COMMENT ON COLUMN public.license_validations.user_id IS 'User who requested license validation';
COMMENT ON COLUMN public.license_validations.plugin_id IS 'Plugin being validated (e.g., klippel_qc, apx500)';
COMMENT ON COLUMN public.license_validations.feature_requested IS 'Specific feature being validated (optional)';
COMMENT ON COLUMN public.license_validations.access_granted IS 'Whether access was granted based on license validation';
COMMENT ON COLUMN public.license_validations.client_type IS 'Type of client making the request (centcom, web, api)';
COMMENT ON VIEW public.license_validation_analytics IS 'Analytics view for license validation success rates and usage patterns';







