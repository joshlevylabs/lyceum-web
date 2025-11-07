-- =============================================
-- Extend Existing Cluster Projects for Test Data
-- =============================================
-- This migration extends the existing cluster_projects table
-- to support test data management features

-- Add columns if they don't exist
DO $$
BEGIN
    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cluster_projects'
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.cluster_projects
        ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;

    -- Add sync_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cluster_projects'
        AND column_name = 'sync_status'
    ) THEN
        ALTER TABLE public.cluster_projects
        ADD COLUMN sync_status VARCHAR(50) DEFAULT 'pending'
        CHECK (sync_status IN ('synced', 'pending', 'error', 'disabled'));
    END IF;

    -- Add last_synced_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cluster_projects'
        AND column_name = 'last_synced_at'
    ) THEN
        ALTER TABLE public.cluster_projects
        ADD COLUMN last_synced_at TIMESTAMPTZ;
    END IF;

    -- Add sync_error column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cluster_projects'
        AND column_name = 'sync_error'
    ) THEN
        ALTER TABLE public.cluster_projects
        ADD COLUMN sync_error TEXT;
    END IF;

    -- Add project_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cluster_projects'
        AND column_name = 'project_type'
    ) THEN
        ALTER TABLE public.cluster_projects
        ADD COLUMN project_type VARCHAR(100) DEFAULT 'test_data';
    END IF;
END $$;

-- Create indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'cluster_projects'
        AND indexname = 'idx_cluster_projects_sync_status'
    ) THEN
        CREATE INDEX idx_cluster_projects_sync_status
        ON public.cluster_projects(sync_status);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'cluster_projects'
        AND indexname = 'idx_cluster_projects_type'
    ) THEN
        CREATE INDEX idx_cluster_projects_type
        ON public.cluster_projects(project_type);
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.cluster_projects.metadata IS 'Project metadata from cluster including custom fields, tags, record counts, etc.';
COMMENT ON COLUMN public.cluster_projects.sync_status IS 'Synchronization status with the cluster';
COMMENT ON COLUMN public.cluster_projects.project_type IS 'Type of project: test_data, analytics, ml_model, etc.';
