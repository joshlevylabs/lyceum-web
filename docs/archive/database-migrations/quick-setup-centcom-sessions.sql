-- Quick setup for CentCom sessions table and sample data
-- Run this in Supabase SQL Editor

-- Create the centcom_sessions table
CREATE TABLE IF NOT EXISTS centcom_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  centcom_session_id VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ NOT NULL,
  session_status VARCHAR(50) DEFAULT 'active',
  source_ip INET,
  user_agent TEXT,
  mfa_verified BOOLEAN DEFAULT false,
  risk_score INTEGER DEFAULT 0,
  country VARCHAR(100),
  city VARCHAR(100),
  timezone VARCHAR(100),
  platform VARCHAR(50),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  app_name VARCHAR(100) DEFAULT 'CentCom',
  app_version VARCHAR(50),
  build_number VARCHAR(50),
  license_type VARCHAR(50),
  sync_timestamp TIMESTAMPTZ DEFAULT NOW(),
  sync_source VARCHAR(100),
  sync_version VARCHAR(20),
  inserted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_centcom_sessions_user_id ON centcom_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_centcom_sessions_last_activity ON centcom_sessions(last_activity);

-- Add sample data for your user ID (from console logs)
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
-- Active session (just finished)
(
  '2c3d4747-8d67-45af-90f5-b5e9058ec246',
  'centcom-demo-active-session',
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '2 minutes',
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
-- Recent session (earlier today)
(
  '2c3d4747-8d67-45af-90f5-b5e9058ec246',
  'centcom-demo-recent-session',
  NOW() - INTERVAL '6 hours',
  NOW() - INTERVAL '4 hours',
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
  'enterprise',
  'centcom_session_manager',
  '1.0'
)
ON CONFLICT (centcom_session_id) DO NOTHING;

-- Verify the data was inserted
SELECT 
  centcom_session_id,
  created_at,
  last_activity,
  session_status,
  country,
  city,
  app_version,
  license_type,
  CASE 
    WHEN last_activity > NOW() - INTERVAL '5 minutes' THEN 'online'
    WHEN last_activity > NOW() - INTERVAL '30 minutes' THEN 'idle'  
    WHEN last_activity > NOW() - INTERVAL '1 day' THEN 'recent'
    ELSE 'offline'
  END as connection_status
FROM centcom_sessions 
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
ORDER BY last_activity DESC;
