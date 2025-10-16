-- Migration: Add missing tables for Centcom endpoints (FINAL VERSION)
-- Date: 2025-10-16
-- Description: Creates NEW tables with different names to avoid conflicts
-- NOTE: We discovered 'projects' table already exists with different structure
--       So we'll create tables with unique names for Centcom endpoints

-- =============================================================================
-- CREATE NEW TABLES (with unique names to avoid conflicts)
-- =============================================================================

-- 1. USER_SESSIONS (for /api/centcom/auth/session-update)
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

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_updated_at ON user_sessions(updated_at);

-- 2. SESSION_ACTIVITY (for /api/centcom/sessions/sync)
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

CREATE INDEX IF NOT EXISTS idx_session_activity_user_id ON session_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_session_activity_session_id ON session_activity(session_id);
CREATE INDEX IF NOT EXISTS idx_session_activity_status ON session_activity(status);
CREATE INDEX IF NOT EXISTS idx_session_activity_last_activity ON session_activity(last_activity);

-- 3. DATA_CLUSTERS (for dashboard stats - NEW TABLE)
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

-- 4. SKIP 'projects' table - it already exists with different structure!
-- The dashboard stats endpoint will use the existing 'projects' table
-- It queries by created_by which maps to user_id

-- 5. CENTCOM_MEASUREMENTS (renamed to avoid potential conflicts)
CREATE TABLE IF NOT EXISTS centcom_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  measurement_type TEXT,
  value NUMERIC,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_centcom_measurements_user_id ON centcom_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_centcom_measurements_project_id ON centcom_measurements(project_id);
CREATE INDEX IF NOT EXISTS idx_centcom_measurements_created_at ON centcom_measurements(created_at);

-- 6. USER_STORAGE (for dashboard storage stats)
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
-- CREATE HELPER FUNCTIONS
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
-- CREATE TRIGGERS
-- =============================================================================

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

DROP TRIGGER IF EXISTS update_data_clusters_updated_at ON data_clusters;
CREATE TRIGGER update_data_clusters_updated_at
  BEFORE UPDATE ON data_clusters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_storage_updated_at ON user_storage;
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
    'centcom_measurements',
    'user_storage'
  )
ORDER BY table_name;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Tables created:
-- ✅ user_sessions - for session metadata tracking
-- ✅ session_activity - for session heartbeats
-- ✅ data_clusters - for dashboard stats
-- ✅ centcom_measurements - for measurements (renamed to avoid conflicts)
-- ✅ user_storage - for storage tracking
--
-- Note: 'projects' table already exists and will be used as-is
--       The dashboard endpoint will query it using created_by field
