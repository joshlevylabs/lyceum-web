-- Add release_stage column to application_versions table
-- Migration: Add phased release stages for version management

-- Add release_stage column with enum-like constraint
ALTER TABLE application_versions
ADD COLUMN IF NOT EXISTS release_stage TEXT NOT NULL DEFAULT 'unreleased';

-- Add constraint to ensure only valid values
ALTER TABLE application_versions
ADD CONSTRAINT release_stage_check
CHECK (release_stage IN ('unreleased', 'testing', 'production'));

-- Create index for faster queries by release_stage
CREATE INDEX IF NOT EXISTS idx_application_versions_release_stage
ON application_versions(release_stage);

-- Create composite index for finding latest production versions
CREATE INDEX IF NOT EXISTS idx_application_versions_production_lookup
ON application_versions(application_name, platform, brand_type, installer_type, release_stage, release_date DESC)
WHERE release_stage = 'production' AND is_stable = true AND is_supported = true;

-- Update existing versions based on auto_update_enabled flag
-- Versions with auto_update_enabled = true become 'production'
-- All others become 'unreleased'
UPDATE application_versions
SET release_stage = CASE
  WHEN auto_update_enabled = true THEN 'production'
  ELSE 'unreleased'
END
WHERE release_stage = 'unreleased'; -- Only update rows that haven't been set yet

-- Add comment explaining the column
COMMENT ON COLUMN application_versions.release_stage IS
'Release stage for version: unreleased (newly added), testing (QA phase), production (live for users)';

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully';
  RAISE NOTICE 'Total versions: %', (SELECT COUNT(*) FROM application_versions);
  RAISE NOTICE 'Production versions: %', (SELECT COUNT(*) FROM application_versions WHERE release_stage = 'production');
  RAISE NOTICE 'Testing versions: %', (SELECT COUNT(*) FROM application_versions WHERE release_stage = 'testing');
  RAISE NOTICE 'Unreleased versions: %', (SELECT COUNT(*) FROM application_versions WHERE release_stage = 'unreleased');
END $$;
