-- Add version 1.0.1 to application_versions table
-- This will make v1.0.1 available for download

-- First, check what columns exist in the table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'application_versions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Disable auto_update for v1.0.0 (make it non-default)
UPDATE application_versions
SET auto_update_enabled = false
WHERE version_number = '1.0.0'
  AND application_name = 'centcom'
  AND platform = 'windows';

-- Insert v1.0.1 for both brands (only using columns that exist)
INSERT INTO application_versions (
  application_name,
  version_number,
  platform,
  brand_type,
  installer_type,
  is_stable,
  is_supported,
  auto_update_enabled,
  release_date,
  download_url,
  storage_path
) VALUES
  -- Centcom EXE
  (
    'centcom',
    '1.0.1',
    'windows',
    'centcom',
    'exe',
    true,
    true,
    true,
    NOW(),
    'https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.1/Centcom_1.0.1_x64-setup.exe',
    null
  ),
  -- Centcom MSI
  (
    'centcom',
    '1.0.1',
    'windows',
    'centcom',
    'msi',
    true,
    true,
    true,
    NOW(),
    'https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.1/Centcom_1.0.1_x64_en-US.msi',
    null
  ),
  -- Lyceum EXE
  (
    'centcom',
    '1.0.1',
    'windows',
    'lyceum',
    'exe',
    true,
    true,
    true,
    NOW(),
    'https://github.com/joshlevylabs/lyceum-releases/releases/download/v1.0.1/Lyceum_1.0.1_x64-setup.exe',
    null
  ),
  -- Lyceum MSI
  (
    'centcom',
    '1.0.1',
    'windows',
    'lyceum',
    'msi',
    true,
    true,
    true,
    NOW(),
    'https://github.com/joshlevylabs/lyceum-releases/releases/download/v1.0.1/Lyceum_1.0.1_x64_en-US.msi',
    null
  );

-- Verify the new versions were added
SELECT
  'New versions added:' as status,
  version_number,
  brand_type,
  installer_type,
  auto_update_enabled
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
