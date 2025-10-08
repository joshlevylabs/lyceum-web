-- ================================================================
-- CENTCOM LOCAL CLUSTER SCHEMA
-- ================================================================
-- This migration adds support for local cluster management and 
-- Centcom cluster discovery integration
-- ================================================================

-- 1. Add local cluster support to license_keys table
ALTER TABLE license_keys 
ADD COLUMN IF NOT EXISTS allows_local_cluster BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS local_cluster_limits JSONB DEFAULT '{
  "max_storage_gb": 10,
  "max_monthly_queries": 100000,
  "max_users": 1,
  "lifecycle_tiers_enabled": false,
  "offline_grace_days": 7
}'::jsonb;

-- 2. Update existing license types with local cluster capabilities
UPDATE license_keys 
SET 
  allows_local_cluster = TRUE,
  local_cluster_limits = CASE license_type
    WHEN 'basic' THEN '{
      "max_storage_gb": 10,
      "max_monthly_queries": 100000,
      "max_users": 1,
      "lifecycle_tiers_enabled": false,
      "offline_grace_days": 7
    }'::jsonb
    WHEN 'professional' THEN '{
      "max_storage_gb": 50,
      "max_monthly_queries": 1000000,
      "max_users": 5,
      "lifecycle_tiers_enabled": true,
      "offline_grace_days": 14
    }'::jsonb
    WHEN 'enterprise' THEN '{
      "max_storage_gb": 500,
      "max_monthly_queries": 10000000,
      "max_users": -1,
      "lifecycle_tiers_enabled": true,
      "offline_grace_days": 30
    }'::jsonb
    WHEN 'trial' THEN '{
      "max_storage_gb": 5,
      "max_monthly_queries": 50000,
      "max_users": 1,
      "lifecycle_tiers_enabled": false,
      "offline_grace_days": 3
    }'::jsonb
    WHEN 'gratis' THEN '{
      "max_storage_gb": 2,
      "max_monthly_queries": 10000,
      "max_users": 1,
      "lifecycle_tiers_enabled": false,
      "offline_grace_days": 1
    }'::jsonb
    WHEN 'standard' THEN '{
      "max_storage_gb": 10,
      "max_monthly_queries": 100000,
      "max_users": 1,
      "lifecycle_tiers_enabled": false,
      "offline_grace_days": 7
    }'::jsonb
  END
WHERE license_type IN ('basic', 'professional', 'enterprise', 'trial', 'gratis', 'standard');

-- 3. Create table to track local cluster usage
CREATE TABLE IF NOT EXISTS local_cluster_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES license_keys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Usage metrics
  storage_used_gb DECIMAL(10,2) DEFAULT 0,
  queries_this_month INTEGER DEFAULT 0,
  queries_last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Machine info
  machine_fingerprint VARCHAR(255) UNIQUE,
  machine_os VARCHAR(50),
  machine_memory_gb INTEGER,
  machine_cpu_cores INTEGER,
  
  -- Cluster info
  clickhouse_version VARCHAR(50),
  cluster_status VARCHAR(20) DEFAULT 'active',
  last_heartbeat_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_user_machine UNIQUE (user_id, machine_fingerprint)
);

-- 4. Create table for Centcom cluster connections
CREATE TABLE IF NOT EXISTS centcom_cluster_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cluster_id UUID REFERENCES unified_clusters(id) ON DELETE CASCADE,
  
  -- Connection info
  connection_type VARCHAR(20) CHECK (connection_type IN ('local', 'cloud')),
  connection_name VARCHAR(255),
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Auto-discovery metadata
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_connected_at TIMESTAMP WITH TIME ZONE,
  connection_count INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT unique_user_cluster UNIQUE (user_id, cluster_id)
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_local_cluster_usage_user ON local_cluster_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_local_cluster_usage_license ON local_cluster_usage(license_id);
CREATE INDEX IF NOT EXISTS idx_local_cluster_usage_heartbeat ON local_cluster_usage(last_heartbeat_at);
CREATE INDEX IF NOT EXISTS idx_centcom_connections_user ON centcom_cluster_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_centcom_connections_active ON centcom_cluster_connections(user_id, is_active);

-- 6. Create function to check if local cluster is allowed
CREATE OR REPLACE FUNCTION check_local_cluster_allowed(p_user_id UUID)
RETURNS TABLE (
  allowed BOOLEAN,
  license_type VARCHAR,
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

-- 7. Create function to get user's available clusters
CREATE OR REPLACE FUNCTION get_user_clusters(p_user_id UUID)
RETURNS TABLE (
  cluster_id UUID,
  cluster_key VARCHAR,
  cluster_name VARCHAR,
  cluster_type VARCHAR,
  architecture VARCHAR,
  classification VARCHAR,
  region VARCHAR,
  connection_type VARCHAR,
  connection_string TEXT,
  processing_endpoint TEXT,
  customer_id VARCHAR,
  is_default BOOLEAN,
  access_level VARCHAR,
  last_connected_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uc.id AS cluster_id,
    uc.cluster_key,
    uc.name AS cluster_name,
    uc.cluster_type,
    uc.architecture,
    uc.classification,
    uc.region,
    'cloud'::VARCHAR AS connection_type,
    uc.connection_string,
    uc.processing_endpoint,
    uc.customer_id,
    COALESCE(ccc.is_default, FALSE) AS is_default,
    cua.access_level,
    ccc.last_connected_at
  FROM unified_clusters uc
  INNER JOIN cluster_user_assignments cua ON cua.cluster_id = uc.id
  LEFT JOIN centcom_cluster_connections ccc ON ccc.cluster_id = uc.id AND ccc.user_id = p_user_id
  WHERE cua.user_id = p_user_id
    AND cua.is_active = TRUE
    AND uc.status IN ('active', 'creating')
  ORDER BY ccc.is_default DESC NULLS LAST, uc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create RLS policies
ALTER TABLE local_cluster_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE centcom_cluster_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own local cluster usage"
  ON local_cluster_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own local cluster usage"
  ON local_cluster_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own local cluster usage"
  ON local_cluster_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own cluster connections"
  ON centcom_cluster_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own cluster connections"
  ON centcom_cluster_connections FOR ALL
  USING (auth.uid() = user_id);

-- 9. Completion message
DO $$
BEGIN
  RAISE NOTICE '✅ Centcom local cluster schema installed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Implement API endpoints at /api/centcom/*';
  RAISE NOTICE '2. Test cluster discovery integration';
  RAISE NOTICE '3. Implement Centcom UI components';
END $$;

