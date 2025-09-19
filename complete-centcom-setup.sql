-- Complete setup for real CentCom session tracking
-- This creates all required tables and sets up real-time session tracking

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create auth_logs table for authentication tracking
CREATE TABLE IF NOT EXISTS public.auth_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'login', 'logout', 'authentication', 'token_refresh'
  app_id TEXT, -- 'centcom', 'lyceum-web', etc.
  client_info JSONB, -- User agent, browser info, etc.
  ip_address TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  session_type TEXT, -- 'web', 'native', 'centcom'
  application_type TEXT, -- 'Web Lyceum', 'CentCom Native', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create user_activity_logs table for detailed session tracking
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'login', 'logout', 'session_start', 'session_end', 'page_view', etc.
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB, -- Additional context data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create centcom_sessions table for real-time session tracking
CREATE TABLE IF NOT EXISTS public.centcom_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  centcom_session_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- Session Information
  created_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ NOT NULL,
  session_status VARCHAR(50) DEFAULT 'active',
  
  -- Security Information
  source_ip INET,
  user_agent TEXT,
  mfa_verified BOOLEAN DEFAULT false,
  risk_score INTEGER DEFAULT 0,
  
  -- Location Information
  country VARCHAR(100),
  city VARCHAR(100),
  timezone VARCHAR(100),
  
  -- Device Information
  platform VARCHAR(50),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  
  -- Application Information
  app_name VARCHAR(100) DEFAULT 'CentCom',
  app_version VARCHAR(50),
  build_number VARCHAR(50),
  license_type VARCHAR(50),
  
  -- Sync Metadata
  sync_timestamp TIMESTAMPTZ DEFAULT NOW(),
  sync_source VARCHAR(100),
  sync_version VARCHAR(20),
  
  -- Timestamps
  inserted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON public.auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON public.auth_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_event_type ON public.auth_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_logs_app_id ON public.auth_logs(app_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON public.user_activity_logs(activity_type);

CREATE INDEX IF NOT EXISTS idx_centcom_sessions_user_id ON public.centcom_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_centcom_sessions_last_activity ON public.centcom_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_centcom_sessions_status ON public.centcom_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_centcom_sessions_created_at ON public.centcom_sessions(created_at);

-- 5. Create trigger for auto-updating centcom_sessions.updated_at
CREATE OR REPLACE FUNCTION update_centcom_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_centcom_sessions_updated_at ON public.centcom_sessions;
CREATE TRIGGER trigger_update_centcom_sessions_updated_at
  BEFORE UPDATE ON public.centcom_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_centcom_sessions_updated_at();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centcom_sessions ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for auth_logs
DROP POLICY IF EXISTS "Users can view their own auth logs" ON public.auth_logs;
CREATE POLICY "Users can view their own auth logs" ON public.auth_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage auth logs" ON public.auth_logs;
CREATE POLICY "Service role can manage auth logs" ON public.auth_logs
  FOR ALL USING (current_setting('role') = 'service_role');

-- 8. Create RLS policies for user_activity_logs
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.user_activity_logs;
CREATE POLICY "Users can view their own activity logs" ON public.user_activity_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage activity logs" ON public.user_activity_logs;
CREATE POLICY "Service role can manage activity logs" ON public.user_activity_logs
  FOR ALL USING (current_setting('role') = 'service_role');

-- 9. Create RLS policies for centcom_sessions
DROP POLICY IF EXISTS "Users can view own centcom sessions" ON public.centcom_sessions;
CREATE POLICY "Users can view own centcom sessions" ON public.centcom_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage centcom sessions" ON public.centcom_sessions;
CREATE POLICY "Service role can manage centcom sessions" ON public.centcom_sessions
  FOR ALL USING (current_setting('role') = 'service_role');

-- 10. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.auth_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.centcom_sessions TO authenticated;

GRANT ALL ON public.auth_logs TO service_role;
GRANT ALL ON public.user_activity_logs TO service_role;
GRANT ALL ON public.centcom_sessions TO service_role;

-- 11. Create helper functions
CREATE OR REPLACE FUNCTION get_user_latest_centcom_session(target_user_id UUID)
RETURNS TABLE(
  session_id UUID,
  centcom_session_id VARCHAR(255),
  created_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  session_status VARCHAR(50),
  source_ip INET,
  user_agent TEXT,
  platform VARCHAR(50),
  app_version VARCHAR(50),
  license_type VARCHAR(50),
  connection_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.centcom_session_id,
    cs.created_at,
    cs.last_activity,
    cs.session_status,
    cs.source_ip,
    cs.user_agent,
    cs.platform,
    cs.app_version,
    cs.license_type,
    CASE 
      WHEN cs.last_activity > NOW() - INTERVAL '5 minutes' THEN 'online'
      WHEN cs.last_activity > NOW() - INTERVAL '30 minutes' THEN 'idle'
      ELSE 'offline'
    END as connection_status
  FROM public.centcom_sessions cs
  WHERE cs.user_id = target_user_id
  ORDER BY cs.last_activity DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_user_latest_centcom_session(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_latest_centcom_session(UUID) TO authenticated;

-- 12. Create a test session entry to verify everything works
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get any existing user for testing
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Create a test CentCom session entry
    INSERT INTO public.centcom_sessions (
      user_id,
      centcom_session_id,
      created_at,
      last_activity,
      session_status,
      source_ip,
      user_agent,
      platform,
      device_type,
      browser,
      app_name,
      app_version,
      license_type,
      sync_source,
      sync_version
    ) VALUES (
      test_user_id,
      'setup-test-' || substr(gen_random_uuid()::text, 1, 8),
      NOW() - INTERVAL '1 hour',
      NOW() - INTERVAL '30 minutes',
      'terminated',
      '192.168.1.100'::inet,
      'CentCom/2.1.0 Setup Test',
      'Windows',
      'desktop',
      'Tauri WebView',
      'CentCom',
      '2.1.0',
      'professional',
      'setup_test',
      '1.0'
    ) ON CONFLICT (centcom_session_id) DO NOTHING;
    
    RAISE NOTICE 'Test session created for user: %', test_user_id;
  END IF;
END $$;

-- 13. Show setup summary
SELECT 
  'Setup Complete!' as status,
  'Tables Created' as tables,
  'auth_logs, user_activity_logs, centcom_sessions' as table_names;

SELECT 
  'Test Data' as check_type,
  COUNT(*) as test_sessions_created
FROM public.centcom_sessions 
WHERE sync_source = 'setup_test';

RAISE NOTICE 'CentCom session tracking setup completed successfully!';
RAISE NOTICE 'Tables created: auth_logs, user_activity_logs, centcom_sessions';
RAISE NOTICE 'All future CentCom logins will automatically create session entries.';
RAISE NOTICE 'Check the admin panel Sessions tab to see the new "Last CentCom Login" section.';
