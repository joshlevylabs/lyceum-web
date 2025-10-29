-- Deploy Dual-Branding System - Complete Setup
-- Run this script after uploading all 4 installers to GitHub

-- ============================================================
-- STEP 1: Add brand_type columns to tables
-- ============================================================

-- Add brand_type to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS brand_type TEXT DEFAULT 'lyceum'
CHECK (brand_type IN ('lyceum', 'centcom'));

CREATE INDEX IF NOT EXISTS idx_organizations_brand_type
ON organizations(brand_type);

-- Add brand_type to application_versions
ALTER TABLE application_versions
ADD COLUMN IF NOT EXISTS brand_type TEXT DEFAULT 'lyceum'
CHECK (brand_type IN ('lyceum', 'centcom'));

-- Drop old unique constraint
ALTER TABLE application_versions
DROP CONSTRAINT IF EXISTS application_versions_app_version_platform_installer_key;

-- Add new unique constraint including brand_type
ALTER TABLE application_versions
ADD CONSTRAINT application_versions_unique_version
UNIQUE (application_name, version_number, platform, installer_type, brand_type);

-- Create index for brand lookups
CREATE INDEX IF NOT EXISTS idx_application_versions_brand
ON application_versions(brand_type, platform, release_date DESC);

-- ============================================================
-- STEP 2: Update existing records to Centcom brand
-- ============================================================

-- Update existing Centcom records with brand_type and new URLs
UPDATE application_versions
SET
  brand_type = 'centcom',
  download_url = CASE
    WHEN installer_type = 'exe' THEN
      'https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Datacenter_Centcom_1.0.0_x64-setup.exe'
    WHEN installer_type = 'msi' THEN
      'https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Datacenter_Centcom_1.0.0_x64_en-US.msi'
  END
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
  AND platform = 'windows'
RETURNING
  installer_type,
  brand_type,
  download_url;

-- ============================================================
-- STEP 3: Insert Lyceum branded versions
-- ============================================================

-- Insert Lyceum EXE version
INSERT INTO application_versions (
  application_name,
  version_number,
  platform,
  architecture,
  installer_type,
  file_size_bytes,
  sha256_hash,
  download_url,
  changelog_url,
  release_date,
  is_stable,
  is_supported,
  auto_update_enabled,
  force_update,
  brand_type
) VALUES (
  'centcom',
  '1.0.0',
  'windows',
  'x64',
  'exe',
  320431554, -- Actual size from build
  '48D61A720AC01FC5C7DA7DB4FF3C09271ACEE7CEB8B1F9B6E9A93B1142A05B05', -- Actual SHA256
  'https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64-setup.exe',
  'https://github.com/joshlevylabs/datacenter-releases/releases/tag/v1.0.0',
  NOW(),
  true,
  true,
  true,
  false,
  'lyceum'
)
ON CONFLICT ON CONSTRAINT application_versions_unique_version
DO UPDATE SET
  file_size_bytes = EXCLUDED.file_size_bytes,
  sha256_hash = EXCLUDED.sha256_hash,
  download_url = EXCLUDED.download_url
RETURNING
  installer_type,
  brand_type,
  download_url;

-- Insert Lyceum MSI version
INSERT INTO application_versions (
  application_name,
  version_number,
  platform,
  architecture,
  installer_type,
  file_size_bytes,
  sha256_hash,
  download_url,
  changelog_url,
  release_date,
  is_stable,
  is_supported,
  auto_update_enabled,
  force_update,
  brand_type
) VALUES (
  'centcom',
  '1.0.0',
  'windows',
  'x64',
  'msi',
  323690496, -- Actual size from build
  '2578A7F82E846751AC4FBE42F74A777720BF3CD226A4D0C6649D1C35CC9B102A', -- Actual SHA256
  'https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64_en-US.msi',
  'https://github.com/joshlevylabs/datacenter-releases/releases/tag/v1.0.0',
  NOW(),
  true,
  true,
  true,
  false,
  'lyceum'
)
ON CONFLICT ON CONSTRAINT application_versions_unique_version
DO UPDATE SET
  file_size_bytes = EXCLUDED.file_size_bytes,
  sha256_hash = EXCLUDED.sha256_hash,
  download_url = EXCLUDED.download_url
RETURNING
  installer_type,
  brand_type,
  download_url;

-- ============================================================
-- STEP 4: Verify all versions are correct
-- ============================================================

SELECT
  version_number,
  platform,
  installer_type,
  brand_type,
  file_size_bytes,
  SUBSTRING(download_url FROM 'github.com/.*/([^/]+)$') as filename,
  sha256_hash
FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
ORDER BY brand_type, installer_type;

-- Expected: 4 rows
-- centcom | exe | Datacenter_Centcom_1.0.0_x64-setup.exe
-- centcom | msi | Datacenter_Centcom_1.0.0_x64_en-US.msi
-- lyceum  | exe | Lyceum_1.0.0_x64-setup.exe
-- lyceum  | msi | Lyceum_1.0.0_x64_en-US.msi

-- ============================================================
-- STEP 5: Set default organization brands (optional)
-- ============================================================

-- Set all existing organizations to lyceum by default
UPDATE organizations
SET brand_type = 'lyceum'
WHERE brand_type IS NULL;

-- Verify organizations
SELECT
  id,
  name,
  brand_type,
  created_at
FROM organizations
ORDER BY name;

-- ============================================================
-- DEPLOYMENT COMPLETE!
-- ============================================================

-- Next steps:
-- 1. Deploy updated API code with brand detection
-- 2. Test downloads for both brands
-- 3. Create admin UI for brand management (optional)
