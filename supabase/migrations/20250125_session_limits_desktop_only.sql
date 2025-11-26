-- ============================================
-- Update Session Limits to Apply Only to Desktop Sessions
-- ============================================
-- Date: 2025-01-25
-- Description: Modifies check_session_limit and auto_revoke_oldest_session
--              functions to only count and limit DESKTOP sessions.
--              Web sessions are unlimited.
-- ============================================

-- ============================================
-- Update: check_session_limit - Desktop sessions only
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

  -- Count current active DESKTOP sessions only (not web sessions)
  SELECT COUNT(*) INTO v_current_count
  FROM user_sessions us
  LEFT JOIN session_activity sa ON sa.session_id = us.session_id
  WHERE us.user_id = p_user_id
    AND us.session_type = 'desktop'  -- Only count desktop sessions
    AND us.revoked_at IS NULL
    AND (sa.status = 'active' OR sa.last_activity > NOW() - INTERVAL '10 minutes');

  -- Check if within limit
  v_within_limit := v_current_count < v_max_allowed;

  -- Create message
  IF v_within_limit THEN
    v_message := format('Desktop session allowed. %s of %s desktop sessions used.', v_current_count, v_max_allowed);
  ELSE
    v_message := format('Desktop session limit reached. %s of %s desktop sessions already active.', v_current_count, v_max_allowed);
  END IF;

  -- Return result
  RETURN QUERY SELECT v_within_limit, v_current_count, v_max_allowed, v_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Update: auto_revoke_oldest_session - Desktop sessions only
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
    -- Find oldest active DESKTOP session (not web sessions)
    SELECT us.session_id INTO v_oldest_session_id
    FROM user_sessions us
    LEFT JOIN session_activity sa ON sa.session_id = us.session_id
    WHERE us.user_id = p_user_id
      AND us.session_type = 'desktop'  -- Only revoke desktop sessions
      AND us.revoked_at IS NULL
      AND (sa.status = 'active' OR sa.last_activity > NOW() - INTERVAL '10 minutes')
    ORDER BY us.created_at ASC
    LIMIT 1;

    -- Revoke the oldest desktop session
    IF v_oldest_session_id IS NOT NULL THEN
      UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE session_id = v_oldest_session_id;

      RETURN QUERY SELECT
        v_oldest_session_id,
        format('Auto-revoked oldest desktop session %s due to license limit',
               substring(v_oldest_session_id, 1, 20));
    END IF;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Verification
-- ============================================
SELECT 'Migration completed successfully!' as status;
SELECT 'Updated check_session_limit() to count desktop sessions only' as info;
SELECT 'Updated auto_revoke_oldest_session() to revoke desktop sessions only' as info;
SELECT 'Web sessions are now unlimited' as info;
