-- =====================================================================
-- LYCEUM UNIFIED CLUSTER SYSTEM - COMPLETE OVERHAUL
-- =====================================================================
-- This script creates a unified cluster system supporting both traditional
-- and optimized clusters with comprehensive user and billing management
-- =====================================================================

-- First, clear all existing cluster data
DROP TABLE IF EXISTS cluster_user_assignments CASCADE;
DROP TABLE IF EXISTS cluster_team_access CASCADE;
DROP TABLE IF EXISTS project_assets CASCADE;
DROP TABLE IF EXISTS cluster_projects CASCADE;
DROP TABLE IF EXISTS database_clusters CASCADE;
DROP TABLE IF EXISTS user_database_clusters CASCADE;

-- =====================================================================
-- 1. UNIFIED CLUSTERS TABLE
-- =====================================================================

CREATE TABLE unified_clusters (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_key VARCHAR(50) UNIQUE NOT NULL, -- Human-readable key like LYCEUM-001
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Cluster type and architecture
    architecture VARCHAR(20) NOT NULL CHECK (architecture IN ('traditional', 'optimized')),
    cluster_type VARCHAR(50) NOT NULL CHECK (cluster_type IN ('development', 'staging', 'production', 'analytics')),
    tier VARCHAR(50), -- For optimized: 'micro', 'starter', 'professional', 'enterprise'
    
    -- Status and lifecycle
    status VARCHAR(50) NOT NULL DEFAULT 'creating' CHECK (status IN ('creating', 'active', 'maintenance', 'error', 'suspended', 'terminated')),
    health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'warning', 'critical', 'unknown')),
    
    -- Geographic and infrastructure
    region VARCHAR(50) NOT NULL,
    
    -- TRADITIONAL CLUSTER CONFIGURATION
    -- Resource allocation (null for optimized clusters)
    node_count INTEGER,
    cpu_per_node INTEGER,
    memory_per_node VARCHAR(20),
    storage_per_node VARCHAR(20),
    
    -- Storage lifecycle (null for optimized clusters)
    hot_tier_size VARCHAR(20),
    warm_tier_size VARCHAR(20),
    cold_tier_size VARCHAR(20),
    archive_enabled BOOLEAN DEFAULT false,
    
    -- Retention policies (null for optimized clusters)
    hot_retention_days INTEGER,
    warm_retention_days INTEGER,
    cold_retention_days INTEGER,
    
    -- Connection details (null for optimized clusters)
    connection_string TEXT,
    admin_username VARCHAR(255),
    admin_password_hash VARCHAR(255),
    readonly_username VARCHAR(255),
    readonly_password_hash VARCHAR(255),
    
    -- OPTIMIZED CLUSTER CONFIGURATION
    -- Serverless configuration (null for traditional clusters)
    customer_id VARCHAR(255), -- For serverless processing
    monthly_curves_limit INTEGER, -- Curves per month limit
    storage_limit VARCHAR(20), -- Storage limit (e.g., '10GB')
    processing_endpoint TEXT, -- Cloud Function endpoint
    
    -- Features configuration (JSON for flexibility)
    tier_features JSONB DEFAULT '[]',
    optimized_config JSONB DEFAULT '{}',
    traditional_config JSONB DEFAULT '{}',
    
    -- BILLING AND COST MANAGEMENT
    estimated_monthly_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    actual_monthly_cost DECIMAL(10,2) DEFAULT 0.00,
    pricing_model VARCHAR(20) DEFAULT 'paid' CHECK (pricing_model IN ('free', 'trial', 'paid', 'optimized')),
    billing_start_date TIMESTAMP WITH TIME ZONE,
    
    -- Responsible user for billing (who pays for this cluster)
    responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Usage tracking
    current_month_usage JSONB DEFAULT '{}', -- Track current month usage
    total_usage JSONB DEFAULT '{}', -- Historical usage stats
    
    -- Ownership and timestamps
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_health_check TIMESTAMP WITH TIME ZONE,
    terminated_at TIMESTAMP WITH TIME ZONE,
    
    -- User limits
    max_assigned_users INTEGER DEFAULT 50,
    current_assigned_users INTEGER DEFAULT 0
);

-- =====================================================================
-- 2. CLUSTER USER ASSIGNMENTS
-- =====================================================================

