-- ================================================================
-- CENTCOM LOCAL CLUSTER PHASE 1 - REGISTRATION & HEARTBEAT
-- ================================================================
-- Migration to enhance local_cluster_usage table for full
-- registration and heartbeat support
-- ================================================================

-- 1. Add missing columns to existing local_cluster_usage table
ALTER TABLE local_cluster_usage
ADD COLUMN IF NOT EXISTS cluster_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS cluster_key VARCHAR(50),
ADD COLUMN IF NOT EXISTS cluster_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS installation_id UUID,
ADD COLUMN IF NOT EXISTS centcom_version VARCHAR(50),
ADD COLUMN IF NOT EXISTS uptime_seconds BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS project_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS measurement_count BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS table_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_bytes BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS sync_token_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS os_version VARCHAR(100),
ADD COLUMN IF NOT EXISTS architecture VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_running BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS hostname VARCHAR(255);

-- 2. Backfill cluster_id for existing rows
UPDATE local_cluster_usage
SET cluster_id = gen_random_uuid()
WHERE cluster_id IS NULL;

-- 3. Make cluster_id NOT NULL after backfill
ALTER TABLE local_cluster_usage ALTER COLUMN cluster_id SET NOT NULL;

-- 4. Create unique index on cluster_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_local_cluster_cluster_id
ON local_cluster_usage(cluster_id);

-- 5. Add additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_local_cluster_status
ON local_cluster_usage(cluster_status);

CREATE INDEX IF NOT EXISTS idx_local_cluster_installation_id
ON local_cluster_usage(installation_id);

CREATE INDEX IF NOT EXISTS idx_local_cluster_machine_fingerprint
ON local_cluster_usage(machine_fingerprint);

-- 6. Create usage history table for heartbeat data
CREATE TABLE IF NOT EXISTS local_cluster_usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID NOT NULL,

    -- Usage metrics
    storage_used_gb DECIMAL(10, 3),
    storage_bytes BIGINT,
    queries_count INTEGER,
    project_count INTEGER,
    measurement_count BIGINT,
    table_count INTEGER,

    -- Status
    is_running BOOLEAN,
    uptime_seconds BIGINT,

    -- Timestamp
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Add foreign key constraint
ALTER TABLE local_cluster_usage_history
ADD CONSTRAINT fk_cluster_id
FOREIGN KEY (cluster_id)
REFERENCES local_cluster_usage(cluster_id)
ON DELETE CASCADE;

-- 8. Create index for efficient history queries
CREATE INDEX IF NOT EXISTS idx_usage_history_cluster_time
ON local_cluster_usage_history(cluster_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_history_recorded
ON local_cluster_usage_history(recorded_at DESC);

-- 9. Create monthly aggregation table for long-term retention
CREATE TABLE IF NOT EXISTS local_cluster_usage_monthly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID NOT NULL REFERENCES local_cluster_usage(cluster_id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),

    -- Aggregated metrics
    avg_storage_gb DECIMAL(10, 3),
    max_storage_gb DECIMAL(10, 3),
    min_storage_gb DECIMAL(10, 3),
    total_queries INTEGER,
    avg_uptime_percentage DECIMAL(5, 2),
    heartbeat_count INTEGER,

    -- Constraints
    CONSTRAINT unique_cluster_month UNIQUE (cluster_id, year, month)
);

-- 10. Add RLS policies for history table
ALTER TABLE local_cluster_usage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage history"
ON local_cluster_usage_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM local_cluster_usage lcu
        WHERE lcu.cluster_id = local_cluster_usage_history.cluster_id
        AND lcu.user_id = auth.uid()
    )
);

-- 11. Add RLS policies for monthly table
ALTER TABLE local_cluster_usage_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own monthly stats"
ON local_cluster_usage_monthly FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM local_cluster_usage lcu
        WHERE lcu.cluster_id = local_cluster_usage_monthly.cluster_id
        AND lcu.user_id = auth.uid()
    )
);

