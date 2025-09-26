-- Fix the SQL order - create column first, then update data
-- Run this in Supabase SQL Editor

-- STEP 1: Add the external_session_id column first
ALTER TABLE centcom_sessions 
ADD COLUMN IF NOT EXISTS external_session_id VARCHAR(255);

-- STEP 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_centcom_sessions_external_id 
ON centcom_sessions(external_session_id);

-- STEP 3: Now update the session data (column exists now)
UPDATE centcom_sessions 
SET 
  license_type = 'enterprise',
  external_session_id = '3e5632d96ce995f3e9f8f958a339b2ba76b14ac1d94779a14b70fb764ed4172d',
  risk_score = 10,
  last_activity = NOW(),
  session_status = 'active',
  sync_timestamp = NOW(),
  sync_source = 'manual_correlation_fix'
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
  AND id = (
    SELECT id FROM centcom_sessions 
    WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
    ORDER BY created_at DESC 
    LIMIT 1
  );

-- STEP 4: Show the corrected session
SELECT 
  'Session Fixed' as status,
  centcom_session_id as lyceum_session_id,
  external_session_id as centcom_session_id,
  app_version,
  license_type,
  session_status,
  risk_score,
  created_at,
  last_activity,
  city || ', ' || country as location
FROM centcom_sessions 
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
ORDER BY created_at DESC 
LIMIT 1;


