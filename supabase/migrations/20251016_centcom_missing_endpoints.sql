-- Migration: Add missing tables for Centcom endpoints
-- Date: 2025-10-16
-- Description: Creates tables for session tracking, dashboard stats, and session activity

-- =============================================================================
-- 1. USER_SESSIONS TABLE (for /api/centcom/auth/session-update)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version TEXT,
  instance_id TEXT,
  user_agent TEXT,
  platform TEXT,
  build TEXT,
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_updated_at ON user_sessions(updated_at);

-- RLS Policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_sessions.user_id);

DROP POLICY IF EXISTS "Service role can insert sessions" ON user_sessions;
CREATE POLICY "Service role can insert sessions"
  ON user_sessions FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update sessions" ON user_sessions;
CREATE POLICY "Service role can update sessions"
  ON user_sessions FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete sessions" ON user_sessions;
CREATE POLICY "Service role can delete sessions"
  ON user_sessions FOR DELETE
  TO service_role
  USING (true);

-- =============================================================================
-- 2. SESSION_ACTIVITY TABLE (for /api/centcom/sessions/sync)
-- =============================================================================

CREATE TABLE IF NOT EXISTS session_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'idle')),
  last_activity TIMESTAMPTZ NOT NULL,
  platform TEXT,
  version TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_activity_user_id ON session_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_session_activity_session_id ON session_activity(session_id);
CREATE INDEX IF NOT EXISTS idx_session_activity_status ON session_activity(status);
CREATE INDEX IF NOT EXISTS idx_session_activity_last_activity ON session_activity(last_activity);

-- RLS Policies
ALTER TABLE session_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own activity" ON session_activity;
CREATE POLICY "Users can view their own activity"
  ON session_activity FOR SELECT
  USING (auth.uid() = session_activity.user_id);

DROP POLICY IF EXISTS "Service role can insert activity" ON session_activity;
CREATE POLICY "Service role can insert activity"
  ON session_activity FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update activity" ON session_activity;
CREATE POLICY "Service role can update activity"
  ON session_activity FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete activity" ON session_activity;
CREATE POLICY "Service role can delete activity"
  ON session_activity FOR DELETE
  TO service_role
  USING (true);

-- =============================================================================
-- 3. DATA_CLUSTERS TABLE (for dashboard stats if not exists)
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cluster_type TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_clusters_user_id ON data_clusters(user_id);

ALTER TABLE data_clusters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own clusters" ON data_clusters;
CREATE POLICY "Users can view their own clusters"
  ON data_clusters FOR SELECT
  USING (auth.uid() = data_clusters.user_id);

DROP POLICY IF EXISTS "Service role can manage clusters" ON data_clusters;
CREATE POLICY "Service role can manage clusters"
  ON data_clusters FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 4. PROJECTS TABLE (for dashboard stats if not exists)
-- =============================================================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = projects.user_id);

DROP POLICY IF EXISTS "Service role can manage projects" ON projects;
CREATE POLICY "Service role can manage projects"
  ON projects FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 5. MEASUREMENTS TABLE (for dashboard stats if not exists)
-- =============================================================================

CREATE TABLE IF NOT EXISTS measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  measurement_type TEXT,
  value NUMERIC,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_measurements_user_id ON measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_measurements_project_id ON measurements(project_id);
CREATE INDEX IF NOT EXISTS idx_measurements_created_at ON measurements(created_at);

ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own measurements" ON measurements;
CREATE POLICY "Users can view their own measurements"
  ON measurements FOR SELECT
  USING (auth.uid() = measurements.user_id);

DROP POLICY IF EXISTS "Service role can manage measurements" ON measurements;
CREATE POLICY "Service role can manage measurements"
  ON measurements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 6. USER_STORAGE TABLE (for dashboard storage stats if not exists)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_bytes BIGINT DEFAULT 0,
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_storage_user_id ON user_storage(user_id);

ALTER TABLE user_storage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own storage" ON user_storage;
CREATE POLICY "Users can view their own storage"
  ON user_storage FOR SELECT
  USING (auth.uid() = user_storage.user_id);

DROP POLICY IF EXISTS "Service role can manage storage" ON user_storage;
CREATE POLICY "Service role can manage storage"
  ON user_storage FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 7. CLEANUP FUNCTION FOR OLD SESSIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
  -- Delete session activity older than 7 days
  DELETE FROM session_activity
  WHERE last_activity < NOW() - INTERVAL '7 days';

  -- Delete user sessions not updated in 30 days
  DELETE FROM user_sessions
  WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 8. TRIGGER TO UPDATE UPDATED_AT COLUMNS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_activity_updated_at
  BEFORE UPDATE ON session_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Run this to manually clean up old sessions:
-- SELECT cleanup_old_sessions();
