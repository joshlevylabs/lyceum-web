-- Simple query to show all versions for your brand
SELECT
  version_number,
  platform,
  brand_type,
  is_stable,
  is_supported,
  auto_update_enabled,
  release_date,
  installer_type,
  storage_path,
  SUBSTRING(download_url, 1, 50) || '...' as download_url_preview
FROM application_versions
WHERE application_name = 'centcom'
  AND platform = 'windows'
ORDER BY release_date DESC;
