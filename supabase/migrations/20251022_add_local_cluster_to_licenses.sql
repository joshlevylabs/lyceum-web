-- ================================================================
-- ADD LOCAL CLUSTER SUPPORT TO LICENSE_KEYS TABLE
-- ================================================================
-- Migration to add local cluster configuration to license_keys
-- ================================================================

-- 1. Add allows_local_cluster column
ALTER TABLE license_keys
ADD COLUMN IF NOT EXISTS allows_local_cluster BOOLEAN DEFAULT FALSE;

-- 2. Add local_cluster_limits column (JSONB for flexible configuration)
ALTER TABLE license_keys
ADD COLUMN IF NOT EXISTS local_cluster_limits JSONB DEFAULT '{
  "max_storage_gb": 10,
  "max_monthly_queries": 100000,
  "max_users": 1,
  "lifecycle_tiers_enabled": false,
  "offline_grace_days": 7
}'::jsonb;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_license_keys_allows_local_cluster
ON license_keys(allows_local_cluster)
WHERE allows_local_cluster = TRUE;

-- 4. Add comment for documentation
COMMENT ON COLUMN license_keys.allows_local_cluster IS
  'Whether this license allows local ClickHouse cluster deployment';

COMMENT ON COLUMN license_keys.local_cluster_limits IS
  'JSONB configuration for local cluster limits: max_storage_gb, max_monthly_queries, max_users, lifecycle_tiers_enabled, offline_grace_days';

-- 5. Enable local cluster support for enterprise licenses by default
UPDATE license_keys
SET
  allows_local_cluster = TRUE,
  local_cluster_limits = '{
    "max_storage_gb": 500,
    "max_monthly_queries": 10000000,
    "max_users": -1,
    "lifecycle_tiers_enabled": true,
    "offline_grace_days": 30
  }'::jsonb
WHERE license_type IN ('enterprise', 'professional')
  AND allows_local_cluster IS NULL OR allows_local_cluster = FALSE;

-- 6. Completion message
DO $$
BEGIN
    RAISE NOTICE '✅ Local cluster columns added to license_keys table!';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '- Added allows_local_cluster column (boolean)';
    RAISE NOTICE '- Added local_cluster_limits column (jsonb)';
    RAISE NOTICE '- Created performance index';
    RAISE NOTICE '- Auto-enabled for % enterprise/professional licenses',
        (SELECT COUNT(*) FROM license_keys
         WHERE license_type IN ('enterprise', 'professional')
         AND allows_local_cluster = TRUE);
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update admin panel to show local cluster configuration';
    RAISE NOTICE '2. Test registration with enabled license';
END $$;
