-- =====================================================================
-- USER-CLUSTER ASSOCIATION MIGRATION
-- =====================================================================
-- This migration adds user UUID properties to cluster-related tables
-- to properly associate clusters and projects with specific users
-- =====================================================================

-- Add user_id column to cluster_projects table
DO $$
BEGIN
    -- Check if user_id column already exists in cluster_projects
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cluster_projects' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE cluster_projects ADD COLUMN user_id UUID;
        
        -- Add foreign key constraint to user_profiles
        ALTER TABLE cluster_projects 
        ADD CONSTRAINT fk_cluster_projects_user_id 
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added user_id column to cluster_projects table';
    ELSE
        RAISE NOTICE 'user_id column already exists in cluster_projects table';
    END IF;
END;
$$;

-- Add user_id column to project_assets table
DO $$
BEGIN
    -- Check if user_id column already exists in project_assets
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_assets' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE project_assets ADD COLUMN user_id UUID;
        
        -- Add foreign key constraint to user_profiles
        ALTER TABLE project_assets 
        ADD CONSTRAINT fk_project_assets_user_id 
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added user_id column to project_assets table';
    ELSE
        RAISE NOTICE 'user_id column already exists in project_assets table';
    END IF;
END;
$$;

-- Create cluster_user_assignments table if it doesn't exist
DO $$
BEGIN
    -- Check if the table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cluster_user_assignments'
    ) THEN
        CREATE TABLE cluster_user_assignments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cluster_id UUID NOT NULL REFERENCES database_clusters(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
            assigned_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
            access_level VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (access_level IN ('viewer', 'analyst', 'editor', 'admin')),
            assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN NOT NULL DEFAULT true,
            access_notes TEXT,
            user_email VARCHAR(255),
            user_name VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Add indexes for performance
        CREATE INDEX idx_cluster_user_assignments_cluster_id ON cluster_user_assignments(cluster_id);
        CREATE INDEX idx_cluster_user_assignments_user_id ON cluster_user_assignments(user_id);
        CREATE INDEX idx_cluster_user_assignments_active ON cluster_user_assignments(is_active);
        CREATE INDEX idx_cluster_user_assignments_assigned_by ON cluster_user_assignments(assigned_by);
        
        -- Ensure unique active assignments per user per cluster (partial index)
        CREATE UNIQUE INDEX idx_cluster_user_assignments_unique_active 
        ON cluster_user_assignments(cluster_id, user_id) 
        WHERE is_active = true;
        
        RAISE NOTICE 'Created cluster_user_assignments table successfully';
    END IF;
END;
$$;

-- Update cluster_user_assignments to ensure proper user linkage
DO $$
BEGIN
    -- Check if the table exists and has the right structure
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cluster_user_assignments'
    ) THEN
        -- Check if user_email column exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'cluster_user_assignments' 
            AND column_name = 'user_email'
        ) THEN
            ALTER TABLE cluster_user_assignments ADD COLUMN user_email VARCHAR(255);
            RAISE NOTICE 'Added user_email column to cluster_user_assignments table';
        END IF;
        
        -- Check if user_name column exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'cluster_user_assignments' 
            AND column_name = 'user_name'
        ) THEN
            ALTER TABLE cluster_user_assignments ADD COLUMN user_name VARCHAR(255);
            RAISE NOTICE 'Added user_name column to cluster_user_assignments table';
        END IF;
        
        -- Update existing assignments to populate user_email and user_name
        UPDATE cluster_user_assignments 
        SET 
            user_email = up.email,
            user_name = up.full_name
        FROM user_profiles up 
        WHERE cluster_user_assignments.user_id = up.id 
        AND (cluster_user_assignments.user_email IS NULL OR cluster_user_assignments.user_name IS NULL);
        
        RAISE NOTICE 'Updated existing cluster_user_assignments with user email and name';
    END IF;
END;
$$;

-- Create function to automatically populate user info in cluster assignments
CREATE OR REPLACE FUNCTION populate_cluster_assignment_user_info()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new assignment is created, populate user_email and user_name
    IF NEW.user_id IS NOT NULL THEN
        SELECT email, full_name 
        INTO NEW.user_email, NEW.user_name
        FROM user_profiles 
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for cluster_user_assignments
DROP TRIGGER IF EXISTS trigger_populate_cluster_assignment_user_info ON cluster_user_assignments;
CREATE TRIGGER trigger_populate_cluster_assignment_user_info
    BEFORE INSERT OR UPDATE ON cluster_user_assignments
    FOR EACH ROW
    EXECUTE FUNCTION populate_cluster_assignment_user_info();

-- Create function to automatically set user_id in projects when created
CREATE OR REPLACE FUNCTION populate_project_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If user_id is not set but created_by is, use created_by as user_id
    IF NEW.user_id IS NULL AND NEW.created_by IS NOT NULL THEN
        NEW.user_id = NEW.created_by;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for cluster_projects
DROP TRIGGER IF EXISTS trigger_populate_project_user_id ON cluster_projects;
CREATE TRIGGER trigger_populate_project_user_id
    BEFORE INSERT OR UPDATE ON cluster_projects
    FOR EACH ROW
    EXECUTE FUNCTION populate_project_user_id();

-- Create trigger for project_assets
DROP TRIGGER IF EXISTS trigger_populate_project_assets_user_id ON project_assets;
CREATE TRIGGER trigger_populate_project_assets_user_id
    BEFORE INSERT OR UPDATE ON project_assets
    FOR EACH ROW
    EXECUTE FUNCTION populate_project_user_id();

-- Create view for user cluster summary (for admin dashboard)
CREATE OR REPLACE VIEW user_cluster_summary AS
SELECT 
    up.id as user_id,
    up.email,
    up.full_name,
    COUNT(DISTINCT cua.cluster_id) as total_assigned_clusters,
    COUNT(DISTINCT CASE WHEN dc.status = 'active' THEN cua.cluster_id END) as active_clusters,
    COUNT(DISTINCT cp.id) as total_projects,
    COALESCE(SUM(dc.estimated_monthly_cost), 0) as total_monthly_cost,
    MAX(cua.assigned_at) as last_cluster_assignment
FROM user_profiles up
LEFT JOIN cluster_user_assignments cua ON up.id = cua.user_id AND cua.is_active = true
LEFT JOIN database_clusters dc ON cua.cluster_id = dc.id
LEFT JOIN cluster_projects cp ON dc.id = cp.cluster_id AND cp.user_id = up.id
GROUP BY up.id, up.email, up.full_name;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cluster_projects_user_id ON cluster_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_project_assets_user_id ON project_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_cluster_user_assignments_user_email ON cluster_user_assignments(user_email);

-- Verification query
SELECT 'MIGRATION COMPLETED SUCCESSFULLY! 🎉' as status;

SELECT 
    'cluster_projects' as table_name,
    COUNT(*) as total_rows,
    COUNT(user_id) as rows_with_user_id
FROM cluster_projects
UNION ALL
SELECT 
    'project_assets' as table_name,
    COUNT(*) as total_rows,
    COUNT(user_id) as rows_with_user_id
FROM project_assets
UNION ALL
SELECT 
    'cluster_user_assignments' as table_name,
    COUNT(*) as total_rows,
    COUNT(user_email) as rows_with_user_email
FROM cluster_user_assignments;

-- Final completion notice
DO $$
BEGIN
    RAISE NOTICE 'User-cluster association migration completed successfully!';
END;
$$;
