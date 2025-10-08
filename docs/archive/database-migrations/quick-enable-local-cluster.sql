-- Quick fix: Enable local cluster for your license
-- Just run this simple update

UPDATE license_keys
SET 
  allows_local_cluster = TRUE,
  local_cluster_limits = '{"max_storage_gb": 500, "max_monthly_queries": 10000000, "max_users": -1, "lifecycle_tiers_enabled": true, "offline_grace_days": 30}'::jsonb
WHERE key_code = 'PLUGIN-ENT-2025-HQ21CIBF';

-- Verify it worked
SELECT 
  key_code,
  allows_local_cluster,
  local_cluster_limits
FROM license_keys
WHERE key_code = 'PLUGIN-ENT-2025-HQ21CIBF';

