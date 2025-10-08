-- Database Clusters Feature Schema
-- Based on Lyceum Database Clusters Integration Guide
-- This sets up the complete schema for manufacturing-focused ClickHouse clusters

-- =============================================================================
-- 1. CLUSTER MANAGEMENT TABLES
-- =============================================================================

-- Database clusters table
CREATE TABLE database_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cluster_type VARCHAR(50) NOT NULL, -- 'production', 'development', 'analytics'
    region VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'provisioning', -- 'provisioning', 'active', 'maintenance', 'terminated'
    
    -- ClickHouse cluster configuration
    clickhouse_cluster_id VARCHAR(255) UNIQUE NOT NULL,
    connection_string TEXT NOT NULL,
    admin_username VARCHAR(255) NOT NULL,
    admin_password_hash VARCHAR(255) NOT NULL,
    readonly_username VARCHAR(255) NOT NULL,
    readonly_password_hash VARCHAR(255) NOT NULL,
    
    -- Resource configuration
    node_count INTEGER NOT NULL DEFAULT 1,
    cpu_per_node INTEGER NOT NULL DEFAULT 4,
    memory_per_node VARCHAR(20) NOT NULL DEFAULT '16GB',
    storage_per_node VARCHAR(20) NOT NULL DEFAULT '500GB',
    
    -- Lifecycle configuration
    hot_tier_size VARCHAR(20) DEFAULT '100GB',
    warm_tier_size VARCHAR(20) DEFAULT '500GB', 
    cold_tier_size VARCHAR(20) DEFAULT '2TB',
    archive_enabled BOOLEAN DEFAULT true,
    
    -- Retention policy
    hot_retention_days INTEGER DEFAULT 90,
    warm_retention_days INTEGER DEFAULT 365,
    cold_retention_days INTEGER DEFAULT 2555,
    
    -- Ownership and access
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    terminated_at TIMESTAMP WITH TIME ZONE,
    
    -- Monitoring
    last_health_check TIMESTAMP WITH TIME ZONE,
    health_status VARCHAR(20) DEFAULT 'unknown', -- 'healthy', 'warning', 'critical', 'unknown'
    
    -- Billing
    estimated_monthly_cost DECIMAL(10,2),
    actual_monthly_cost DECIMAL(10,2)
);

-- Create indexes for performance
CREATE INDEX idx_database_clusters_created_by ON database_clusters(created_by);
CREATE INDEX idx_database_clusters_status ON database_clusters(status);
CREATE INDEX idx_database_clusters_cluster_type ON database_clusters(cluster_type);
CREATE INDEX idx_database_clusters_clickhouse_id ON database_clusters(clickhouse_cluster_id);

-- Cluster team access table
CREATE TABLE cluster_team_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID REFERENCES database_clusters(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'admin', 'editor', 'analyst', 'viewer'
    permissions JSONB DEFAULT '{}',
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(cluster_id, user_id)
);

-- Create indexes for team access
CREATE INDEX idx_cluster_team_access_cluster_id ON cluster_team_access(cluster_id);
CREATE INDEX idx_cluster_team_access_user_id ON cluster_team_access(user_id);
CREATE INDEX idx_cluster_team_access_role ON cluster_team_access(role);

-- =============================================================================
-- 2. PROJECT MANAGEMENT TABLES
-- =============================================================================

-- Cluster projects table
CREATE TABLE cluster_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID REFERENCES database_clusters(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(100) NOT NULL, -- 'manufacturing_analytics', 'quality_control', 'predictive_maintenance', etc.
    
    -- Data configuration
    data_sources JSONB DEFAULT '[]',
    table_schemas JSONB DEFAULT '{}',
    
    -- Project settings
    configuration JSONB DEFAULT '{}',
    
    -- Ownership
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'archived', 'deleted'
    
    UNIQUE(cluster_id, name)
);

-- Create indexes for projects
CREATE INDEX idx_cluster_projects_cluster_id ON cluster_projects(cluster_id);
CREATE INDEX idx_cluster_projects_created_by ON cluster_projects(created_by);
CREATE INDEX idx_cluster_projects_project_type ON cluster_projects(project_type);
CREATE INDEX idx_cluster_projects_status ON cluster_projects(status);

-- Project assets table  
CREATE TABLE project_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES cluster_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100) NOT NULL, -- 'dashboard', 'chart', 'report', 'alert'
    
    -- Asset configuration
    configuration JSONB DEFAULT '{}',
    data_query TEXT,
    refresh_interval_seconds INTEGER DEFAULT 300,
    
    -- Performance settings for manufacturing
    max_curves INTEGER DEFAULT 1000,
    optimization_level VARCHAR(20) DEFAULT 'standard', -- 'fast', 'standard', 'detailed'
    
    -- Ownership
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(project_id, name)
);

