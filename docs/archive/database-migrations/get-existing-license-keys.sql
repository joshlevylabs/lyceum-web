-- ================================================================
-- GET EXISTING LICENSE KEYS FOR TESTING
-- Run this to see what license keys you already have
-- ================================================================

-- Show all license keys with their details
SELECT 
  key_code as "📋 LICENSE KEY CODE",
  license_type as "Type",
  status as "Status",
  allows_local_cluster as "Local Cluster?",
  local_cluster_limits as "Limits",
  assigned_to as "Assigned User ID",
  expires_at as "Expires"
FROM license_keys
WHERE status = 'active'
ORDER BY created_at DESC;

-- If you have any licenses, you can use any key_code value for testing!

