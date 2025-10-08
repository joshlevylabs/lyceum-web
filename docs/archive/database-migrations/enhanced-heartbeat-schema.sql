-- Enhanced database schema for CentCom's optimized heartbeat system
-- Run this after fix-session-immediate.sql

-- Add optimized heartbeat tracking columns
ALTER TABLE centcom_sessions ADD COLUMN IF NOT EXISTS
    heartbeat_type VARCHAR(20),
    sync_source VARCHAR(50),
    sync_version VARCHAR(20),
    last_sync_interval INTEGER,
    heartbeat_frequency VARCHAR(20),
    optimization_enabled BOOLEAN DEFAULT TRUE;

-- Add indexes for heartbeat monitoring and performance
CREATE INDEX IF NOT EXISTS idx_centcom_sessions_heartbeat_type 
ON centcom_sessions(heartbeat_type, last_activity);

CREATE INDEX IF NOT EXISTS idx_centcom_sessions_sync_source 
ON centcom_sessions(sync_source, sync_version);

-- Create heartbeat metrics table for monitoring
CREATE TABLE IF NOT EXISTS centcom_heartbeat_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    heartbeat_type VARCHAR(20),
    total_count INTEGER,
    unique_sessions INTEGER,
    avg_interval_seconds INTEGER,
    server_load_reduction_percent DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for metrics queries
CREATE INDEX IF NOT EXISTS idx_heartbeat_metrics_date_type 
ON centcom_heartbeat_metrics(date, heartbeat_type);

-- Update existing sessions to use optimized heartbeat
UPDATE centcom_sessions 
SET 
    heartbeat_type = CASE 
        WHEN session_status = 'active' THEN 'active_sync'
        WHEN session_status = 'idle' THEN 'idle_sync'
        ELSE 'unknown'
    END,
    sync_version = '2.0_optimized',
    optimization_enabled = TRUE,
    last_sync_interval = CASE
        WHEN session_status = 'active' THEN 480000  -- 8 minutes in milliseconds
        WHEN session_status = 'idle' THEN 86400000  -- 24 hours in milliseconds
        ELSE 480000
    END
WHERE heartbeat_type IS NULL;

-- Show enhanced schema results
SELECT 
    'Enhanced Schema Applied' as status,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN heartbeat_type = 'active_sync' THEN 1 END) as active_sessions,
    COUNT(CASE WHEN heartbeat_type = 'idle_sync' THEN 1 END) as idle_sessions,
    COUNT(CASE WHEN optimization_enabled = TRUE THEN 1 END) as optimized_sessions
FROM centcom_sessions;