-- Create indexes for assets
CREATE INDEX idx_project_assets_project_id ON project_assets(project_id);
CREATE INDEX idx_project_assets_asset_type ON project_assets(asset_type);
CREATE INDEX idx_project_assets_created_by ON project_assets(created_by);

-- =============================================================================
-- 3. USAGE TRACKING AND MONITORING
-- =============================================================================

-- Cluster usage metrics table
CREATE TABLE cluster_usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID REFERENCES database_clusters(id) ON DELETE CASCADE,
    
    -- Time period
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Usage statistics
    query_count INTEGER DEFAULT 0,
    data_ingested_gb DECIMAL(12,3) DEFAULT 0,
    data_queried_gb DECIMAL(12,3) DEFAULT 0,
    cpu_hours DECIMAL(10,2) DEFAULT 0,
    memory_gb_hours DECIMAL(12,2) DEFAULT 0,
    storage_gb_hours DECIMAL(12,2) DEFAULT 0,
    
    -- Performance metrics
    avg_query_duration_ms INTEGER DEFAULT 0,
    p95_query_duration_ms INTEGER DEFAULT 0,
    max_concurrent_queries INTEGER DEFAULT 0,
    
    -- Cost tracking
    compute_cost DECIMAL(10,4) DEFAULT 0,
    storage_cost DECIMAL(10,4) DEFAULT 0,
    network_cost DECIMAL(10,4) DEFAULT 0,
    total_cost DECIMAL(10,4) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for usage metrics
CREATE INDEX idx_cluster_usage_metrics_cluster_id ON cluster_usage_metrics(cluster_id);
CREATE INDEX idx_cluster_usage_metrics_period_start ON cluster_usage_metrics(period_start);
CREATE INDEX idx_cluster_usage_metrics_period_end ON cluster_usage_metrics(period_end);

-- =============================================================================
-- 4. AUTHENTICATION AND SECURITY
-- =============================================================================

-- Cluster access tokens for API access
CREATE TABLE cluster_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID REFERENCES database_clusters(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    token_name VARCHAR(100) NOT NULL,
    permissions JSONB DEFAULT '{}',
    
    -- Token lifecycle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    -- Token metadata
    created_by_ip VARCHAR(45),
    user_agent TEXT,
    
    UNIQUE(token_hash)
);

-- Create indexes for access tokens
CREATE INDEX idx_cluster_access_tokens_cluster_id ON cluster_access_tokens(cluster_id);
CREATE INDEX idx_cluster_access_tokens_user_id ON cluster_access_tokens(user_id);
CREATE INDEX idx_cluster_access_tokens_token_hash ON cluster_access_tokens(token_hash);
CREATE INDEX idx_cluster_access_tokens_expires_at ON cluster_access_tokens(expires_at);

-- =============================================================================
-- 5. AUDIT LOGGING
-- =============================================================================

-- Cluster audit log
CREATE TABLE cluster_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID REFERENCES database_clusters(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    
    -- Action details
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'query', 'access_granted', etc.
    resource_type VARCHAR(50) NOT NULL, -- 'cluster', 'project', 'asset', 'user_access'
    resource_id UUID,
    
    -- Request context
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_path VARCHAR(500),
    
    -- Action details
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}',
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- Create indexes for audit log
CREATE INDEX idx_cluster_audit_log_cluster_id ON cluster_audit_log(cluster_id);
CREATE INDEX idx_cluster_audit_log_user_id ON cluster_audit_log(user_id);
CREATE INDEX idx_cluster_audit_log_action ON cluster_audit_log(action);
CREATE INDEX idx_cluster_audit_log_created_at ON cluster_audit_log(created_at);
CREATE INDEX idx_cluster_audit_log_resource_type ON cluster_audit_log(resource_type);

-- =============================================================================
-- 6. STORED PROCEDURES AND FUNCTIONS
-- =============================================================================

