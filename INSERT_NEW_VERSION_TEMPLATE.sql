-- ============================================
-- Template: Insert New Version Release
-- ============================================
-- Use this template when releasing a new version
-- Replace placeholders with actual values

-- ============================================
-- STEP 1: Set your version number
-- ============================================
-- VERSION: 1.0.1
-- RELEASE_DATE: 2025-11-15

-- ============================================
-- STEP 2: Calculate file sizes and SHA256
-- ============================================
-- Windows Command:
--   dir /s Centcom_1.0.1_x64-setup.exe
--   certutil -hashfile Centcom_1.0.1_x64-setup.exe SHA256
--
-- macOS/Linux Command:
--   ls -lh Centcom_1.0.1_x64-setup.exe
--   shasum -a 256 Centcom_1.0.1_x64-setup.exe

-- ============================================
-- CENTCOM BRAND - EXE Installer
-- ============================================
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
  '1.0.1',  -- ← UPDATE THIS
  'windows',
  'x64',
  'exe',
  320000000,  -- ← UPDATE THIS (file size in bytes)
  'PASTE_SHA256_HASH_HERE',  -- ← UPDATE THIS
  'https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.1/Centcom_1.0.1_x64-setup.exe',  -- ← UPDATE VERSION
  'https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.1',  -- ← UPDATE VERSION
  NOW(),  -- Or specify: '2025-11-15 10:00:00+00'
  true,   -- is_stable: true for production, false for beta
  true,   -- is_supported: true to allow downloads
  true,   -- auto_update_enabled: true to push to users
  false,  -- force_update: true only for critical security updates
  'centcom'
);

-- ============================================
-- CENTCOM BRAND - MSI Installer
-- ============================================
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
  '1.0.1',  -- ← UPDATE THIS
  'windows',
  'x64',
  'msi',
  323000000,  -- ← UPDATE THIS
  'PASTE_SHA256_HASH_HERE',  -- ← UPDATE THIS
  'https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.1/Centcom_1.0.1_x64_en-US.msi',  -- ← UPDATE VERSION
  'https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.1',  -- ← UPDATE VERSION
  NOW(),
  true,
  true,
  true,
  false,
  'centcom'
);

-- ============================================
-- LYCEUM BRAND - EXE Installer
-- ============================================
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
  '1.0.1',  -- ← UPDATE THIS
  'windows',
  'x64',
  'exe',
  320000000,  -- ← UPDATE THIS
  'PASTE_SHA256_HASH_HERE',  -- ← UPDATE THIS
  'https://github.com/joshlevylabs/lyceum-releases/releases/download/v1.0.1/Lyceum_1.0.1_x64-setup.exe',  -- ← UPDATE VERSION
  'https://github.com/joshlevylabs/lyceum-releases/releases/tag/v1.0.1',  -- ← UPDATE VERSION
  NOW(),
  true,
  true,
  true,
  false,
  'lyceum'
);

-- ============================================
-- LYCEUM BRAND - MSI Installer
-- ============================================
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
  '1.0.1',  -- ← UPDATE THIS
  'windows',
  'x64',
  'msi',
  323000000,  -- ← UPDATE THIS
  'PASTE_SHA256_HASH_HERE',  -- ← UPDATE THIS
  'https://github.com/joshlevylabs/lyceum-releases/releases/download/v1.0.1/Lyceum_1.0.1_x64_en-US.msi',  -- ← UPDATE VERSION
  'https://github.com/joshlevylabs/lyceum-releases/releases/tag/v1.0.1',  -- ← UPDATE VERSION
  NOW(),
  true,
  true,
  true,
  false,
  'lyceum'
);

-- ============================================
-- VERIFICATION: Check all versions
-- ============================================
SELECT
  version_number,
  brand_type,
  installer_type,
  is_stable,
  auto_update_enabled,
  TO_CHAR(release_date, 'YYYY-MM-DD HH24:MI') as release_date,
  SUBSTRING(download_url FROM 'v[\d\.]+/([^/]+)$') as filename
FROM application_versions
WHERE application_name = 'centcom'
ORDER BY release_date DESC, brand_type, installer_type
LIMIT 8;

-- Expected output: Should see 4 new rows for v1.0.1

-- ============================================
-- TEST: What version will users get?
-- ============================================

-- Centcom users will get:
SELECT
  version_number,
  installer_type,
  release_date
FROM application_versions
WHERE application_name = 'centcom'
  AND platform = 'windows'
  AND brand_type = 'centcom'
  AND is_stable = true
  AND is_supported = true
  AND auto_update_enabled = true
ORDER BY release_date DESC
LIMIT 2;

-- Lyceum users will get:
SELECT
  version_number,
  installer_type,
  release_date
FROM application_versions
WHERE application_name = 'centcom'
  AND platform = 'windows'
  AND brand_type = 'lyceum'
  AND is_stable = true
  AND is_supported = true
  AND auto_update_enabled = true
ORDER BY release_date DESC
LIMIT 2;

-- Both should show v1.0.1 as the first result!

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

/*
-- If something is wrong with v1.0.1, disable auto-update:
UPDATE application_versions
SET auto_update_enabled = false
WHERE version_number = '1.0.1'
  AND application_name = 'centcom';

-- Or mark as unstable:
UPDATE application_versions
SET is_stable = false
WHERE version_number = '1.0.1'
  AND application_name = 'centcom';

-- Or delete completely (not recommended):
DELETE FROM application_versions
WHERE version_number = '1.0.1'
  AND application_name = 'centcom';
*/

-- ============================================
-- NOTES
-- ============================================

-- is_stable:
--   true  = Production ready, will be served to users
--   false = Beta/testing, won't auto-update

-- is_supported:
--   true  = Can be downloaded
--   false = Deprecated, won't show in version list

-- auto_update_enabled:
--   true  = Desktop app will detect and prompt
--   false = Manual download only

-- force_update:
--   true  = Critical security fix, block app usage until updated
--   false = Normal update, user can postpone

-- release_date:
--   - API orders by this DESC (newest first)
--   - Must be newer than previous versions
--   - Use NOW() or specify exact timestamp

-- ============================================
-- CHECKLIST
-- ============================================

-- Before running this script:
-- [ ] Built new version in desktop app repo
-- [ ] Uploaded installers to GitHub releases (both brands)
-- [ ] Calculated file sizes (in bytes)
-- [ ] Calculated SHA256 hashes
-- [ ] Updated version numbers in this file
-- [ ] Updated download URLs in this file
-- [ ] Verified GitHub URLs are accessible

-- After running this script:
-- [ ] Verified 4 new rows inserted
-- [ ] Tested API endpoint returns new version
-- [ ] Tested download URLs work
-- [ ] Notified desktop app team of new release
-- [ ] Updated release notes on GitHub
