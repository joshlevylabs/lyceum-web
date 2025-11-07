-- =============================================
-- Clusters System Migration
-- =============================================
-- This migration creates the infrastructure for managing local and cloud clusters
-- Users can view, configure, and manage their clusters through the Lyceum platform

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Core Tables
-- =============================================

-- Clusters table: Stores both local and cloud cluster configurations
CREATE TABLE IF NOT EXISTS public.clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Cluster identification
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,

    -- Cluster type and configuration
    cluster_type VARCHAR(50) NOT NULL CHECK (cluster_type IN ('local', 'cloud')),
    status VARCHAR(50) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'configuring', 'error', 'maintenance')),

    -- Connection details (encrypted for security)
    connection_config JSONB NOT NULL DEFAULT '{}',
    -- Example structure:
    -- {
    --   "host": "localhost",
    --   "port": 5432,
    --   "protocol": "https",
    --   "api_endpoint": "...",
    --   "auth_type": "api_key|oauth|certificate",
    --   "region": "us-east-1" (for cloud clusters)
    -- }

    -- Cloud-specific fields
    provider VARCHAR(100), -- aws, azure, gcp, custom
    region VARCHAR(100),
    instance_type VARCHAR(100),

    -- Resource limits and quotas
    max_projects INTEGER DEFAULT 100,
    current_project_count INTEGER DEFAULT 0,
    storage_quota_gb INTEGER,
    storage_used_gb DECIMAL(10, 2) DEFAULT 0,

    -- Health and monitoring
    last_health_check_at TIMESTAMPTZ,
    health_status VARCHAR(50) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
    health_details JSONB,

    -- Metadata
    tags JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_connected_at TIMESTAMPTZ,

    -- Constraints
    UNIQUE(owner_id, slug)
);

-- Create index for faster queries
CREATE INDEX idx_clusters_owner_id ON public.clusters(owner_id);
CREATE INDEX idx_clusters_type ON public.clusters(cluster_type);
CREATE INDEX idx_clusters_status ON public.clusters(status);
CREATE INDEX idx_clusters_health ON public.clusters(health_status);

-- Cluster credentials: Secure storage for authentication credentials
CREATE TABLE IF NOT EXISTS public.cluster_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,

    -- Credential type
    credential_type VARCHAR(50) NOT NULL CHECK (credential_type IN ('api_key', 'oauth', 'certificate', 'ssh_key', 'password')),

    -- Encrypted credential data (use Supabase vault for production)
    credential_data JSONB NOT NULL,
    -- Structure:
    -- {
    --   "api_key": "encrypted_key",
    --   "secret": "encrypted_secret",
    --   "token": "encrypted_token",
    --   "certificate": "encrypted_cert",
    --   "private_key": "encrypted_key"
    -- }

    -- Credential metadata
    name VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(cluster_id, credential_type)
);

CREATE INDEX idx_cluster_credentials_cluster_id ON public.cluster_credentials(cluster_id);

-- Cluster projects: Links projects/datasets from clusters to Lyceum
CREATE TABLE IF NOT EXISTS public.cluster_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Project identification
    external_project_id VARCHAR(255) NOT NULL, -- ID from the cluster system
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(100), -- test_data, analytics, ml_model, etc.

    -- Project metadata from cluster
    metadata JSONB DEFAULT '{}',
    -- Structure:
    -- {
    --   "created_by": "username",
    --   "dataset_count": 10,
    --   "record_count": 1000,
    --   "size_mb": 150,
    --   "tags": ["test", "production"],
    --   "custom_fields": {}
    -- }

    -- Sync status
    sync_status VARCHAR(50) DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'error', 'disabled')),
    last_synced_at TIMESTAMPTZ,
    sync_error TEXT,

    -- Access control
    is_accessible BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(cluster_id, external_project_id)
);

CREATE INDEX idx_cluster_projects_cluster_id ON public.cluster_projects(cluster_id);
CREATE INDEX idx_cluster_projects_owner_id ON public.cluster_projects(owner_id);
CREATE INDEX idx_cluster_projects_type ON public.cluster_projects(project_type);
CREATE INDEX idx_cluster_projects_sync_status ON public.cluster_projects(sync_status);