CREATE TABLE cluster_user_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID REFERENCES unified_clusters(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Access control
    access_level VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (access_level IN ('owner', 'admin', 'editor', 'analyst', 'viewer', 'user')),
    permissions JSONB DEFAULT '{}',
    
    -- Assignment metadata
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    access_notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    deactivated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deactivation_reason TEXT,
    
    UNIQUE(cluster_id, user_id)
);

-- =====================================================================
-- 3. BILLING RECORDS
-- =====================================================================

CREATE TABLE cluster_billing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID REFERENCES unified_clusters(id) ON DELETE CASCADE,
    responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Billing period
    billing_month INTEGER NOT NULL, -- 1-12
    billing_year INTEGER NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Usage tracking
    usage_data JSONB NOT NULL DEFAULT '{}',
    
    -- Traditional cluster usage
    node_hours DECIMAL(10,2) DEFAULT 0,
    cpu_hours DECIMAL(10,2) DEFAULT 0,
    storage_gb_hours DECIMAL(10,2) DEFAULT 0,
    
    -- Optimized cluster usage
    curves_processed INTEGER DEFAULT 0,
    storage_gb DECIMAL(10,2) DEFAULT 0,
    function_calls INTEGER DEFAULT 0,
    
    -- Costs
    base_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    usage_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'billed', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(cluster_id, billing_year, billing_month)
);

-- =====================================================================
-- 4. CLUSTER USAGE LOGS
-- =====================================================================

CREATE TABLE cluster_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID REFERENCES unified_clusters(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Usage event details
    event_type VARCHAR(50) NOT NULL, -- 'curve_processed', 'query_executed', 'data_uploaded', etc.
    event_data JSONB DEFAULT '{}',
    
    -- Resource consumption
    cpu_seconds DECIMAL(10,4),
    memory_mb_seconds DECIMAL(10,2),
    storage_mb DECIMAL(10,2),
    network_mb DECIMAL(10,2),
    
    -- Cost tracking
    cost_cents INTEGER DEFAULT 0, -- Cost in cents
    
    -- Timestamp
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    session_id VARCHAR(255),
    client_ip INET,
    user_agent TEXT
);

-- =====================================================================
-- 5. CLUSTER SETTINGS
-- =====================================================================

CREATE TABLE cluster_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID REFERENCES unified_clusters(id) ON DELETE CASCADE,
    
    -- Setting details
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(50) NOT NULL, -- 'string', 'number', 'boolean', 'json', 'encrypted'
    
    -- Metadata
    description TEXT,
    is_sensitive BOOLEAN DEFAULT false,
    is_user_configurable BOOLEAN DEFAULT true,
    
    -- Version control
    version INTEGER DEFAULT 1,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(cluster_id, setting_key)
);

-- =====================================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================================

-- Core cluster indexes
CREATE INDEX idx_unified_clusters_architecture ON unified_clusters(architecture);
CREATE INDEX idx_unified_clusters_status ON unified_clusters(status);
CREATE INDEX idx_unified_clusters_cluster_type ON unified_clusters(cluster_type);
CREATE INDEX idx_unified_clusters_responsible_user ON unified_clusters(responsible_user_id);
CREATE INDEX idx_unified_clusters_created_by ON unified_clusters(created_by);
CREATE INDEX idx_unified_clusters_cluster_key ON unified_clusters(cluster_key);
CREATE INDEX idx_unified_clusters_region ON unified_clusters(region);

-- User assignment indexes
CREATE INDEX idx_cluster_user_assignments_cluster ON cluster_user_assignments(cluster_id);
CREATE INDEX idx_cluster_user_assignments_user ON cluster_user_assignments(user_id);
CREATE INDEX idx_cluster_user_assignments_active ON cluster_user_assignments(is_active);
CREATE INDEX idx_cluster_user_assignments_access_level ON cluster_user_assignments(access_level);

-- Billing indexes
CREATE INDEX idx_cluster_billing_records_cluster ON cluster_billing_records(cluster_id);
CREATE INDEX idx_cluster_billing_records_responsible_user ON cluster_billing_records(responsible_user_id);
CREATE INDEX idx_cluster_billing_records_period ON cluster_billing_records(billing_year, billing_month);
CREATE INDEX idx_cluster_billing_records_status ON cluster_billing_records(status);

