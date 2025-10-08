-- Quick fix for IPv6 localhost location issue
UPDATE centcom_sessions 
SET 
  country = 'Local',
  city = 'Development', 
  timezone = 'America/Los_Angeles',
  sync_timestamp = NOW(),
  sync_source = 'ipv6_location_fix'
WHERE source_ip = '::1' 
  AND user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
  AND (country = 'Unknown' OR city = 'Unknown');

-- Also fix IPv4 localhost
UPDATE centcom_sessions 
SET 
  country = 'Local',
  city = 'Development',
  timezone = 'America/Los_Angeles',
  sync_timestamp = NOW(),
  sync_source = 'ipv4_location_fix'  
WHERE source_ip = '127.0.0.1'
  AND user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
  AND (country = 'Unknown' OR city = 'Unknown');

-- Show results
SELECT 
  centcom_session_id,
  app_version,
  platform,
  city || ', ' || country as location,
  source_ip,
  created_at
FROM centcom_sessions 
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
ORDER BY created_at DESC 
LIMIT 3;