-- 12. Create function to auto-generate cluster keys
CREATE OR REPLACE FUNCTION generate_cluster_key()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cluster_key IS NULL THEN
        NEW.cluster_key := 'LOCAL-' || LPAD(
            (SELECT COUNT(*) + 1 FROM local_cluster_usage)::TEXT,
            4,
            '0'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create trigger to auto-generate cluster keys
DROP TRIGGER IF EXISTS trigger_generate_cluster_key ON local_cluster_usage;
CREATE TRIGGER trigger_generate_cluster_key
BEFORE INSERT ON local_cluster_usage
FOR EACH ROW
EXECUTE FUNCTION generate_cluster_key();

-- 14. Create function to check if cluster is online (last heartbeat < 30 min)
CREATE OR REPLACE FUNCTION is_cluster_online(p_cluster_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM local_cluster_usage
        WHERE cluster_id = p_cluster_id
        AND last_heartbeat_at > NOW() - INTERVAL '30 minutes'
    );
END;
$$ LANGUAGE plpgsql;

-- 15. Create function to get aggregated usage for a user (all machines)
CREATE OR REPLACE FUNCTION get_user_total_local_usage(p_user_id UUID)
RETURNS TABLE (
    total_storage_gb DECIMAL,
    total_queries INTEGER,
    cluster_count INTEGER,
    online_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(storage_used_gb), 0) AS total_storage_gb,
        COALESCE(SUM(queries_this_month), 0)::INTEGER AS total_queries,
        COUNT(*)::INTEGER AS cluster_count,
        COUNT(*) FILTER (WHERE last_heartbeat_at > NOW() - INTERVAL '30 minutes')::INTEGER AS online_count
    FROM local_cluster_usage
    WHERE user_id = p_user_id
    AND cluster_status NOT IN ('decommissioned');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Create function to auto-decommission stale clusters (>30 days offline)
CREATE OR REPLACE FUNCTION decommission_stale_clusters()
RETURNS TABLE (
    decommissioned_cluster_id UUID,
    cluster_name VARCHAR,
    last_seen_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    UPDATE local_cluster_usage
    SET cluster_status = 'decommissioned',
        updated_at = NOW()
    WHERE last_heartbeat_at < NOW() - INTERVAL '30 days'
    AND cluster_status NOT IN ('decommissioned')
    RETURNING cluster_id, cluster_name, last_heartbeat_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Grant necessary permissions to service role
GRANT ALL ON local_cluster_usage TO service_role;
GRANT ALL ON local_cluster_usage_history TO service_role;
GRANT ALL ON local_cluster_usage_monthly TO service_role;

-- 18. Create scheduled job to auto-decommission stale clusters (optional, requires pg_cron)
-- Uncomment if pg_cron is enabled:
-- SELECT cron.schedule(
--     'auto-decommission-stale-clusters',
--     '0 2 * * *', -- Run daily at 2 AM
--     $$ SELECT decommission_stale_clusters() $$
-- );

-- 19. Completion message
DO $$
BEGIN
    RAISE NOTICE '✅ Local cluster Phase 1 migration complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '- Enhanced local_cluster_usage table with %s new columns',
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name = 'local_cluster_usage'
         AND column_name IN ('cluster_id', 'cluster_key', 'cluster_name', 'installation_id',
                             'centcom_version', 'uptime_seconds', 'project_count',
                             'measurement_count', 'table_count', 'storage_bytes',
                             'sync_token_hash', 'os_version', 'architecture',
                             'is_running', 'hostname'));
    RAISE NOTICE '- Created local_cluster_usage_history table';
    RAISE NOTICE '- Created local_cluster_usage_monthly table';
    RAISE NOTICE '- Added 6 helper functions';
    RAISE NOTICE '- Created 8 indexes for performance';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Deploy registration endpoint: /api/centcom/clusters/local/register';
    RAISE NOTICE '2. Deploy heartbeat endpoint: /api/centcom/clusters/local/heartbeat';
    RAISE NOTICE '3. Test with Centcom desktop app';
END $$;
