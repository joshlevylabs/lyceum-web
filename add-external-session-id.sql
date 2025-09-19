-- Add external_session_id column to store CentCom's session ID
-- This allows correlation between CentCom and Lyceum session tracking

-- Add the external session ID column
ALTER TABLE centcom_sessions 
ADD COLUMN IF NOT EXISTS external_session_id VARCHAR(255);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_centcom_sessions_external_id 
ON centcom_sessions(external_session_id);

-- Update existing session to have a sample external ID for testing
UPDATE centcom_sessions 
SET external_session_id = '3e5632d96ce995f3e9f8f958a339b2ba76b14ac1d94779a14b70fb764ed4172d'
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
  AND id = (
    SELECT id FROM centcom_sessions 
    WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
    ORDER BY created_at DESC 
    LIMIT 1
  );

-- Show the result
SELECT 
  'Session Correlation Added' as status,
  centcom_session_id as lyceum_session_id,
  external_session_id as centcom_session_id,
  app_version,
  license_type,
  created_at,
  last_activity
FROM centcom_sessions 
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
ORDER BY created_at DESC 
LIMIT 1;
