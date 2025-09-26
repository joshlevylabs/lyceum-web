-- Database Setup for CentCom Session Tracking
-- This creates the centcom_sessions table to track real-time CentCom login sessions

-- Create the centcom_sessions table
CREATE TABLE IF NOT EXISTS centcom_sessions (
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_centcom_sessions_user_id ON centcom_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_centcom_sessions_last_activity ON centcom_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_centcom_sessions_status ON centcom_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_centcom_sessions_created_at ON centcom_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_centcom_sessions_centcom_session_id ON centcom_sessions(centcom_session_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_centcom_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS trigger_update_centcom_sessions_updated_at ON centcom_sessions;
CREATE TRIGGER trigger_update_centcom_sessions_updated_at
  BEFORE UPDATE ON centcom_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_centcom_sessions_updated_at();

-- Insert sample data for testing (optional - remove in production)
-- This simulates a CentCom session for testing purposes
INSERT INTO centcom_sessions (
  user_id,
  centcom_session_id,
  created_at,
  last_activity,
  session_status,
  source_ip,
  user_agent,
  mfa_verified,
  risk_score,
  country,
  city,
  timezone,
  platform,
  device_type,
  browser,
  app_name,
  app_version,
  build_number,
  license_type,
  sync_source,
  sync_version
) 
SELECT 
  u.id,
  'test-centcom-session-' || substr(gen_random_uuid()::text, 1, 8),
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '30 minutes',
  'active',
  '192.168.1.100'::inet,
  'CentCom/2.1.0 (Windows NT 10.0; Win64; x64)',
  false,
  10,
  'United States',
  'New York',
  'America/New_York',
  'Windows',
  'desktop',
  'Tauri WebView',
  'CentCom',
  '2.1.0',
  '2024.12.001',
  'professional',
  'centcom_session_manager',
  '1.0'
FROM auth.users u 
WHERE u.email LIKE '%@%' 
LIMIT 1
ON CONFLICT (centcom_session_id) DO NOTHING;

-- Add RLS (Row Level Security) policies
ALTER TABLE centcom_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sessions
CREATE POLICY "Users can view own centcom sessions" ON centcom_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admin users can see all sessions
CREATE POLICY "Admins can view all centcom sessions" ON centcom_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'superadmin')
    )
  );

-- Policy: Service role can insert/update sessions
CREATE POLICY "Service role can manage centcom sessions" ON centcom_sessions
  FOR ALL USING (current_setting('role') = 'service_role');

-- Grant permissions
GRANT ALL ON centcom_sessions TO service_role;
GRANT SELECT ON centcom_sessions TO authenticated;

-- Create a view for easy querying of active sessions
CREATE OR REPLACE VIEW active_centcom_sessions AS
SELECT 
  cs.*,
  up.full_name as user_full_name,
  up.email as user_email,
  up.company as user_company,
  EXTRACT(EPOCH FROM (NOW() - cs.last_activity)) as inactive_seconds,
  CASE 
    WHEN cs.last_activity > NOW() - INTERVAL '5 minutes' THEN 'online'
    WHEN cs.last_activity > NOW() - INTERVAL '30 minutes' THEN 'idle'
    ELSE 'offline'
  END as connection_status
FROM centcom_sessions cs
LEFT JOIN user_profiles up ON cs.user_id = up.id
WHERE cs.session_status = 'active'
ORDER BY cs.last_activity DESC;

-- Grant access to the view
GRANT SELECT ON active_centcom_sessions TO service_role;
GRANT SELECT ON active_centcom_sessions TO authenticated;

-- Create function to cleanup old sessions (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_centcom_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM centcom_sessions 
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND session_status != 'active';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's latest CentCom session
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
  FROM centcom_sessions cs
  WHERE cs.user_id = target_user_id
  ORDER BY cs.last_activity DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION cleanup_old_centcom_sessions() TO service_role;
GRANT EXECUTE ON FUNCTION get_user_latest_centcom_session(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_latest_centcom_session(UUID) TO authenticated;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'CentCom sessions table and supporting functions created successfully!';
  RAISE NOTICE 'Table: centcom_sessions';
  RAISE NOTICE 'View: active_centcom_sessions'; 
  RAISE NOTICE 'Functions: cleanup_old_centcom_sessions(), get_user_latest_centcom_session()';
  RAISE NOTICE 'Next step: Implement the API endpoint /api/admin/users/{user_id}/centcom-sessions';
END $$;


