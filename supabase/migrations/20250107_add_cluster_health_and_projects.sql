-- Add health status and projects metadata support to local clusters
-- Migration: Add health_status, last_error, and projects_metadata columns

-- Add health_status column
ALTER TABLE local_cluster_usage
ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) DEFAULT 'unknown';

-- Add last_error column for debugging
ALTER TABLE local_cluster_usage
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Add projects_metadata JSON column to store project information
ALTER TABLE local_cluster_usage
ADD COLUMN IF NOT EXISTS projects_metadata JSONB;

-- Add comment for documentation
COMMENT ON COLUMN local_cluster_usage.health_status IS 'Cluster health status: healthy, degraded, offline, unknown';
COMMENT ON COLUMN local_cluster_usage.last_error IS 'Last error message reported by the cluster';
COMMENT ON COLUMN local_cluster_usage.projects_metadata IS 'JSON array of project metadata including measurements and tables';

-- Create index on health_status for faster queries
CREATE INDEX IF NOT EXISTS idx_local_cluster_usage_health_status
ON local_cluster_usage(health_status);

-- Create GIN index on projects_metadata for JSON queries
CREATE INDEX IF NOT EXISTS idx_local_cluster_usage_projects_metadata
ON local_cluster_usage USING GIN (projects_metadata);

-- Update existing clusters to have 'unknown' health status if null
UPDATE local_cluster_usage
SET health_status = 'unknown'
WHERE health_status IS NULL;
