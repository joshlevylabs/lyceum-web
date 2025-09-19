-- Fix current session issues: risk score and update activity
-- Run this in Supabase SQL Editor

-- Fix risk scores for IPv6 localhost sessions (should be 5, not 30)
UPDATE centcom_sessions 
SET 
  risk_score = 5,
  sync_timestamp = NOW(),
  sync_source = 'risk_score_fix'
WHERE source_ip = '::1' 
  AND user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
  AND risk_score > 10;

-- Fix risk scores for IPv4 localhost sessions 
UPDATE centcom_sessions 
SET 
  risk_score = 5,
  sync_timestamp = NOW(),
  sync_source = 'risk_score_fix'
WHERE source_ip = '127.0.0.1'
  AND user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
  AND risk_score > 10;

-- Update the latest session to show current activity (manual fix)
UPDATE centcom_sessions 
SET 
  last_activity = NOW(),
  session_status = 'active',
  sync_timestamp = NOW(),
  sync_source = 'manual_activity_update'
WHERE id = (
  SELECT id FROM centcom_sessions 
  WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Show the results
SELECT 
  'Fixed Session Data' as status,
  centcom_session_id,
  app_version,
  license_type,
  risk_score,
  session_status,
  city || ', ' || country as location,
  source_ip,
  created_at,
  last_activity,
  (EXTRACT(EPOCH FROM (NOW() - last_activity)) / 60)::int as minutes_since_activity
FROM centcom_sessions 
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
ORDER BY created_at DESC 
LIMIT 3;
