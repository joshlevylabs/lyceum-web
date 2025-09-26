-- Fix existing CentCom sessions with better data
-- This updates existing sessions to have correct location and improved parsing

-- Update IPv6 localhost sessions to show proper location
UPDATE centcom_sessions 
SET 
  country = 'Local',
  city = 'Development',
  timezone = 'America/Los_Angeles'  -- Update to your timezone
WHERE source_ip = '::1' 
  AND (country = 'Unknown' OR city = 'Unknown');

-- Update IPv4 localhost sessions 
UPDATE centcom_sessions 
SET 
  country = 'Local', 
  city = 'Development',
  timezone = 'America/Los_Angeles'  -- Update to your timezone
WHERE source_ip = '127.0.0.1'
  AND (country = 'Unknown' OR city = 'Unknown');

-- Fix app versions based on user agent patterns
UPDATE centcom_sessions 
SET app_version = '1.0.0'
WHERE user_agent LIKE '%Centcom/1.0%' 
  AND app_version != '1.0.0';

-- Fix platform detection for sessions with user agents that show platform info
UPDATE centcom_sessions 
SET platform = 'Windows'
WHERE user_agent LIKE '%Windows%' 
  AND (platform = 'Unknown' OR platform = 'windows');

UPDATE centcom_sessions 
SET platform = 'macOS'
WHERE (user_agent LIKE '%Mac%' OR user_agent LIKE '%Darwin%')
  AND platform = 'Unknown';

UPDATE centcom_sessions 
SET platform = 'Linux'
WHERE user_agent LIKE '%Linux%' 
  AND platform = 'Unknown';

-- Update browser information for better identification
UPDATE centcom_sessions 
SET browser = 'CentCom Desktop'
WHERE user_agent LIKE '%CentCom%' 
  AND browser != 'CentCom Desktop';

UPDATE centcom_sessions 
SET browser = 'Tauri WebView'
WHERE user_agent LIKE '%Tauri%' 
  AND browser != 'Tauri WebView';

-- Recalculate risk scores for localhost sessions (should be lower)
UPDATE centcom_sessions 
SET risk_score = 5
WHERE source_ip IN ('127.0.0.1', '::1') 
  AND platform IN ('Windows', 'macOS', 'Linux')
  AND device_type = 'desktop';

-- Update sync metadata to indicate this fix
UPDATE centcom_sessions 
SET 
  sync_timestamp = NOW(),
  sync_source = 'session_data_fix',
  sync_version = '1.1'
WHERE sync_source != 'session_data_fix';

-- Show the results
SELECT 
  'Fixed Sessions Summary' as status,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN country = 'Local' THEN 1 END) as local_sessions,
  COUNT(CASE WHEN app_version = '1.0.0' THEN 1 END) as v1_0_0_sessions,
  COUNT(CASE WHEN app_version = '2.1.0' THEN 1 END) as v2_1_0_sessions,
  COUNT(CASE WHEN platform != 'Unknown' THEN 1 END) as sessions_with_platform,
  COUNT(CASE WHEN risk_score <= 10 THEN 1 END) as low_risk_sessions
FROM centcom_sessions
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- Show detailed session info after the fix
SELECT 
  centcom_session_id,
  app_version,
  platform,
  country,
  city,
  source_ip,
  risk_score,
  browser,
  user_agent,
  created_at
FROM centcom_sessions 
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
ORDER BY created_at DESC
LIMIT 5;


