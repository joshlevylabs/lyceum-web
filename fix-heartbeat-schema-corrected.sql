-- Fixed SQL syntax for adding optimized heartbeat columns
-- Run this in Supabase SQL Editor

-- Add each column separately (PostgreSQL syntax)
ALTER TABLE centcom_sessions ADD COLUMN IF NOT EXISTS heartbeat_type VARCHAR(20);
ALTER TABLE centcom_sessions ADD COLUMN IF NOT EXISTS sync_source VARCHAR(50);
ALTER TABLE centcom_sessions ADD COLUMN IF NOT EXISTS sync_version VARCHAR(20);
ALTER TABLE centcom_sessions ADD COLUMN IF NOT EXISTS last_sync_interval INTEGER;
ALTER TABLE centcom_sessions ADD COLUMN IF NOT EXISTS heartbeat_frequency VARCHAR(20);
ALTER TABLE centcom_sessions ADD COLUMN IF NOT EXISTS optimization_enabled BOOLEAN DEFAULT TRUE;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_centcom_sessions_heartbeat_type 
ON centcom_sessions(heartbeat_type, last_activity);

CREATE INDEX IF NOT EXISTS idx_centcom_sessions_sync_source 
ON centcom_sessions(sync_source, sync_version);

-- Update existing session with optimization data
UPDATE centcom_sessions 
SET 
    heartbeat_type = 'active_sync',
    sync_source = 'centcom_optimized_active_sync',
    sync_version = '2.0_optimized',
    optimization_enabled = TRUE,
    last_sync_interval = 480000,
    heartbeat_frequency = 'optimized_active'
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- Show the enhanced session data
SELECT 
    'Enhanced Heartbeat Schema Applied' as status,
    centcom_session_id,
    external_session_id,
    app_version,
    license_type,
    session_status,
    heartbeat_type,
    sync_source,
    sync_version,
    last_sync_interval,
    optimization_enabled,
    created_at,
    last_activity
FROM centcom_sessions 
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
ORDER BY created_at DESC 
LIMIT 1;
