-- Update v1.0.1 download URLs to use correct filenames
-- Version 1.0.1 already exists, we just need to fix the URLs

-- Check current URLs
SELECT
  'Current v1.0.1 URLs:' as status,
  version_number,
  brand_type,
  installer_type,
  download_url
FROM application_versions
WHERE version_number = '1.0.1'
  AND application_name = 'centcom'
  AND platform = 'windows'
ORDER BY brand_type, installer_type;

-- Update Centcom EXE URL
UPDATE application_versions
SET download_url = 'https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.1/Centcom_1.0.1_x64-setup.exe'
WHERE version_number = '1.0.1'
  AND application_name = 'centcom'
  AND platform = 'windows'
  AND brand_type = 'centcom'
  AND installer_type = 'exe';

-- Update Centcom MSI URL
UPDATE application_versions
SET download_url = 'https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.1/Centcom_1.0.1_x64_en-US.msi'
WHERE version_number = '1.0.1'
  AND application_name = 'centcom'
  AND platform = 'windows'
  AND brand_type = 'centcom'
  AND installer_type = 'msi';

-- Update Lyceum EXE URL
UPDATE application_versions
SET download_url = 'https://github.com/joshlevylabs/lyceum-releases/releases/download/v1.0.1/Lyceum_1.0.1_x64-setup.exe'
WHERE version_number = '1.0.1'
  AND application_name = 'centcom'
  AND platform = 'windows'
  AND brand_type = 'lyceum'
  AND installer_type = 'exe';

-- Update Lyceum MSI URL
UPDATE application_versions
SET download_url = 'https://github.com/joshlevylabs/lyceum-releases/releases/download/v1.0.1/Lyceum_1.0.1_x64_en-US.msi'
WHERE version_number = '1.0.1'
  AND application_name = 'centcom'
  AND platform = 'windows'
  AND brand_type = 'lyceum'
  AND installer_type = 'msi';

-- Ensure v1.0.1 is enabled and v1.0.0 is disabled
UPDATE application_versions
SET auto_update_enabled = false
WHERE version_number = '1.0.0'
  AND application_name = 'centcom'
  AND platform = 'windows';

UPDATE application_versions
SET auto_update_enabled = true
WHERE version_number = '1.0.1'
  AND application_name = 'centcom'
  AND platform = 'windows';

-- Verify the updates
SELECT
  'Updated v1.0.1 URLs:' as status,
  version_number,
  brand_type,
  installer_type,
  auto_update_enabled,
  download_url
FROM application_versions
WHERE version_number = '1.0.1'
  AND application_name = 'centcom'
  AND platform = 'windows'
ORDER BY brand_type, installer_type;

-- Show what's now the latest version
SELECT
  'Latest version (will be served):' as status,
  version_number,
  brand_type,
  installer_type
FROM application_versions
WHERE application_name = 'centcom'
  AND platform = 'windows'
  AND is_stable = true
  AND is_supported = true
  AND auto_update_enabled = true
ORDER BY release_date DESC, brand_type, installer_type;
