-- Migration: Add missing tables for Centcom endpoints
-- Date: 2025-10-16
-- Description: Creates tables for session tracking, dashboard stats, and session activity
-- NOTE: This version is designed to run in Supabase SQL Editor without RLS errors

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

DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_session_activity_updated_at ON session_activity;
CREATE TRIGGER update_session_activity_updated_at
  BEFORE UPDATE ON session_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 9. ENABLE RLS AND CREATE POLICIES (Done at the end after tables exist)
-- =============================================================================

-- USER_SESSIONS RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage sessions" ON user_sessions;
CREATE POLICY "Service role can manage sessions"
  ON user_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- SESSION_ACTIVITY RLS
ALTER TABLE session_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own activity" ON session_activity;
CREATE POLICY "Users can view their own activity"
  ON session_activity FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage activity" ON session_activity;
CREATE POLICY "Service role can manage activity"
  ON session_activity FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- DATA_CLUSTERS RLS
ALTER TABLE data_clusters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own clusters" ON data_clusters;
CREATE POLICY "Users can view their own clusters"
  ON data_clusters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage clusters" ON data_clusters;
CREATE POLICY "Service role can manage clusters"
  ON data_clusters FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- PROJECTS RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage projects" ON projects;
CREATE POLICY "Service role can manage projects"
  ON projects FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- MEASUREMENTS RLS
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own measurements" ON measurements;
CREATE POLICY "Users can view their own measurements"
  ON measurements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage measurements" ON measurements;
CREATE POLICY "Service role can manage measurements"
  ON measurements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- USER_STORAGE RLS
ALTER TABLE user_storage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own storage" ON user_storage;
CREATE POLICY "Users can view their own storage"
  ON user_storage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage storage" ON user_storage;
CREATE POLICY "Service role can manage storage"
  ON user_storage FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Run this to manually clean up old sessions:
-- SELECT cleanup_old_sessions();

-- Verify tables were created:
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'user_sessions',
    'session_activity',
    'data_clusters',
    'projects',
    'measurements',
    'user_storage'
  )
ORDER BY table_name;
