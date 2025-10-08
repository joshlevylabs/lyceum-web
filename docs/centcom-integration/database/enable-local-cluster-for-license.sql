-- ================================================================
-- ENABLE LOCAL CLUSTER SUPPORT FOR YOUR LICENSE
-- Run this in Supabase SQL Editor
-- ================================================================

-- Enable local cluster support for your specific license
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
WHERE key_code = 'PLUGIN-ENT-2025-HQ21CIBF';

-- Verify it worked
SELECT 
  key_code,
  license_type,
  allows_local_cluster as "Local Cluster Enabled?",
  local_cluster_limits as "Limits"
FROM license_keys
WHERE key_code = 'PLUGIN-ENT-2025-HQ21CIBF';

