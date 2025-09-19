-- Test data for CentCom sessions
-- This creates sample session data for testing the admin panel display

-- First, let's check if the table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'centcom_sessions') THEN
        -- Create the table if it doesn't exist
        CREATE TABLE centcom_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
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
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_centcom_sessions_user_id ON centcom_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_centcom_sessions_last_activity ON centcom_sessions(last_activity);
        CREATE INDEX IF NOT EXISTS idx_centcom_sessions_status ON centcom_sessions(session_status);
        
        RAISE NOTICE 'Created centcom_sessions table';
    END IF;
END $$;

-- Insert test data for the user ID from the console logs
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
) VALUES 
-- Active session (recently active)
(
  '2c3d4747-8d67-45af-90f5-b5e9058ec246',
  'centcom-session-' || substr(gen_random_uuid()::text, 1, 8),
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '5 minutes',
  'active',
  '192.168.1.100'::inet,
  'CentCom/2.1.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  false,
  15,
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
),
-- Recent session (within last 24 hours)
(
  '2c3d4747-8d67-45af-90f5-b5e9058ec246',
  'centcom-session-' || substr(gen_random_uuid()::text, 1, 8),
  NOW() - INTERVAL '8 hours',
  NOW() - INTERVAL '2 hours',
  'terminated',
  '192.168.1.100'::inet,
  'CentCom/2.1.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  true,
  5,
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
),
-- Older session
(
  '2c3d4747-8d67-45af-90f5-b5e9058ec246',
  'centcom-session-' || substr(gen_random_uuid()::text, 1, 8),
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days' + INTERVAL '1 hour',
  'terminated',
  '10.0.0.50'::inet,
  'CentCom/2.0.8 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  false,
  25,
  'United States',
  'San Francisco',
  'America/Los_Angeles',
  'Windows',
  'desktop',
  'Tauri WebView',
  'CentCom',
  '2.0.8',
  '2024.11.015',
  'enterprise',
  'centcom_session_manager',
  '1.0'
)
ON CONFLICT (centcom_session_id) DO NOTHING;

-- Also insert test data for any other existing users (limit to 5)
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
  'centcom-session-' || substr(gen_random_uuid()::text, 1, 8),
  NOW() - (random() * INTERVAL '7 days'),
  NOW() - (random() * INTERVAL '2 days'),
  CASE WHEN random() > 0.7 THEN 'active' ELSE 'terminated' END,
  ('192.168.1.' || floor(random() * 255))::inet,
  'CentCom/2.1.0 (Windows NT 10.0; Win64; x64)',
  random() > 0.6,
  floor(random() * 30)::integer,
  CASE WHEN random() > 0.5 THEN 'United States' ELSE 'Canada' END,
  CASE WHEN random() > 0.5 THEN 'New York' ELSE 'Toronto' END,
  CASE WHEN random() > 0.5 THEN 'America/New_York' ELSE 'America/Toronto' END,
  'Windows',
  'desktop',
  'Tauri WebView',
  'CentCom',
  '2.1.0',
  '2024.12.001',
  CASE WHEN random() > 0.5 THEN 'professional' ELSE 'enterprise' END,
  'centcom_session_manager',
  '1.0'
FROM (
  SELECT id FROM auth.users 
  WHERE id != '2c3d4747-8d67-45af-90f5-b5e9058ec246'
  LIMIT 5
) u
ON CONFLICT (centcom_session_id) DO NOTHING;

-- Show what was inserted
SELECT 
  cs.user_id,
  cs.centcom_session_id,
  cs.created_at,
  cs.last_activity,
  cs.session_status,
  cs.source_ip,
  cs.country,
  cs.city,
  cs.app_version,
  cs.license_type,
  CASE 
    WHEN cs.last_activity > NOW() - INTERVAL '5 minutes' THEN 'online'
    WHEN cs.last_activity > NOW() - INTERVAL '30 minutes' THEN 'idle'
    WHEN cs.last_activity > NOW() - INTERVAL '1 day' THEN 'recent'
    ELSE 'offline'
  END as connection_status
FROM centcom_sessions cs
ORDER BY cs.last_activity DESC
LIMIT 10;

-- Show summary by user
SELECT 
  user_id,
  COUNT(*) as total_sessions,
  MAX(last_activity) as latest_activity,
  COUNT(CASE WHEN session_status = 'active' THEN 1 END) as active_sessions
FROM centcom_sessions
GROUP BY user_id
ORDER BY latest_activity DESC;

RAISE NOTICE 'CentCom session test data has been inserted successfully!';
RAISE NOTICE 'You can now test the admin panel Sessions tab to see the "Last CentCom Login" section.';
