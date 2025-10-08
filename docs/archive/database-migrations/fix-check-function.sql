-- Fix the check_local_cluster_allowed function
-- The issue is VARCHAR vs TEXT type mismatch

DROP FUNCTION IF EXISTS check_local_cluster_allowed(UUID);

CREATE OR REPLACE FUNCTION check_local_cluster_allowed(p_user_id UUID)
RETURNS TABLE (
  allowed BOOLEAN,
  license_type TEXT,  -- Changed from VARCHAR to TEXT
  limits JSONB,
  current_usage JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.allows_local_cluster AS allowed,
    l.license_type,
    l.local_cluster_limits AS limits,
    jsonb_build_object(
      'storage_used_gb', COALESCE(lcu.storage_used_gb, 0),
      'queries_this_month', COALESCE(lcu.queries_this_month, 0),
      'last_heartbeat', lcu.last_heartbeat_at
    ) AS current_usage
  FROM license_keys l
  LEFT JOIN local_cluster_usage lcu ON lcu.license_id = l.id AND lcu.user_id = p_user_id
  WHERE l.assigned_to = p_user_id
    AND l.status = 'active'
  ORDER BY l.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test it
SELECT * FROM check_local_cluster_allowed('2c3d4747-8d67-45af-90f5-b5e9058ec246');

