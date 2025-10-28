-- ============================================================================
-- Fix Unique Constraint and Insert Centcom v1.0.0 Records
-- ============================================================================
-- The current constraint doesn't allow multiple installer types per version
-- This fixes the constraint to include installer_type, then inserts records
-- ============================================================================

-- Step 1: Delete any existing centcom 1.0.0 records
DELETE FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0';

-- Step 2: Drop the old constraint (it's too restrictive)
ALTER TABLE application_versions
DROP CONSTRAINT IF EXISTS application_versions_app_version_platform_key;

-- Step 3: Create a new constraint that includes installer_type
-- This allows multiple installer types (msi, exe, dmg, etc.) for the same version/platform
ALTER TABLE application_versions
ADD CONSTRAINT application_versions_app_version_platform_installer_key
UNIQUE (application_name, version_number, platform, installer_type);

-- Verify constraint was created
SELECT
  conname as "Constraint Name",
  pg_get_constraintdef(oid) as "Definition"
FROM pg_constraint
WHERE conname LIKE '%application_versions%'
  AND contype = 'u';

-- ============================================================================
-- Step 4: Insert MSI Version
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
  323946496,  -- 309 MB in bytes
  '420F252125B7297AE49F7138EB2879E4A372955CAC6C3C0B2E789E41A88F31E0',
  'https://github.com/joshlevylabs/datacenter/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi',
  'https://github.com/joshlevylabs/datacenter/releases/tag/v1.0.0',
  NOW(),
  true,
  true,
  true,
  false
);

-- ============================================================================
-- Step 5: Insert EXE Version
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
  320586752,  -- 306 MB in bytes
  'AE1BE4E5BE6AA8177C5CA6F335BC63C88607AE79A83590139A477E802DA5B287',
  'https://github.com/joshlevylabs/datacenter/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe',
  'https://github.com/joshlevylabs/datacenter/releases/tag/v1.0.0',
  NOW(),
  true,
  true,
  true,
  false
);

-- ============================================================================
-- Step 6: Verify Records
-- ============================================================================

SELECT
  id,
  application_name,
  version_number,
  platform,
  installer_type,
  ROUND(file_size_bytes / 1024.0 / 1024.0, 2) as "Size (MB)",
  SUBSTRING(sha256_hash, 1, 16) || '...' as "SHA256 (truncated)",
  download_url,
  is_stable,
  auto_update_enabled,
  release_date
FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
ORDER BY installer_type;

-- Expected output: 2 rows
-- Row 1 (exe): https://github.com/joshlevylabs/datacenter/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe
-- Row 2 (msi): https://github.com/joshlevylabs/datacenter/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi

-- ============================================================================
-- Step 7: Test API Query
-- ============================================================================

-- Simulate what the API will query for latest version
SELECT
  version_number,
  platform,
  installer_type,
  download_url,
  SUBSTRING(sha256_hash, 1, 16) || '...' as "SHA256",
  ROUND(file_size_bytes / 1024.0 / 1024.0, 2) as "Size (MB)"
FROM application_versions
WHERE application_name = 'centcom'
  AND platform = 'windows'
  AND is_stable = true
  AND is_supported = true
  AND auto_update_enabled = true
ORDER BY release_date DESC, installer_type
LIMIT 2;

-- Should show both installers with correct GitHub URLs

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '  ✅ Centcom v1.0.0 Records Created Successfully!';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  ✓ MSI installer record (309 MB)';
  RAISE NOTICE '  ✓ EXE installer record (306 MB)';
  RAISE NOTICE '  ✓ Fixed unique constraint to allow multiple installer types';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Go to https://thelyceum.io/dashboard';
  RAISE NOTICE '  2. Look for "Desktop Application" card';
  RAISE NOTICE '  3. Click "Download Centcom"';
  RAISE NOTICE '  4. Select MSI or EXE';
  RAISE NOTICE '  5. Test the download!';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
END $$;
