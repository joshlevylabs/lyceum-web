-- Migration: Add missing tables for Centcom endpoints
-- Date: 2025-10-16
-- Description: Creates tables WITHOUT RLS first, then adds RLS in a separate step

-- =============================================================================
-- STEP 1: CREATE ALL TABLES WITHOUT RLS
-- =============================================================================

-- 1. USER_SESSIONS TABLE
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

-- 2. SESSION_ACTIVITY TABLE
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

-- 3. DATA_CLUSTERS TABLE
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

-- 4. PROJECTS TABLE
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

-- 5. MEASUREMENTS TABLE
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

-- 6. USER_STORAGE TABLE
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
-- STEP 2: CREATE FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM session_activity WHERE last_activity < NOW() - INTERVAL '7 days';
  DELETE FROM user_sessions WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
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
-- STEP 3: ENABLE RLS (Tables are open to service_role by default)
-- =============================================================================

-- Note: By enabling RLS without policies, tables become accessible only via service_role
-- This is actually what we want since our API uses the service_role key

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_storage ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 4: ADD PERMISSIVE POLICIES FOR SERVICE ROLE
-- =============================================================================

-- These policies allow the service_role (used by our API) to access everything
-- Regular authenticated users cannot access these tables directly

-- user_sessions policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role full access" ON user_sessions;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Service role full access"
  ON user_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- session_activity policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role full access" ON session_activity;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Service role full access"
  ON session_activity
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- data_clusters policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role full access" ON data_clusters;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Service role full access"
  ON data_clusters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- projects policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role full access" ON projects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Service role full access"
  ON projects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- measurements policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role full access" ON measurements;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Service role full access"
  ON measurements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- user_storage policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role full access" ON user_storage;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Service role full access"
  ON user_storage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify tables were created
SELECT
  t.table_name,
  COUNT(c.column_name) as column_count,
  CASE
    WHEN rls.relrowsecurity THEN 'Enabled'
    ELSE 'Disabled'
  END as rls_status
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND c.table_schema = 'public'
LEFT JOIN pg_class rls ON rls.relname = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'user_sessions',
    'session_activity',
    'data_clusters',
    'projects',
    'measurements',
    'user_storage'
  )
GROUP BY t.table_name, rls.relrowsecurity
ORDER BY t.table_name;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- All tables created with RLS enabled
-- Service role has full access
-- Regular users have no direct access (must go through API)
