-- Quick Fix: Update GitHub Repository URLs
-- From: lyceum-platform/centcom-releases
-- To: joshlevylabs/datacenter-releases

-- Update all download URLs
UPDATE application_versions
SET download_url = REPLACE(
  download_url,
  'github.com/lyceum-platform/centcom-releases',
  'github.com/joshlevylabs/datacenter-releases'
)
WHERE download_url LIKE '%lyceum-platform/centcom-releases%'
RETURNING
  installer_type,
  brand_type,
  download_url;

-- Update all changelog URLs
UPDATE application_versions
SET changelog_url = REPLACE(
  changelog_url,
  'github.com/lyceum-platform/centcom-releases',
  'github.com/joshlevylabs/datacenter-releases'
)
WHERE changelog_url LIKE '%lyceum-platform/centcom-releases%'
RETURNING
  installer_type,
  brand_type,
  changelog_url;

-- Verify all URLs are correct now
SELECT
  version_number,
  platform,
  installer_type,
  brand_type,
  download_url,
  changelog_url
FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
ORDER BY brand_type, installer_type;

-- Expected output: All URLs should use joshlevylabs/datacenter-releases
-- Centcom EXE: https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe
-- Centcom MSI: https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi
-- Lyceum EXE: https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64-setup.exe
-- Lyceum MSI: https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64_en-US.msi
