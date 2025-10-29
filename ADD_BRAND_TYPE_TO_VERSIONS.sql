-- Add brand_type column to application_versions table
-- This enables storing separate versions for Lyceum and Centcom brands

-- Add brand_type column with default 'lyceum'
ALTER TABLE application_versions
ADD COLUMN IF NOT EXISTS brand_type TEXT DEFAULT 'lyceum'
CHECK (brand_type IN ('lyceum', 'centcom'));

-- Update existing records to have lyceum brand
UPDATE application_versions
SET brand_type = 'lyceum'
WHERE brand_type IS NULL;

-- Drop old unique constraint (doesn't include brand_type)
ALTER TABLE application_versions
DROP CONSTRAINT IF EXISTS application_versions_app_version_platform_installer_key;

-- Add new unique constraint including brand_type
-- This ensures we can have separate versions per brand
ALTER TABLE application_versions
ADD CONSTRAINT application_versions_unique_version
UNIQUE (application_name, version_number, platform, installer_type, brand_type);

-- Create index for brand lookups (improves query performance)
CREATE INDEX IF NOT EXISTS idx_application_versions_brand
ON application_versions(brand_type, platform, release_date DESC);

-- Verify the update
SELECT
  id,
  application_name,
  version_number,
  platform,
  installer_type,
  brand_type,
  download_url
FROM application_versions
ORDER BY release_date DESC;

-- Expected: All existing versions should have brand_type = 'lyceum'
