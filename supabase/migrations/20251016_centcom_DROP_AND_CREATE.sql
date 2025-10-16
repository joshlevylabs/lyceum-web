-- Migration: Drop and recreate Centcom tables
-- Date: 2025-10-16
-- WARNING: This will DELETE existing data in these tables!
-- Only run this if you're okay with losing data in:
-- user_sessions, session_activity, data_clusters, projects, measurements, user_storage

-- =============================================================================
-- STEP 1: DROP EXISTING TABLES (if they exist)
-- =============================================================================

-- Drop in reverse order due to foreign key constraints
DROP TABLE IF EXISTS measurements CASCADE;
DROP TABLE IF EXISTS user_storage CASCADE;
DROP TABLE IF EXISTS session_activity CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS data_clusters CASCADE;

-- =============================================================================
-- STEP 2: CREATE FRESH TABLES
-- =============================================================================

-- 1. USER_SESSIONS
CREATE TABLE user_sessions (
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

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_updated_at ON user_sessions(updated_at);

-- 2. SESSION_ACTIVITY
CREATE TABLE session_activity (
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

CREATE INDEX idx_session_activity_user_id ON session_activity(user_id);
CREATE INDEX idx_session_activity_session_id ON session_activity(session_id);
CREATE INDEX idx_session_activity_status ON session_activity(status);
CREATE INDEX idx_session_activity_last_activity ON session_activity(last_activity);

-- 3. DATA_CLUSTERS
CREATE TABLE data_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cluster_type TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_data_clusters_user_id ON data_clusters(user_id);

-- 4. PROJECTS
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);

-- 5. MEASUREMENTS
CREATE TABLE measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  measurement_type TEXT,
  value NUMERIC,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_measurements_user_id ON measurements(user_id);
CREATE INDEX idx_measurements_project_id ON measurements(project_id);
CREATE INDEX idx_measurements_created_at ON measurements(created_at);

-- 6. USER_STORAGE
CREATE TABLE user_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_bytes BIGINT DEFAULT 0,
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_storage_user_id ON user_storage(user_id);

-- =============================================================================
-- STEP 3: CREATE HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM session_activity WHERE last_activity < NOW() - INTERVAL '7 days';
  DELETE FROM user_sessions WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 4: CREATE TRIGGERS
-- =============================================================================

CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_activity_updated_at
  BEFORE UPDATE ON session_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_clusters_updated_at
  BEFORE UPDATE ON data_clusters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_storage_updated_at
  BEFORE UPDATE ON user_storage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as columns
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

-- =============================================================================
-- COMPLETE
-- =============================================================================
