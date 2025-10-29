-- Check current download URLs in the database
-- This will show what URLs are configured for Centcom v1.0.0

SELECT
  id,
  application_name,
  version_number,
  platform,
  architecture,
  installer_type,
  download_url,
  file_size_bytes,
  sha256_hash,
  release_date,
  is_stable
FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
ORDER BY installer_type;

-- Check if there are any other versions
SELECT
  version_number,
  platform,
  installer_type,
  download_url
FROM application_versions
WHERE application_name = 'centcom'
ORDER BY version_number DESC, installer_type;