-- Usage logs indexes
CREATE INDEX idx_cluster_usage_logs_cluster ON cluster_usage_logs(cluster_id);
CREATE INDEX idx_cluster_usage_logs_user ON cluster_usage_logs(user_id);
CREATE INDEX idx_cluster_usage_logs_occurred_at ON cluster_usage_logs(occurred_at);
CREATE INDEX idx_cluster_usage_logs_event_type ON cluster_usage_logs(event_type);

-- Settings indexes
CREATE INDEX idx_cluster_settings_cluster ON cluster_settings(cluster_id);
CREATE INDEX idx_cluster_settings_key ON cluster_settings(setting_key);

-- =====================================================================
-- 7. TRIGGERS AND FUNCTIONS
-- =====================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_unified_clusters_updated_at BEFORE UPDATE ON unified_clusters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cluster_billing_records_updated_at BEFORE UPDATE ON cluster_billing_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-generate cluster keys
CREATE OR REPLACE FUNCTION generate_cluster_key()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Get next cluster number
    SELECT COALESCE(MAX(CAST(SUBSTRING(cluster_key FROM '\d+') AS INTEGER)), 0) + 1
    INTO next_number
    FROM unified_clusters
    WHERE cluster_key ~ '^LYCEUM-\d+$';
    
    -- Generate cluster key
    NEW.cluster_key = 'LYCEUM-' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply cluster key generation trigger
CREATE TRIGGER generate_cluster_key_trigger 
BEFORE INSERT ON unified_clusters 
FOR EACH ROW 
WHEN (NEW.cluster_key IS NULL)
EXECUTE FUNCTION generate_cluster_key();

-- Function to update assigned user count
CREATE OR REPLACE FUNCTION update_assigned_user_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE unified_clusters 
        SET current_assigned_users = (
            SELECT COUNT(*) 
            FROM cluster_user_assignments 
            WHERE cluster_id = NEW.cluster_id AND is_active = true
        )
        WHERE id = NEW.cluster_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE unified_clusters 
        SET current_assigned_users = (
            SELECT COUNT(*) 
            FROM cluster_user_assignments 
            WHERE cluster_id = OLD.cluster_id AND is_active = true
        )
        WHERE id = OLD.cluster_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply user count trigger
CREATE TRIGGER update_assigned_user_count_trigger 
AFTER INSERT OR UPDATE OR DELETE ON cluster_user_assignments 
FOR EACH ROW 
EXECUTE FUNCTION update_assigned_user_count();

-- =====================================================================
-- 8. ROW LEVEL SECURITY (RLS) SETUP
-- =====================================================================

-- Enable RLS
ALTER TABLE unified_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_user_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_settings ENABLE ROW LEVEL SECURITY;

