-- ============================================
-- Fix v_active_sessions view to include desktop sessions
-- ============================================
-- Date: 2025-01-25
-- Description: Updates the v_active_sessions view to include both web sessions
--              from user_sessions/session_activity tables AND desktop sessions
--              from centcom_sessions table, so that desktop sessions show as active
-- ============================================

-- Drop the existing view
DROP VIEW IF EXISTS v_active_sessions;

-- Recreate the view with UNION to include both web and desktop sessions
CREATE OR REPLACE VIEW v_active_sessions AS
-- Web sessions from user_sessions + session_activity
SELECT
  us.id,
  us.session_id,
  us.user_id,
  COALESCE(us.session_type, 'web') as session_type,
  us.device_name,
  us.platform,
  us.os,
  us.browser,
  us.location,
  us.license_type,
  us.mfa_verified,
  us.risk_score,
  us.ip_address,
  us.version as app_version,
  us.build,
  us.revoked_at,
  us.created_at as started_at,
  us.last_updated,
  us.updated_at,
  sa.status,
  sa.last_activity,
  CASE
    WHEN us.revoked_at IS NOT NULL THEN 'revoked'
    WHEN sa.status = 'active' THEN 'active'
    WHEN sa.last_activity > NOW() - INTERVAL '10 minutes' THEN 'active'
    ELSE 'inactive'
  END as computed_status,
  EXTRACT(EPOCH FROM (COALESCE(us.revoked_at, NOW()) - us.created_at)) as duration_seconds,
  us.user_agent
FROM user_sessions us
LEFT JOIN session_activity sa ON sa.session_id = us.session_id

UNION ALL

-- Desktop sessions from centcom_sessions
SELECT
  cs.id,
  cs.centcom_session_id as session_id,
  cs.user_id,
  'desktop' as session_type,
  cs.platform || ' Device' as device_name,
  cs.platform,
  NULL as os,
  cs.browser,
  cs.city || ', ' || cs.country as location,
  cs.license_type,
  cs.mfa_verified,
  cs.risk_score,
  cs.source_ip as ip_address,
  cs.app_version,
  cs.build_number as build,
  NULL as revoked_at,
  cs.created_at as started_at,
  cs.last_activity as last_updated,
  cs.updated_at,
  cs.session_status as status,
  cs.last_activity,
  CASE
    WHEN cs.session_status = 'terminated' THEN 'revoked'
    WHEN cs.session_status = 'active' THEN 'active'
    WHEN cs.session_status = 'idle' AND cs.last_activity > NOW() - INTERVAL '10 minutes' THEN 'active'
    WHEN cs.last_activity > NOW() - INTERVAL '10 minutes' THEN 'active'
    ELSE 'inactive'
  END as computed_status,
  EXTRACT(EPOCH FROM (NOW() - cs.created_at)) as duration_seconds,
  cs.user_agent
FROM centcom_sessions cs;

-- Grant permissions
GRANT SELECT ON v_active_sessions TO authenticated;

-- Verification
SELECT 'v_active_sessions view updated successfully!' as status;
SELECT 'The view now includes both web and desktop sessions' as info;