-- Cluster activity log: Audit trail for cluster operations
CREATE TABLE IF NOT EXISTS public.cluster_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Activity details
    action VARCHAR(100) NOT NULL,
    -- Examples: cluster_created, cluster_updated, cluster_deleted,
    --           connection_tested, health_check_performed, project_synced,
    --           credentials_updated, configuration_changed

    description TEXT,
    details JSONB DEFAULT '{}',

    -- Result
    status VARCHAR(50) CHECK (status IN ('success', 'failure', 'warning')),
    error_message TEXT,

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cluster_activity_log_cluster_id ON public.cluster_activity_log(cluster_id);
CREATE INDEX idx_cluster_activity_log_user_id ON public.cluster_activity_log(user_id);
CREATE INDEX idx_cluster_activity_log_action ON public.cluster_activity_log(action);
CREATE INDEX idx_cluster_activity_log_created_at ON public.cluster_activity_log(created_at DESC);

-- =============================================
-- Functions and Triggers
-- =============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_clusters_updated_at
    BEFORE UPDATE ON public.clusters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cluster_credentials_updated_at
    BEFORE UPDATE ON public.cluster_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cluster_projects_updated_at
    BEFORE UPDATE ON public.cluster_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function: Update project count when projects are added/removed
CREATE OR REPLACE FUNCTION update_cluster_project_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.clusters
        SET current_project_count = current_project_count + 1
        WHERE id = NEW.cluster_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.clusters
        SET current_project_count = GREATEST(0, current_project_count - 1)
        WHERE id = OLD.cluster_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cluster_project_count_trigger
    AFTER INSERT OR DELETE ON public.cluster_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_cluster_project_count();

-- Function: Log cluster activity
CREATE OR REPLACE FUNCTION log_cluster_activity(
    p_cluster_id UUID,
    p_user_id UUID,
    p_action VARCHAR,
    p_description TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::JSONB,
    p_status VARCHAR DEFAULT 'success'
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.cluster_activity_log (
        cluster_id,
        user_id,
        action,
        description,
        details,
        status
    ) VALUES (
        p_cluster_id,
        p_user_id,
        p_action,
        p_description,
        p_details,
        p_status
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_activity_log ENABLE ROW LEVEL SECURITY;

-- Clusters policies
CREATE POLICY "Users can view their own clusters"
    ON public.clusters FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own clusters"
    ON public.clusters FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own clusters"
    ON public.clusters FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own clusters"
    ON public.clusters FOR DELETE
    USING (auth.uid() = owner_id);

-- Cluster credentials policies
CREATE POLICY "Users can view credentials for their clusters"
    ON public.cluster_credentials FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.clusters
            WHERE clusters.id = cluster_credentials.cluster_id
            AND clusters.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert credentials for their clusters"
    ON public.cluster_credentials FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clusters
            WHERE clusters.id = cluster_credentials.cluster_id
            AND clusters.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update credentials for their clusters"
    ON public.cluster_credentials FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.clusters
            WHERE clusters.id = cluster_credentials.cluster_id
            AND clusters.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete credentials for their clusters"
    ON public.cluster_credentials FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.clusters
            WHERE clusters.id = cluster_credentials.cluster_id
            AND clusters.owner_id = auth.uid()
        )
    );

-- Cluster projects policies
CREATE POLICY "Users can view projects from their clusters"
    ON public.cluster_projects FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert projects to their clusters"
    ON public.cluster_projects FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update projects from their clusters"
    ON public.cluster_projects FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete projects from their clusters"
    ON public.cluster_projects FOR DELETE
    USING (auth.uid() = owner_id);

-- Cluster activity log policies
CREATE POLICY "Users can view activity logs for their clusters"
    ON public.cluster_activity_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.clusters
            WHERE clusters.id = cluster_activity_log.cluster_id
            AND clusters.owner_id = auth.uid()
        )
    );

CREATE POLICY "System can insert activity logs"
    ON public.cluster_activity_log FOR INSERT
    WITH CHECK (true); -- Allow inserts from authenticated users

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE public.clusters IS 'Stores local and cloud cluster configurations for users';
COMMENT ON TABLE public.cluster_credentials IS 'Secure storage for cluster authentication credentials';
COMMENT ON TABLE public.cluster_projects IS 'Links external cluster projects/datasets to Lyceum platform';
COMMENT ON TABLE public.cluster_activity_log IS 'Audit trail for all cluster-related operations';

COMMENT ON COLUMN public.clusters.connection_config IS 'JSONB configuration for cluster connection details';
COMMENT ON COLUMN public.clusters.cluster_type IS 'Type of cluster: local (on-premise) or cloud (hosted)';
COMMENT ON COLUMN public.clusters.health_status IS 'Current health status from last health check';
COMMENT ON COLUMN public.cluster_projects.external_project_id IS 'Original project ID from the cluster system';
COMMENT ON COLUMN public.cluster_projects.sync_status IS 'Synchronization status with the cluster';
