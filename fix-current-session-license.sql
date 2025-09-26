-- Fix the current session to show enterprise license instead of trial
-- Run this in Supabase SQL Editor

-- Update the latest session to show correct enterprise license
UPDATE centcom_sessions 
SET 
  license_type = 'enterprise',
  sync_timestamp = NOW(),
  sync_source = 'license_correction'
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
  AND license_type = 'trial'
  AND id = (
    SELECT id FROM centcom_sessions 
    WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
    ORDER BY created_at DESC 
    LIMIT 1
  );

-- Show the corrected session
SELECT 
  'Corrected Session' as status,
  centcom_session_id,
  app_version,
  license_type,
  session_status,
  created_at,
  last_activity,
  city || ', ' || country as location
FROM centcom_sessions 
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
ORDER BY created_at DESC 
LIMIT 1;


