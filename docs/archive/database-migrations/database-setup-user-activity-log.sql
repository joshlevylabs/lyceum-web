-- Create user activity log table for audit purposes

CREATE TABLE IF NOT EXISTS public.user_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_action ON public.user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON public.user_activity_log(created_at);

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ 
BEGIN
    -- Admins can view all activity logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_activity_log' 
        AND policyname = 'user_activity_log_admin_read'
    ) THEN
        CREATE POLICY user_activity_log_admin_read ON public.user_activity_log
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'superadmin')
            )
        );
    END IF;

    -- Service role can insert activity logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_activity_log' 
        AND policyname = 'user_activity_log_service_write'
    ) THEN
        CREATE POLICY user_activity_log_service_write ON public.user_activity_log
        FOR INSERT WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

-- Grant permissions
GRANT SELECT ON public.user_activity_log TO authenticated;
GRANT INSERT ON public.user_activity_log TO service_role;

-- Comments
COMMENT ON TABLE public.user_activity_log IS 'Tracks user activities for audit and security purposes';
COMMENT ON COLUMN public.user_activity_log.action IS 'Type of action performed (e.g., password_reset_initiated, login, logout)';
COMMENT ON COLUMN public.user_activity_log.details IS 'Additional details about the action in JSON format';

