-- ============================================================================
-- Insert Centcom v1.0.0 Records with GitHub Release URLs
-- ============================================================================
-- Run this AFTER you've uploaded the files to GitHub Releases
-- Replace YOUR_USERNAME/REPO_NAME with your actual GitHub path
-- ============================================================================

-- ⚠️ IMPORTANT: Update these URLs with your actual GitHub repository info!
-- Format: https://github.com/YOUR_USERNAME/REPO_NAME/releases/download/v1.0.0/FILENAME

-- Example:
-- If your GitHub is "thelyceum" and repo is "centcom-releases", URLs would be:
-- https://github.com/thelyceum/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi
-- https://github.com/thelyceum/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe

-- ============================================================================
-- 1. Insert MSI Version
-- ============================================================================

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
  force_update
) VALUES (
  'centcom',
  '1.0.0',
  'windows',
  'x64',
  'msi',
  323946496,  -- 309 MB in bytes (308.98 MB)
  '420F252125B7297AE49F7138EB2879E4A372955CAC6C3C0B2E789E41A88F31E0',
  'https://github.com/YOUR_USERNAME/REPO_NAME/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi',
  'https://github.com/YOUR_USERNAME/REPO_NAME/releases/tag/v1.0.0',
  NOW(),
  true,
  true,
  true,
  false
)
ON CONFLICT (application_name, version_number, platform) DO UPDATE
SET
  download_url = EXCLUDED.download_url,
  sha256_hash = EXCLUDED.sha256_hash,
  file_size_bytes = EXCLUDED.file_size_bytes,
  updated_at = NOW();

-- ============================================================================
-- 2. Insert EXE Version (NSIS)
-- ============================================================================

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
  force_update
) VALUES (
  'centcom',
  '1.0.0',
  'windows',
  'x64',
  'exe',
  320586752,  -- 306 MB in bytes (305.76 MB)
  'AE1BE4E5BE6AA8177C5CA6F335BC63C88607AE79A83590139A477E802DA5B287',
  'https://github.com/YOUR_USERNAME/REPO_NAME/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe',
  'https://github.com/YOUR_USERNAME/REPO_NAME/releases/tag/v1.0.0',
  NOW(),
  true,
  true,
  true,
  false
)
ON CONFLICT (application_name, version_number, platform) DO UPDATE
SET
  download_url = EXCLUDED.download_url,
  sha256_hash = EXCLUDED.sha256_hash,
  file_size_bytes = EXCLUDED.file_size_bytes,
  updated_at = NOW();

-- ============================================================================
-- 3. Verify the records were created
-- ============================================================================

SELECT
  id,
  application_name,
  version_number,
  platform,
  installer_type,
  ROUND(file_size_bytes / 1024.0 / 1024.0, 2) as "Size (MB)",
  LEFT(sha256_hash, 16) || '...' as "SHA256 (truncated)",
  download_url,
  is_stable,
  auto_update_enabled,
  created_at
FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
ORDER BY installer_type;

-- Expected output: 2 rows
-- Row 1: msi installer with GitHub URL
-- Row 2: exe installer with GitHub URL

-- ============================================================================
-- 4. Test query (optional) - Simulate what the API will query
-- ============================================================================

-- This simulates the API query for latest version
SELECT
  version_number,
  platform,
  installer_type,
  download_url,
  sha256_hash
FROM application_versions
WHERE application_name = 'centcom'
  AND platform = 'windows'
  AND is_stable = true
  AND is_supported = true
  AND auto_update_enabled = true
ORDER BY release_date DESC
LIMIT 1;

-- Should return the latest version with GitHub download URL