-- Function to calculate cluster costs
CREATE OR REPLACE FUNCTION calculate_cluster_cost(cluster_uuid UUID, period_hours INTEGER DEFAULT 720)
RETURNS TABLE(
    compute_cost DECIMAL(10,4),
    storage_cost DECIMAL(10,4),
    total_cost DECIMAL(10,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Compute costs: $0.05 per CPU hour
        (dc.node_count * dc.cpu_per_node * period_hours * 0.05)::DECIMAL(10,4) as compute_cost,
        
        -- Storage costs based on tiers
        (
            (COALESCE(CAST(REPLACE(dc.hot_tier_size, 'GB', '') AS INTEGER), 0) * 0.30 * period_hours / 720) +  -- $0.30/GB/month for hot
            (COALESCE(CAST(REPLACE(dc.warm_tier_size, 'GB', '') AS INTEGER), 0) * 0.15 * period_hours / 720) + -- $0.15/GB/month for warm
            (COALESCE(CAST(REPLACE(dc.cold_tier_size, 'GB', '') AS INTEGER), 0) * 0.05 * period_hours / 720)   -- $0.05/GB/month for cold
        )::DECIMAL(10,4) as storage_cost,
        
        -- Total cost
        (
            (dc.node_count * dc.cpu_per_node * period_hours * 0.05) +
            (COALESCE(CAST(REPLACE(dc.hot_tier_size, 'GB', '') AS INTEGER), 0) * 0.30 * period_hours / 720) +
            (COALESCE(CAST(REPLACE(dc.warm_tier_size, 'GB', '') AS INTEGER), 0) * 0.15 * period_hours / 720) +
            (COALESCE(CAST(REPLACE(dc.cold_tier_size, 'GB', '') AS INTEGER), 0) * 0.05 * period_hours / 720)
        )::DECIMAL(10,4) as total_cost
    FROM database_clusters dc
    WHERE dc.id = cluster_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to check user cluster permissions
CREATE OR REPLACE FUNCTION check_cluster_permission(
    user_uuid UUID, 
    cluster_uuid UUID, 
    required_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    permissions JSONB;
BEGIN
    -- Get user role and permissions for the cluster
    SELECT cta.role, cta.permissions 
    INTO user_role, permissions
    FROM cluster_team_access cta
    WHERE cta.user_id = user_uuid 
      AND cta.cluster_id = cluster_uuid
      AND (cta.expires_at IS NULL OR cta.expires_at > NOW());
    
    -- If no access record found, check if user is cluster owner
    IF user_role IS NULL THEN
        SELECT CASE WHEN created_by = user_uuid THEN 'admin' ELSE NULL END
        INTO user_role
        FROM database_clusters
        WHERE id = cluster_uuid;
    END IF;
    
    -- Check permissions based on role
    CASE user_role
        WHEN 'admin' THEN RETURN true;
        WHEN 'editor' THEN RETURN required_permission IN ('data_read', 'data_write', 'schema_modify', 'project_create');
        WHEN 'analyst' THEN RETURN required_permission IN ('data_read', 'project_create', 'dashboard_create');
        WHEN 'viewer' THEN RETURN required_permission = 'data_read';
        ELSE RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to update cluster health status
CREATE OR REPLACE FUNCTION update_cluster_health(
    cluster_uuid UUID,
    new_status VARCHAR(20),
    metrics JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
    UPDATE database_clusters 
    SET 
        health_status = new_status,
        last_health_check = NOW(),
        updated_at = NOW()
    WHERE id = cluster_uuid;
    
    -- Log the health check
    INSERT INTO cluster_audit_log (
        cluster_id, action, resource_type, metadata, created_at
    ) VALUES (
        cluster_uuid, 'health_check', 'cluster', 
        jsonb_build_object('status', new_status, 'metrics', metrics),
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. TRIGGERS
-- =============================================================================

-- Trigger to update cluster updated_at timestamp
CREATE OR REPLACE FUNCTION update_cluster_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cluster_timestamp
    BEFORE UPDATE ON database_clusters
    FOR EACH ROW
    EXECUTE FUNCTION update_cluster_timestamp();

-- Trigger to update project updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_timestamp
    BEFORE UPDATE ON cluster_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_project_timestamp();

-- Trigger to log cluster changes
CREATE OR REPLACE FUNCTION log_cluster_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO cluster_audit_log (
            cluster_id, user_id, action, resource_type, resource_id, new_values
        ) VALUES (
            NEW.id, NEW.created_by, 'create', 'cluster', NEW.id, to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO cluster_audit_log (
            cluster_id, action, resource_type, resource_id, old_values, new_values
        ) VALUES (
            NEW.id, 'update', 'cluster', NEW.id, to_jsonb(OLD), to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO cluster_audit_log (
            cluster_id, action, resource_type, resource_id, old_values
        ) VALUES (
            OLD.id, 'delete', 'cluster', OLD.id, to_jsonb(OLD)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_cluster_changes
    AFTER INSERT OR UPDATE OR DELETE ON database_clusters
    FOR EACH ROW
    EXECUTE FUNCTION log_cluster_changes();

-- =============================================================================
-- 8. ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE database_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_team_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies for database_clusters
CREATE POLICY "Users can view clusters they have access to" ON database_clusters
    FOR SELECT USING (
        created_by = auth.uid() OR
        id IN (
            SELECT cluster_id FROM cluster_team_access 
            WHERE user_id = auth.uid() 
            AND (expires_at IS NULL OR expires_at > NOW())
        )
    );

CREATE POLICY "Users can create clusters" ON database_clusters
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Cluster admins can update clusters" ON database_clusters
    FOR UPDATE USING (
        created_by = auth.uid() OR
        check_cluster_permission(auth.uid(), id, 'cluster_management')
    );

CREATE POLICY "Cluster admins can delete clusters" ON database_clusters
    FOR DELETE USING (
        created_by = auth.uid() OR
        check_cluster_permission(auth.uid(), id, 'cluster_management')
    );

-- Policies for cluster_team_access
CREATE POLICY "Users can view team access for their clusters" ON cluster_team_access
    FOR SELECT USING (
        user_id = auth.uid() OR
        check_cluster_permission(auth.uid(), cluster_id, 'user_management')
    );

CREATE POLICY "Cluster admins can manage team access" ON cluster_team_access
    FOR ALL USING (
        check_cluster_permission(auth.uid(), cluster_id, 'user_management')
    );

-- Policies for cluster_projects
CREATE POLICY "Users can view projects in accessible clusters" ON cluster_projects
    FOR SELECT USING (
        created_by = auth.uid() OR
        check_cluster_permission(auth.uid(), cluster_id, 'data_read')
    );

CREATE POLICY "Users can create projects in accessible clusters" ON cluster_projects
    FOR INSERT WITH CHECK (
        check_cluster_permission(auth.uid(), cluster_id, 'project_create')
    );

CREATE POLICY "Project creators and cluster admins can update projects" ON cluster_projects
    FOR UPDATE USING (
        created_by = auth.uid() OR
        check_cluster_permission(auth.uid(), cluster_id, 'cluster_management')
    );

-- =============================================================================
-- 9. HELPER TABLES FOR REFERENCE DATA
-- =============================================================================

-- Create helper tables for reference data
CREATE TABLE IF NOT EXISTS project_types (
    name VARCHAR(100) PRIMARY KEY,
    description TEXT,
    default_config JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS cluster_regions (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    available BOOLEAN DEFAULT true
);

-- =============================================================================
-- 10. SAMPLE DATA FOR TESTING
-- =============================================================================

-- Insert sample manufacturing project types
INSERT INTO public.project_types (name, description, default_config) VALUES
('manufacturing_analytics', 'Comprehensive manufacturing analytics and monitoring', '{"max_curves": 10000, "refresh_interval": 30}'),
('quality_control', 'Quality control analysis and reporting', '{"max_curves": 1000, "refresh_interval": 60}'),
('predictive_maintenance', 'Predictive maintenance analytics', '{"max_curves": 500, "refresh_interval": 300}'),
('process_optimization', 'Manufacturing process optimization', '{"max_curves": 2000, "refresh_interval": 120}'),
('batch_analysis', 'Batch production analysis', '{"max_curves": 800, "refresh_interval": 180}'),
('equipment_monitoring', 'Real-time equipment monitoring', '{"max_curves": 5000, "refresh_interval": 15}')
ON CONFLICT (name) DO NOTHING;

-- Insert sample regions
INSERT INTO public.cluster_regions (code, name, description, available) VALUES
('us-east-1', 'US East (N. Virginia)', 'United States East Coast', true),
('us-west-2', 'US West (Oregon)', 'United States West Coast', true),
('eu-west-1', 'Europe (Ireland)', 'European Union West', true),
('ap-southeast-1', 'Asia Pacific (Singapore)', 'Asia Pacific Southeast', true)
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE database_clusters IS 'Core table for managing ClickHouse database clusters';
COMMENT ON TABLE cluster_team_access IS 'Role-based access control for cluster teams';
COMMENT ON TABLE cluster_projects IS 'Manufacturing analytics projects within clusters';
COMMENT ON TABLE project_assets IS 'Dashboard, charts, reports and other assets within projects';
COMMENT ON TABLE cluster_usage_metrics IS 'Usage tracking and cost monitoring for clusters';
COMMENT ON TABLE cluster_access_tokens IS 'API access tokens for programmatic cluster access';
COMMENT ON TABLE cluster_audit_log IS 'Comprehensive audit trail for all cluster operations';

-- =============================================================================
-- 11. PERMISSIONS AND GRANTS
-- =============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON database_clusters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cluster_team_access TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cluster_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_assets TO authenticated;
GRANT SELECT, INSERT ON cluster_usage_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cluster_access_tokens TO authenticated;
GRANT SELECT ON cluster_audit_log TO authenticated;

-- Grant permissions to service role for system operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database Clusters schema has been successfully created!';
    RAISE NOTICE 'Tables created: 7 main tables + 2 helper tables';
    RAISE NOTICE 'Functions created: 3 utility functions';
    RAISE NOTICE 'Triggers created: 3 audit/timestamp triggers';
    RAISE NOTICE 'RLS policies created: 8 security policies';
    RAISE NOTICE 'Ready for Phase 1 implementation!';
END $$;
