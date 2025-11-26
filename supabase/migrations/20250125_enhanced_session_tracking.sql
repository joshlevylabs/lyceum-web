-- ============================================
-- Enhanced Session Tracking Migration
-- ============================================
-- Date: 2025-01-25
-- Description: Adds comprehensive session tracking for both web and desktop sessions
--              Includes device info, location, license type, MFA status, risk score,
--              and session termination/revocation capabilities
-- ============================================

-- Add new columns to user_sessions table
ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'desktop' CHECK (session_type IN ('web', 'desktop')),
ADD COLUMN IF NOT EXISTS device_name TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS license_type TEXT CHECK (license_type IN ('trial', 'basic', 'pro', 'enterprise', 'unknown')),
ADD COLUMN IF NOT EXISTS mfa_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS browser TEXT,
ADD COLUMN IF NOT EXISTS os TEXT,
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_ip_change TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS session_metadata JSONB DEFAULT '{}';

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_type ON user_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_license_type ON user_sessions(license_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked_at ON user_sessions(revoked_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_session_type ON user_sessions(user_id, session_type);

-- Add comment to explain session_metadata JSONB field
COMMENT ON COLUMN user_sessions.session_metadata IS 'Flexible field for additional session data like screen resolution, timezone, language, etc.';

-- ============================================
-- Helper function to calculate session risk score
-- ============================================
CREATE OR REPLACE FUNCTION calculate_session_risk_score(
  p_user_id UUID,
  p_session_id TEXT,
  p_ip_address TEXT,
  p_mfa_verified BOOLEAN,
  p_location TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_risk_score INTEGER := 0;
  v_recent_ip_changes INTEGER;
  v_session_count INTEGER;
  v_last_known_ip TEXT;
  v_hours_since_activity NUMERIC;
BEGIN
  -- Base risk: 0 (no risk)
  v_risk_score := 0;

  -- Factor 1: MFA not verified (+30 risk)
  IF p_mfa_verified = false OR p_mfa_verified IS NULL THEN
    v_risk_score := v_risk_score + 30;
  END IF;

  -- Factor 2: IP address changes in last 24 hours (+20 risk per change, max +40)
  SELECT COUNT(*) INTO v_recent_ip_changes
  FROM user_sessions
  WHERE user_id = p_user_id
    AND last_ip_change > NOW() - INTERVAL '24 hours'
    AND session_id != p_session_id;

  v_risk_score := v_risk_score + LEAST(v_recent_ip_changes * 20, 40);

  -- Factor 3: New IP address not seen before (+15 risk)
  SELECT ip_address INTO v_last_known_ip
  FROM user_sessions
  WHERE user_id = p_user_id
    AND session_id != p_session_id
    AND ip_address IS NOT NULL
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_last_known_ip IS NOT NULL AND v_last_known_ip != p_ip_address THEN
    v_risk_score := v_risk_score + 15;
  END IF;

  -- Factor 4: Too many concurrent sessions (+10 risk if > 3 sessions)
  SELECT COUNT(*) INTO v_session_count
  FROM user_sessions us
  LEFT JOIN session_activity sa ON sa.session_id = us.session_id
  WHERE us.user_id = p_user_id
    AND us.revoked_at IS NULL
    AND (sa.status = 'active' OR sa.last_activity > NOW() - INTERVAL '10 minutes');

  IF v_session_count > 3 THEN
    v_risk_score := v_risk_score + 10;
  END IF;

  -- Factor 5: Development/Local environment location (low risk, -5)
  IF p_location ILIKE '%local%' OR p_location ILIKE '%development%' THEN
    v_risk_score := GREATEST(v_risk_score - 5, 0);
  END IF;

  -- Ensure risk score is between 0 and 100
  v_risk_score := GREATEST(LEAST(v_risk_score, 100), 0);

  RETURN v_risk_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Helper function to check session limits based on license type
-- ============================================
CREATE OR REPLACE FUNCTION check_session_limit(
  p_user_id UUID,
  p_license_type TEXT
)
RETURNS TABLE (
  within_limit BOOLEAN,
  current_count INTEGER,
  max_allowed INTEGER,
  message TEXT
) AS $$
DECLARE
  v_current_count INTEGER;
  v_max_allowed INTEGER;
  v_within_limit BOOLEAN;
  v_message TEXT;
BEGIN
  -- Determine max allowed sessions based on license type
  CASE p_license_type
    WHEN 'trial', 'basic' THEN
      v_max_allowed := 1;
    WHEN 'pro' THEN
      v_max_allowed := 5;
    WHEN 'enterprise' THEN
      v_max_allowed := 999999; -- Effectively unlimited
    ELSE
      v_max_allowed := 1; -- Default to most restrictive
  END CASE;

  -- Count current active sessions (not revoked, active within last 10 minutes)
  SELECT COUNT(*) INTO v_current_count
  FROM user_sessions us
  LEFT JOIN session_activity sa ON sa.session_id = us.session_id
  WHERE us.user_id = p_user_id
    AND us.revoked_at IS NULL
    AND (sa.status = 'active' OR sa.last_activity > NOW() - INTERVAL '10 minutes');

  -- Check if within limit
  v_within_limit := v_current_count < v_max_allowed;

  -- Create message
  IF v_within_limit THEN
    v_message := format('Session allowed. %s of %s sessions used.', v_current_count, v_max_allowed);
  ELSE
    v_message := format('Session limit reached. %s of %s sessions already active.', v_current_count, v_max_allowed);
  END IF;

  -- Return result
  RETURN QUERY SELECT v_within_limit, v_current_count, v_max_allowed, v_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function to auto-revoke oldest session when limit exceeded
-- ============================================
CREATE OR REPLACE FUNCTION auto_revoke_oldest_session(
  p_user_id UUID,
  p_license_type TEXT
)
RETURNS TABLE (
  revoked_session_id TEXT,
  message TEXT
) AS $$
DECLARE
  v_oldest_session_id TEXT;
  v_limit_check RECORD;
BEGIN
  -- Check if over limit
  SELECT * INTO v_limit_check
  FROM check_session_limit(p_user_id, p_license_type)
  LIMIT 1;

  IF NOT v_limit_check.within_limit THEN
    -- Find oldest active session
    SELECT us.session_id INTO v_oldest_session_id
    FROM user_sessions us
    LEFT JOIN session_activity sa ON sa.session_id = us.session_id
    WHERE us.user_id = p_user_id
      AND us.revoked_at IS NULL
      AND (sa.status = 'active' OR sa.last_activity > NOW() - INTERVAL '10 minutes')
    ORDER BY us.created_at ASC
    LIMIT 1;

    -- Revoke the oldest session
    IF v_oldest_session_id IS NOT NULL THEN
      UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE session_id = v_oldest_session_id;

      RETURN QUERY SELECT
        v_oldest_session_id,
        format('Auto-revoked oldest session %s due to license limit',
               substring(v_oldest_session_id, 1, 20));
    END IF;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Update cleanup function to include revoked sessions
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
  -- Delete revoked sessions older than 30 days
  DELETE FROM session_activity
  WHERE session_id IN (
    SELECT session_id FROM user_sessions
    WHERE revoked_at < NOW() - INTERVAL '30 days'
  );

  DELETE FROM user_sessions
  WHERE revoked_at < NOW() - INTERVAL '30 days';

  -- Delete inactive sessions older than 30 days
  DELETE FROM session_activity WHERE last_activity < NOW() - INTERVAL '30 days';
  DELETE FROM user_sessions WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Create view for easy session querying
-- ============================================
CREATE OR REPLACE VIEW v_active_sessions AS
SELECT
  us.id,
  us.session_id,
  us.user_id,
  us.session_type,
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
  EXTRACT(EPOCH FROM (COALESCE(us.revoked_at, NOW()) - us.created_at)) as duration_seconds
FROM user_sessions us
LEFT JOIN session_activity sa ON sa.session_id = us.session_id;

-- ============================================
-- Grant permissions
-- ============================================
GRANT SELECT ON v_active_sessions TO authenticated;

-- ============================================
-- Verification
-- ============================================
SELECT 'Migration completed successfully!' as status;
SELECT 'New columns added to user_sessions table' as info;
SELECT 'Helper functions created:' as info;
SELECT '  - calculate_session_risk_score()' as function_name;
SELECT '  - check_session_limit()' as function_name;
SELECT '  - auto_revoke_oldest_session()' as function_name;
SELECT 'View created: v_active_sessions' as view_info;
