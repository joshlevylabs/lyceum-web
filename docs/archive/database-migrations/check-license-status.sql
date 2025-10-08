-- Check what's wrong with the license
SELECT 
  key_code,
  license_type,
  status,
  allows_local_cluster,
  local_cluster_limits,
  assigned_to
FROM license_keys
WHERE key_code = 'PLUGIN-ENT-2025-HQ21CIBF';

