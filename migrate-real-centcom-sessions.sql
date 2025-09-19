-- Migration script to convert real auth_logs entries to centcom_sessions
-- This will populate your centcom_sessions table with REAL data from existing CentCom logins

-- First, remove the test data we added
DELETE FROM centcom_sessions 
WHERE centcom_session_id LIKE 'centcom-demo-%';

-- Convert auth_logs entries to centcom_sessions
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
  sync_timestamp,
  sync_source,
  sync_version
)
SELECT DISTINCT ON (al.user_id, DATE_TRUNC('hour', al.created_at))
  al.user_id,
  'migrated-' || al.id::text, -- Use auth_log ID as session ID
  al.created_at,
  al.created_at + INTERVAL '30 minutes', -- Assume 30min session duration
  CASE 
    WHEN al.created_at > NOW() - INTERVAL '1 hour' THEN 'active'
    ELSE 'terminated'
  END as session_status,
  COALESCE(al.ip_address::inet, '127.0.0.1'::inet),
  COALESCE(
    al.client_info->>'user_agent',
    ual.user_agent,
    'CentCom Desktop Application'
  ),
  false as mfa_verified, -- Default to false, can be updated
  CASE 
    WHEN al.ip_address = '127.0.0.1' THEN 5  -- Local/safe
    WHEN al.ip_address LIKE '192.168.%' THEN 10  -- Private network
    WHEN al.ip_address LIKE '10.%' THEN 10       -- Private network  
    ELSE 20  -- Public IP
  END as risk_score,
  'United States' as country, -- Default country
  'Unknown' as city,          -- Default city
  'America/New_York' as timezone, -- Default timezone
  CASE 
    WHEN al.client_info->>'user_agent' LIKE '%Windows%' THEN 'Windows'
    WHEN al.client_info->>'user_agent' LIKE '%Mac%' THEN 'macOS'
    WHEN al.client_info->>'user_agent' LIKE '%Linux%' THEN 'Linux'
    ELSE 'Unknown'
  END as platform,
  'desktop' as device_type,
  CASE 
    WHEN al.client_info->>'user_agent' LIKE '%CentCom%' THEN 'Tauri WebView'
    WHEN al.client_info->>'user_agent' LIKE '%Electron%' THEN 'Electron'
    ELSE 'Desktop Application'
  END as browser,
  'CentCom' as app_name,
  COALESCE(al.client_info->>'version', '2.1.0') as app_version,
  COALESCE(al.client_info->>'build', '2024.12.001') as build_number,
  'professional' as license_type, -- Default license type
  al.created_at as sync_timestamp,
  'auth_logs_migration' as sync_source,
  '1.0' as sync_version
FROM auth_logs al
LEFT JOIN user_activity_logs ual ON (
  ual.user_id = al.user_id 
  AND ual.created_at BETWEEN al.created_at - INTERVAL '5 minutes' 
                        AND al.created_at + INTERVAL '5 minutes'
  AND ual.activity_type = 'login'
)
WHERE (
  al.app_id = 'centcom' 
  OR al.session_type = 'centcom' 
  OR al.application_type = 'centcom'
)
AND al.success = true
AND al.created_at > NOW() - INTERVAL '30 days' -- Only last 30 days
ORDER BY al.user_id, DATE_TRUNC('hour', al.created_at), al.created_at DESC
ON CONFLICT (centcom_session_id) DO NOTHING;

-- Also create sessions from user_activity_logs if we don't have auth_logs
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
  sync_timestamp,
  sync_source,
  sync_version
)
SELECT DISTINCT ON (ual.user_id, DATE_TRUNC('hour', ual.created_at))
  ual.user_id,
  'activity-migrated-' || ual.id::text,
  ual.created_at,
  ual.created_at + INTERVAL '45 minutes', -- Assume 45min session
  CASE 
    WHEN ual.created_at > NOW() - INTERVAL '2 hours' THEN 'active'
    ELSE 'terminated'
  END as session_status,
  COALESCE(ual.ip_address::inet, '127.0.0.1'::inet),
  COALESCE(ual.user_agent, 'CentCom Desktop Application'),
  false as mfa_verified,
  15 as risk_score, -- Medium default
  'United States' as country,
  'Unknown' as city,
  'America/New_York' as timezone,
  CASE 
    WHEN ual.user_agent LIKE '%Windows%' THEN 'Windows'
    WHEN ual.user_agent LIKE '%Mac%' THEN 'macOS' 
    WHEN ual.user_agent LIKE '%Linux%' THEN 'Linux'
    ELSE 'Unknown'
  END as platform,
  'desktop' as device_type,
  'Tauri WebView' as browser,
  'CentCom' as app_name,
  COALESCE(ual.metadata->>'app_version', '2.1.0') as app_version,
  '2024.12.001' as build_number,
  'professional' as license_type,
  ual.created_at as sync_timestamp,
  'activity_logs_migration' as sync_source,
  '1.0' as sync_version
FROM user_activity_logs ual
WHERE ual.activity_type = 'login' 
  AND (ual.description LIKE '%CentCom%' OR ual.metadata->>'login_type' = 'centcom')
  AND ual.created_at > NOW() - INTERVAL '30 days'
  AND NOT EXISTS (
    -- Don't duplicate if we already have it from auth_logs
    SELECT 1 FROM centcom_sessions cs 
    WHERE cs.user_id = ual.user_id 
      AND cs.created_at BETWEEN ual.created_at - INTERVAL '5 minutes' 
                           AND ual.created_at + INTERVAL '5 minutes'
  )
ORDER BY ual.user_id, DATE_TRUNC('hour', ual.created_at), ual.created_at DESC
ON CONFLICT (centcom_session_id) DO NOTHING;

-- Show what we migrated
SELECT 
  'Migration Results' as summary,
  COUNT(*) as total_sessions_created,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as earliest_session,
  MAX(created_at) as latest_session
FROM centcom_sessions 
WHERE sync_source IN ('auth_logs_migration', 'activity_logs_migration');

-- Show sessions for your specific user
SELECT 
  centcom_session_id,
  created_at,
  last_activity,
  session_status,
  source_ip,
  platform,
  app_version,
  sync_source,
  CASE 
    WHEN last_activity > NOW() - INTERVAL '5 minutes' THEN 'online'
    WHEN last_activity > NOW() - INTERVAL '30 minutes' THEN 'idle'
    WHEN last_activity > NOW() - INTERVAL '1 day' THEN 'recent'
    ELSE 'offline'
  END as connection_status
FROM centcom_sessions 
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
ORDER BY last_activity DESC;

RAISE NOTICE 'Migration completed! Real CentCom session data has been imported.';