-- Unified clusters policies
CREATE POLICY "Users can view clusters they created or are assigned to" ON unified_clusters
FOR SELECT USING (
    created_by = auth.uid() OR 
    responsible_user_id = auth.uid() OR
    id IN (
        SELECT cluster_id FROM cluster_user_assignments 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

CREATE POLICY "Users can create clusters" ON unified_clusters
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners and responsible users can update clusters" ON unified_clusters
FOR UPDATE USING (
    created_by = auth.uid() OR 
    responsible_user_id = auth.uid() OR
    id IN (
        SELECT cluster_id FROM cluster_user_assignments 
        WHERE user_id = auth.uid() AND access_level IN ('owner', 'admin') AND is_active = true
    )
);

-- User assignments policies
CREATE POLICY "Users can view assignments for their clusters or their own assignments" ON cluster_user_assignments
FOR SELECT USING (
    user_id = auth.uid() OR
    cluster_id IN (
        SELECT id FROM unified_clusters 
        WHERE created_by = auth.uid() OR responsible_user_id = auth.uid()
    ) OR
    cluster_id IN (
        SELECT cluster_id FROM cluster_user_assignments 
        WHERE user_id = auth.uid() AND access_level IN ('owner', 'admin') AND is_active = true
    )
);

-- Settings policies
CREATE POLICY "Users can manage settings for their clusters" ON cluster_settings
FOR ALL USING (
    cluster_id IN (
        SELECT id FROM unified_clusters 
        WHERE created_by = auth.uid() OR responsible_user_id = auth.uid() OR
        id IN (
            SELECT cluster_id FROM cluster_user_assignments 
            WHERE user_id = auth.uid() AND access_level IN ('owner', 'admin') AND is_active = true
        )
    )
);

-- =====================================================================
-- 9. SAMPLE DATA FOR TESTING
-- =====================================================================

-- This will be populated by the application, but here's the structure:
/*
-- Traditional cluster example:
INSERT INTO unified_clusters (
    name, description, architecture, cluster_type, region,
    node_count, cpu_per_node, memory_per_node, storage_per_node,
    estimated_monthly_cost, pricing_model, created_by
) VALUES (
    'Production Analytics', 'Main production cluster for analytics', 
    'traditional', 'production', 'us-east-1',
    3, 8, '32GB', '500GB',
    1299.00, 'paid', auth.uid()
);

-- Optimized cluster example:
INSERT INTO unified_clusters (
    name, description, architecture, cluster_type, tier, region,
    customer_id, monthly_curves_limit, storage_limit, processing_endpoint,
    estimated_monthly_cost, pricing_model, created_by
) VALUES (
    'Development Curves', 'Optimized cluster for development',
    'optimized', 'development', 'professional', 'us-central1',
    'customer-dev-001', 10000, '100GB', 'https://us-central1-lyceum-clusters-optimized.cloudfunctions.net/processCurves',
    149.00, 'optimized', auth.uid()
);
*/

-- =====================================================================
-- 10. VIEWS FOR COMMON QUERIES
-- =====================================================================

-- View for cluster summary with user counts and costs
CREATE OR REPLACE VIEW cluster_summary AS
SELECT 
    c.*,
    -- User assignment counts
    COALESCE(ua.total_users, 0) as total_assigned_users,
    COALESCE(ua.admin_users, 0) as admin_users,
    COALESCE(ua.active_users, 0) as active_users,
    
    -- Billing information
    COALESCE(br.current_month_cost, 0) as current_month_cost,
    COALESCE(br.last_month_cost, 0) as last_month_cost,
    
    -- Usage stats
    COALESCE(ul.current_month_events, 0) as current_month_events,
    COALESCE(ul.current_month_cost_cents, 0) as current_month_usage_cost_cents
    
FROM unified_clusters c

LEFT JOIN (
    SELECT 
        cluster_id,
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE access_level IN ('owner', 'admin')) as admin_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users
    FROM cluster_user_assignments
    GROUP BY cluster_id
) ua ON c.id = ua.cluster_id

LEFT JOIN (
    SELECT 
        cluster_id,
        MAX(CASE WHEN billing_year = EXTRACT(year FROM NOW()) AND billing_month = EXTRACT(month FROM NOW()) 
            THEN total_cost END) as current_month_cost,
        MAX(CASE WHEN billing_year = EXTRACT(year FROM NOW() - INTERVAL '1 month') AND billing_month = EXTRACT(month FROM NOW() - INTERVAL '1 month') 
            THEN total_cost END) as last_month_cost
    FROM cluster_billing_records
    GROUP BY cluster_id
) br ON c.id = br.cluster_id

LEFT JOIN (
    SELECT 
        cluster_id,
        COUNT(*) FILTER (WHERE occurred_at >= date_trunc('month', NOW())) as current_month_events,
        SUM(cost_cents) FILTER (WHERE occurred_at >= date_trunc('month', NOW())) as current_month_cost_cents
    FROM cluster_usage_logs
    GROUP BY cluster_id
) ul ON c.id = ul.cluster_id;

COMMENT ON TABLE unified_clusters IS 'Unified cluster system supporting both traditional and optimized architectures';
COMMENT ON TABLE cluster_user_assignments IS 'User assignments to clusters with role-based access control';
COMMENT ON TABLE cluster_billing_records IS 'Monthly billing records for cluster usage and costs';
COMMENT ON TABLE cluster_usage_logs IS 'Detailed usage events and resource consumption tracking';
COMMENT ON TABLE cluster_settings IS 'Configurable settings for each cluster';
COMMENT ON VIEW cluster_summary IS 'Summary view with user counts, billing, and usage statistics';
