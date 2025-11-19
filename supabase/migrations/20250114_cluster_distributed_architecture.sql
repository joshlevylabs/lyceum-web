-- Migration: Distributed Cluster Architecture
-- Date: January 14, 2025
-- Purpose: Enable real-time data access from local clusters via WebSocket
-- Related: DISTRIBUTED_CLUSTER_ARCHITECTURE.md

-- =====================================================
-- EXTENSIONS
-- =====================================================

-- Enable pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- ADD MISSING COLUMNS TO UNIFIED_CLUSTERS TABLE
-- =====================================================

-- Add cluster_key column if it doesn't exist
ALTER TABLE unified_clusters
ADD COLUMN IF NOT EXISTS cluster_key VARCHAR(50) UNIQUE;

-- Backfill cluster_key for existing clusters
UPDATE unified_clusters
SET cluster_key = 'CLUSTER-' || LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::TEXT, 4, '0')
WHERE cluster_key IS NULL;

-- =====================================================
-- TABLE: cluster_projects_metadata
-- Purpose: Store lightweight project metadata from all clusters
-- Size: ~2 KB per project (metadata only, NO full measurement data)
-- =====================================================

CREATE TABLE IF NOT EXISTS cluster_projects_metadata (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES unified_clusters(id) ON DELETE CASCADE,
  project_id UUID NOT NULL, -- UUID from Centcom
  project_key VARCHAR(50) NOT NULL, -- CC-123, CC-456, etc.

  -- Basic Information
  project_name VARCHAR(255) NOT NULL,
  source_type VARCHAR(50), -- APx500, Klippel QC, Manual, Import, Report

  -- Classification
  groups TEXT[] DEFAULT '{}', -- ["Production", "QA", "R&D"]
  tags TEXT[] DEFAULT '{}', -- ["validated", "passed", "q1-2025"]

  -- Metrics (aggregated from measurements)
  measurement_count INTEGER DEFAULT 0,
  data_points_count BIGINT DEFAULT 0,
  quality_score_avg FLOAT CHECK (quality_score_avg >= 0 AND quality_score_avg <= 100),
  storage_bytes BIGINT DEFAULT 0,

  -- Summary Data (lightweight JSONB, NOT full data)
  summary JSONB DEFAULT '{}'::jsonb,
  -- Example: {
  --   "overall_result": "PASS",
  --   "measurements_passed": 22,
  --   "measurements_failed": 2,
  --   "top_measurements": [...]
  -- }

  test_configurations JSONB DEFAULT '{}'::jsonb,
  -- Example: {
  --   "Equipment": "Audio Precision APx555",
  --   "Serial Number": "SPK-001-2025",
  --   "Test Operator": "John Doe"
  -- }

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_cluster_project UNIQUE(cluster_id, project_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cluster_projects_metadata_cluster_id
  ON cluster_projects_metadata(cluster_id);

CREATE INDEX IF NOT EXISTS idx_cluster_projects_metadata_project_key
  ON cluster_projects_metadata(project_key);

CREATE INDEX IF NOT EXISTS idx_cluster_projects_metadata_updated_at
  ON cluster_projects_metadata(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_cluster_projects_metadata_last_synced
  ON cluster_projects_metadata(last_synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_cluster_projects_metadata_tags
  ON cluster_projects_metadata USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_cluster_projects_metadata_groups
  ON cluster_projects_metadata USING GIN(groups);

CREATE INDEX IF NOT EXISTS idx_cluster_projects_metadata_source_type
  ON cluster_projects_metadata(source_type);

-- Full-text search support
CREATE INDEX IF NOT EXISTS idx_cluster_projects_metadata_name_trgm
  ON cluster_projects_metadata USING gin(project_name gin_trgm_ops);

-- =====================================================
-- TABLE: cluster_connections
-- Purpose: Track WebSocket connection state per cluster
-- =====================================================

CREATE TABLE IF NOT EXISTS cluster_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES unified_clusters(id) ON DELETE CASCADE,

  -- Connection State
  is_connected BOOLEAN DEFAULT false,
  websocket_session_id VARCHAR(255),

  -- Timing
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  last_ping_at TIMESTAMPTZ,
  last_metadata_sync_at TIMESTAMPTZ,

  -- Metadata
  connection_metadata JSONB DEFAULT '{}'::jsonb,
  -- Example: {
  --   "ip_address": "192.168.1.100",
  --   "centcom_version": "1.1.0",
  --   "reconnect_count": 3
  -- }

  -- Constraints
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_cluster_ws_session UNIQUE(cluster_id, websocket_session_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cluster_connections_cluster_id
  ON cluster_connections(cluster_id);

CREATE INDEX IF NOT EXISTS idx_cluster_connections_is_connected
  ON cluster_connections(is_connected);

CREATE INDEX IF NOT EXISTS idx_cluster_connections_last_ping
  ON cluster_connections(last_ping_at DESC);

-- =====================================================
-- TABLE: data_requests
-- Purpose: Track data requests from Lyceum to clusters
-- Useful for: Debugging, analytics, timeout handling
-- =====================================================

CREATE TABLE IF NOT EXISTS data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(255) UNIQUE NOT NULL, -- req-a1b2c3d4-e5f6-4789

  -- Request Details
  cluster_id UUID NOT NULL REFERENCES unified_clusters(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL, -- get_project_full, get_project_overview, get_measurement_data
  params JSONB NOT NULL, -- { project_key: "CC-123", include_xy_data: true }

  -- Status Tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, queued, in_progress, completed, failed, timeout

  -- Timing
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  sent_to_cluster_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  duration_ms INTEGER,
  timeout_ms INTEGER DEFAULT 30000,

  -- User Context
  requested_by UUID REFERENCES auth.users(id),

  -- Response
  response_data JSONB, -- Cached response (for analytics, not primary storage)
  error_code VARCHAR(50),
  error_message TEXT,

  -- Metadata
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_status CHECK (status IN ('pending', 'queued', 'in_progress', 'completed', 'failed', 'timeout', 'cancelled'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_data_requests_cluster_id
  ON data_requests(cluster_id);

CREATE INDEX IF NOT EXISTS idx_data_requests_request_id
  ON data_requests(request_id);

CREATE INDEX IF NOT EXISTS idx_data_requests_status
  ON data_requests(status);

CREATE INDEX IF NOT EXISTS idx_data_requests_requested_at
  ON data_requests(requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_requests_requested_by
  ON data_requests(requested_by);

-- =====================================================
-- VIEWS
-- =====================================================

-- View: Online clusters with project counts
CREATE OR REPLACE VIEW clusters_online_status AS
SELECT
  uc.id AS cluster_id,
  uc.cluster_key,
  uc.name AS cluster_name,
  uc.cluster_type,
  uc.owner_user_id,
  cc.is_connected,
  cc.last_ping_at,
  cc.last_metadata_sync_at,
  COALESCE(cpm.project_count, 0) AS project_count,
  COALESCE(cpm.total_storage_bytes, 0) AS total_storage_bytes
FROM unified_clusters uc
LEFT JOIN cluster_connections cc ON cc.cluster_id = uc.id
  AND cc.is_connected = true
LEFT JOIN (
  SELECT
    cluster_id,
    COUNT(*) AS project_count,
    SUM(storage_bytes) AS total_storage_bytes
  FROM cluster_projects_metadata
  GROUP BY cluster_id
) cpm ON cpm.cluster_id = uc.id
WHERE uc.cluster_type = 'local'; -- Only local clusters use WebSocket

-- View: Projects with cluster info
CREATE OR REPLACE VIEW test_data_projects_with_cluster AS
SELECT
  cpm.*,
  uc.cluster_key,
  uc.name AS cluster_name,
  uc.cluster_type,
  uc.owner_user_id,
  cc.is_connected AS cluster_online,
  cc.last_ping_at AS cluster_last_seen
FROM cluster_projects_metadata cpm
INNER JOIN unified_clusters uc ON uc.id = cpm.cluster_id
LEFT JOIN cluster_connections cc ON cc.cluster_id = cpm.cluster_id
  AND cc.is_connected = true;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Update cluster connection status
CREATE OR REPLACE FUNCTION update_cluster_connection_status(
  p_cluster_id UUID,
  p_websocket_session_id VARCHAR(255),
  p_is_connected BOOLEAN
) RETURNS VOID AS $$
BEGIN
  IF p_is_connected THEN
    -- Mark as connected
    INSERT INTO cluster_connections (
      cluster_id,
      websocket_session_id,
      is_connected,
      connected_at,
      last_ping_at
    ) VALUES (
      p_cluster_id,
      p_websocket_session_id,
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (cluster_id, websocket_session_id)
    DO UPDATE SET
      is_connected = true,
      connected_at = NOW(),
      last_ping_at = NOW(),
      updated_at = NOW();
  ELSE
    -- Mark as disconnected
    UPDATE cluster_connections
    SET
      is_connected = false,
      disconnected_at = NOW(),
      updated_at = NOW()
    WHERE cluster_id = p_cluster_id
      AND websocket_session_id = p_websocket_session_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Update last ping timestamp
CREATE OR REPLACE FUNCTION update_cluster_last_ping(
  p_cluster_id UUID,
  p_websocket_session_id VARCHAR(255)
) RETURNS VOID AS $$
BEGIN
  UPDATE cluster_connections
  SET
    last_ping_at = NOW(),
    updated_at = NOW()
  WHERE cluster_id = p_cluster_id
    AND websocket_session_id = p_websocket_session_id
    AND is_connected = true;
END;
$$ LANGUAGE plpgsql;

-- Function: Bulk upsert project metadata (called during metadata sync)
CREATE OR REPLACE FUNCTION upsert_project_metadata(
  p_cluster_id UUID,
  p_projects JSONB
) RETURNS INTEGER AS $$
DECLARE
  v_project JSONB;
  v_count INTEGER := 0;
BEGIN
  -- Loop through projects array
  FOR v_project IN SELECT * FROM jsonb_array_elements(p_projects)
  LOOP
    INSERT INTO cluster_projects_metadata (
      cluster_id,
      project_id,
      project_key,
      project_name,
      source_type,
      groups,
      tags,
      measurement_count,
      data_points_count,
      quality_score_avg,
      storage_bytes,
      summary,
      test_configurations,
      created_at,
      updated_at,
      last_synced_at
    ) VALUES (
      p_cluster_id,
      (v_project->>'project_id')::UUID,
      v_project->>'project_key',
      v_project->>'project_name',
      v_project->>'source_type',
      COALESCE((v_project->'groups')::TEXT[]::TEXT[], '{}'),
      COALESCE((v_project->'tags')::TEXT[]::TEXT[], '{}'),
      COALESCE((v_project->>'measurement_count')::INTEGER, 0),
      COALESCE((v_project->>'data_points_count')::BIGINT, 0),
      COALESCE((v_project->>'quality_score_avg')::FLOAT, NULL),
      COALESCE((v_project->>'storage_bytes')::BIGINT, 0),
      COALESCE(v_project->'summary', '{}'::jsonb),
      COALESCE(v_project->'test_configurations', '{}'::jsonb),
      COALESCE((v_project->>'created_at')::TIMESTAMPTZ, NOW()),
      COALESCE((v_project->>'updated_at')::TIMESTAMPTZ, NOW()),
      NOW()
    )
    ON CONFLICT (cluster_id, project_key)
    DO UPDATE SET
      project_name = EXCLUDED.project_name,
      source_type = EXCLUDED.source_type,
      groups = EXCLUDED.groups,
      tags = EXCLUDED.tags,
      measurement_count = EXCLUDED.measurement_count,
      data_points_count = EXCLUDED.data_points_count,
      quality_score_avg = EXCLUDED.quality_score_avg,
      storage_bytes = EXCLUDED.storage_bytes,
      summary = EXCLUDED.summary,
      test_configurations = EXCLUDED.test_configurations,
      updated_at = EXCLUDED.updated_at,
      last_synced_at = NOW();

    v_count := v_count + 1;
  END LOOP;

  -- Update last metadata sync time
  UPDATE cluster_connections
  SET last_metadata_sync_at = NOW()
  WHERE cluster_id = p_cluster_id
    AND is_connected = true;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get user's accessible projects with search/filter
CREATE OR REPLACE FUNCTION get_user_projects_metadata(
  p_user_id UUID,
  p_cluster_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_source_type VARCHAR DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  cluster_id UUID,
  cluster_key VARCHAR,
  cluster_name VARCHAR,
  cluster_online BOOLEAN,
  project_id UUID,
  project_key VARCHAR,
  project_name VARCHAR,
  source_type VARCHAR,
  groups TEXT[],
  tags TEXT[],
  measurement_count INTEGER,
  quality_score_avg FLOAT,
  storage_bytes BIGINT,
  summary JSONB,
  test_configurations JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tdp.id,
    tdp.cluster_id,
    tdp.cluster_key,
    tdp.cluster_name,
    tdp.cluster_online,
    tdp.project_id,
    tdp.project_key,
    tdp.project_name,
    tdp.source_type,
    tdp.groups,
    tdp.tags,
    tdp.measurement_count,
    tdp.quality_score_avg,
    tdp.storage_bytes,
    tdp.summary,
    tdp.test_configurations,
    tdp.created_at,
    tdp.updated_at,
    tdp.last_synced_at
  FROM test_data_projects_with_cluster tdp
  WHERE
    -- User must own the cluster
    tdp.owner_user_id = p_user_id

    -- Filter by cluster if specified
    AND (p_cluster_id IS NULL OR tdp.cluster_id = p_cluster_id)

    -- Search in project_name and project_key
    AND (
      p_search IS NULL OR
      tdp.project_name ILIKE '%' || p_search || '%' OR
      tdp.project_key ILIKE '%' || p_search || '%'
    )

    -- Filter by tags (any match)
    AND (
      p_tags IS NULL OR
      tdp.tags && p_tags
    )

    -- Filter by source_type
    AND (p_source_type IS NULL OR tdp.source_type = p_source_type)

  ORDER BY tdp.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE cluster_projects_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own cluster metadata
CREATE POLICY cluster_projects_metadata_user_access ON cluster_projects_metadata
  FOR ALL
  USING (
    cluster_id IN (
      SELECT id FROM unified_clusters
      WHERE owner_user_id = auth.uid()
    )
  );

-- Policy: Users can only see their own cluster connections
CREATE POLICY cluster_connections_user_access ON cluster_connections
  FOR ALL
  USING (
    cluster_id IN (
      SELECT id FROM unified_clusters
      WHERE owner_user_id = auth.uid()
    )
  );

-- Policy: Users can only see their own data requests
CREATE POLICY data_requests_user_access ON data_requests
  FOR ALL
  USING (requested_by = auth.uid());

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE cluster_projects_metadata IS 'Lightweight project metadata synced from Centcom clusters via WebSocket. Enables fast project listing without querying clusters.';
COMMENT ON TABLE cluster_connections IS 'Tracks WebSocket connection state for each cluster. Used to determine if cluster is online for real-time data fetching.';
COMMENT ON TABLE data_requests IS 'Tracks all data requests from Lyceum to clusters. Used for debugging, analytics, and timeout handling.';

COMMENT ON FUNCTION upsert_project_metadata IS 'Bulk upsert project metadata from Centcom heartbeat. Called when metadata_sync message received via WebSocket.';
COMMENT ON FUNCTION get_user_projects_metadata IS 'Get user accessible projects with search/filter. Powers the Test Data project list page.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 20250114_cluster_distributed_architecture.sql completed successfully';
  RAISE NOTICE 'Created tables: cluster_projects_metadata, cluster_connections, data_requests';
  RAISE NOTICE 'Created views: clusters_online_status, test_data_projects_with_cluster';
  RAISE NOTICE 'Created functions: update_cluster_connection_status, update_cluster_last_ping, upsert_project_metadata, get_user_projects_metadata';
  RAISE NOTICE 'Enabled RLS on all tables';
END $$;
