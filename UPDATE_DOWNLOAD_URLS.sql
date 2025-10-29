-- Update download URLs if the filenames don't match the GitHub release
-- Run CHECK_DOWNLOAD_URLS.sql first to see current URLs
-- Check the GitHub release to see the actual filenames

-- OPTION A: If the EXE file is named Centcom_1.0.0_x64_en-US.exe (matching MSI pattern)
UPDATE application_versions
SET download_url = 'https://github.com/joshlevylabs/datacenter/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.exe'
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
  AND platform = 'windows'
  AND installer_type = 'exe'
RETURNING *;

-- OPTION B: If you need to update both MSI and EXE URLs
-- (Replace with actual filenames from your GitHub release)
/*
UPDATE application_versions
SET download_url = CASE
  WHEN installer_type = 'msi' THEN 'https://github.com/joshlevylabs/datacenter/releases/download/v1.0.0/ACTUAL_MSI_FILENAME.msi'
  WHEN installer_type = 'exe' THEN 'https://github.com/joshlevylabs/datacenter/releases/download/v1.0.0/ACTUAL_EXE_FILENAME.exe'
END
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
  AND platform = 'windows'
RETURNING *;
*/

-- Verify the update
SELECT
  installer_type,
  download_url,
  file_size_bytes
FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
ORDER BY installer_type;
