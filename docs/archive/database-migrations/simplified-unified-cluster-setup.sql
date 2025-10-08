-- =====================================================================
-- SIMPLIFIED UNIFIED CLUSTER SETUP FOR SUPABASE
-- =====================================================================
-- Run this in your Supabase SQL Editor to create the new cluster system
-- =====================================================================

-- First, drop existing cluster tables to start fresh
DROP TABLE IF EXISTS cluster_user_assignments CASCADE;
DROP TABLE IF EXISTS cluster_team_access CASCADE;
DROP TABLE IF EXISTS database_clusters CASCADE;
DROP TABLE IF EXISTS user_database_clusters CASCADE;
DROP TABLE IF EXISTS cluster_settings CASCADE;
DROP TABLE IF EXISTS unified_clusters CASCADE;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS generate_cluster_key() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_assigned_user_count() CASCADE;

-- =====================================================================
-- 1. MAIN UNIFIED CLUSTERS TABLE
-- =====================================================================

CREATE TABLE unified_clusters (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_key VARCHAR(50) UNIQUE NOT NULL DEFAULT 'CLSTR-1',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Cluster type and architecture
    architecture VARCHAR(20) NOT NULL CHECK (architecture IN ('traditional', 'optimized')),
    cluster_type VARCHAR(50) NOT NULL CHECK (cluster_type IN ('development', 'staging', 'production', 'analytics')),
    tier VARCHAR(50), -- For optimized: 'micro', 'starter', 'professional', 'enterprise'
    
    -- Status and lifecycle
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('creating', 'active', 'maintenance', 'error', 'suspended', 'terminated')),
    health_status VARCHAR(20) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'warning', 'critical', 'unknown')),
    
    -- Geographic and infrastructure
    region VARCHAR(50) NOT NULL,
    
    -- TRADITIONAL CLUSTER CONFIGURATION (null for optimized clusters)
    node_count INTEGER,
    cpu_per_node INTEGER,
    memory_per_node VARCHAR(20),
    storage_per_node VARCHAR(20),
    hot_tier_size VARCHAR(20),
    warm_tier_size VARCHAR(20),
    cold_tier_size VARCHAR(20),
    archive_enabled BOOLEAN DEFAULT false,
    connection_string TEXT,
    admin_username VARCHAR(255),
    admin_password_hash VARCHAR(255),
    readonly_username VARCHAR(255),
    readonly_password_hash VARCHAR(255),
    
    -- OPTIMIZED CLUSTER CONFIGURATION (null for traditional clusters)
    customer_id VARCHAR(255), -- For serverless processing
    monthly_curves_limit INTEGER, -- Curves per month limit
    storage_limit VARCHAR(20), -- Storage limit (e.g., '10GB')
    processing_endpoint TEXT, -- Cloud Function endpoint
    tier_features JSONB DEFAULT '[]',
    
    -- BILLING AND COST MANAGEMENT
    estimated_monthly_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    actual_monthly_cost DECIMAL(10,2) DEFAULT 0.00,
    pricing_model VARCHAR(20) DEFAULT 'paid' CHECK (pricing_model IN ('free', 'trial', 'paid', 'optimized')),
    
    -- Responsible user for billing (who pays for this cluster)
    responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- User limits
    max_assigned_users INTEGER DEFAULT 50,
    current_assigned_users INTEGER DEFAULT 0,
    
    -- Ownership and timestamps
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    
    -- Assignment metadata
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(cluster_id, user_id)
);

-- =====================================================================
-- 3. CLUSTER SETTINGS (Optional)
-- =====================================================================

CREATE TABLE cluster_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID REFERENCES unified_clusters(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cluster_id, setting_key)
);

-- =====================================================================
-- 4. HELPER FUNCTIONS FOR CLUSTER KEY GENERATION
-- =====================================================================

-- Function to generate the next cluster key
CREATE OR REPLACE FUNCTION generate_cluster_key()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Get the next sequential number
    SELECT COALESCE(MAX(CAST(SUBSTRING(cluster_key FROM 7) AS INTEGER)), 0) + 1
    INTO next_number
    FROM unified_clusters 
    WHERE cluster_key ~ '^CLSTR-[0-9]+$';
    
    RETURN 'CLSTR-' || next_number;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate cluster key on insert
CREATE OR REPLACE FUNCTION auto_generate_cluster_key()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cluster_key = 'CLSTR-1' OR NEW.cluster_key IS NULL THEN
        NEW.cluster_key = generate_cluster_key();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate cluster key
CREATE TRIGGER auto_generate_cluster_key_trigger
    BEFORE INSERT ON unified_clusters
    FOR EACH ROW EXECUTE FUNCTION auto_generate_cluster_key();

-- =====================================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================================

CREATE INDEX idx_unified_clusters_architecture ON unified_clusters(architecture);
CREATE INDEX idx_unified_clusters_status ON unified_clusters(status);
CREATE INDEX idx_unified_clusters_cluster_type ON unified_clusters(cluster_type);
CREATE INDEX idx_unified_clusters_responsible_user ON unified_clusters(responsible_user_id);
CREATE INDEX idx_unified_clusters_created_by ON unified_clusters(created_by);

CREATE INDEX idx_cluster_user_assignments_cluster ON cluster_user_assignments(cluster_id);
CREATE INDEX idx_cluster_user_assignments_user ON cluster_user_assignments(user_id);
CREATE INDEX idx_cluster_user_assignments_active ON cluster_user_assignments(is_active);

-- =====================================================================
-- 6. TRIGGERS FOR AUTOMATIC MANAGEMENT
-- =====================================================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_unified_clusters_updated_at 
    BEFORE UPDATE ON unified_clusters 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update assigned user count
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

CREATE TRIGGER update_assigned_user_count_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON cluster_user_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_assigned_user_count();

-- =====================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================================

ALTER TABLE unified_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_user_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_settings ENABLE ROW LEVEL SECURITY;

-- Unified clusters policies
DROP POLICY IF EXISTS "Users can view their clusters" ON unified_clusters;
CREATE POLICY "Users can view their clusters" ON unified_clusters
FOR SELECT USING (
    created_by = auth.uid() OR 
    responsible_user_id = auth.uid() OR
    id IN (
        SELECT cluster_id FROM cluster_user_assignments 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

DROP POLICY IF EXISTS "Users can create clusters" ON unified_clusters;
CREATE POLICY "Users can create clusters" ON unified_clusters
FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Owners can update clusters" ON unified_clusters;
CREATE POLICY "Owners can update clusters" ON unified_clusters
FOR UPDATE USING (
    created_by = auth.uid() OR 
    responsible_user_id = auth.uid() OR
    id IN (
        SELECT cluster_id FROM cluster_user_assignments 
        WHERE user_id = auth.uid() AND access_level IN ('owner', 'admin') AND is_active = true
    )
);

-- User assignments policies
DROP POLICY IF EXISTS "Users can view relevant assignments" ON cluster_user_assignments;
CREATE POLICY "Users can view relevant assignments" ON cluster_user_assignments
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

DROP POLICY IF EXISTS "Admins can manage assignments" ON cluster_user_assignments;
CREATE POLICY "Admins can manage assignments" ON cluster_user_assignments
FOR ALL USING (
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
DROP POLICY IF EXISTS "Users can manage cluster settings" ON cluster_settings;
CREATE POLICY "Users can manage cluster settings" ON cluster_settings
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
-- 8. INSERT SAMPLE DATA FOR TESTING
-- =====================================================================

-- Insert a sample optimized cluster for testing
INSERT INTO unified_clusters (
    name, 
    description, 
    architecture, 
    cluster_type, 
    tier, 
    region,
    customer_id,
    monthly_curves_limit,
    storage_limit,
    processing_endpoint,
    estimated_monthly_cost,
    pricing_model,
    created_by,
    responsible_user_id
) VALUES (
    'Development Analytics',
    'Optimized cluster for development and testing',
    'optimized',
    'development',
    'professional',
    'us-central1',
    'customer-dev-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    10000,
    '100GB',
    'https://us-central1-lyceum-clusters-optimized.cloudfunctions.net/processCurves',
    149.00,
    'optimized',
    auth.uid(),
    auth.uid()
);

-- Insert the creator as owner of the sample cluster
INSERT INTO cluster_user_assignments (cluster_id, user_id, access_level, assigned_by)
SELECT id, created_by, 'owner', created_by
FROM unified_clusters 
WHERE name = 'Development Analytics' AND created_by = auth.uid();

-- =====================================================================
-- SETUP COMPLETE!
-- =====================================================================

-- Verify the setup
SELECT 
    'Setup Complete!' as status,
    COUNT(*) as sample_clusters_created
FROM unified_clusters 
WHERE created_by = auth.uid();
