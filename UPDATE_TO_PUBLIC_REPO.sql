-- Update download URLs to use new public release repository
-- After creating the public repo and uploading release files, run this script

-- Step 1: Check current URLs (before update)
SELECT
  installer_type,
  download_url,
  changelog_url
FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
ORDER BY installer_type;

-- Step 2: Update URLs to point to public repo
-- Using datacenter-releases as the public release repository
UPDATE application_versions
SET
  download_url = REPLACE(download_url,
    'github.com/joshlevylabs/datacenter/releases/download',
    'github.com/joshlevylabs/datacenter-releases/releases/download'
  ),
  changelog_url = REPLACE(COALESCE(changelog_url, ''),
    'github.com/joshlevylabs/datacenter/releases/tag',
    'github.com/joshlevylabs/datacenter-releases/releases/tag'
  )
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
RETURNING
  installer_type,
  download_url,
  changelog_url;

-- Step 3: Verify the update
SELECT
  installer_type,
  download_url,
  changelog_url,
  file_size_bytes,
  sha256_hash
FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
ORDER BY installer_type;

-- Expected results after update:
-- EXE: https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe
-- MSI: https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi
