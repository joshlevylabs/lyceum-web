-- Migration Script: Switch from Unified Repo to Separate Brand Repos
-- From: joshlevylabs/datacenter-releases (unified)
-- To:   joshlevylabs/centcom-releases (Centcom brand)
--       joshlevylabs/lyceum-releases (Lyceum brand)

-- ============================================================
-- IMPORTANT: Before running this script
-- ============================================================
-- 1. Upload Centcom_1.0.0_x64-setup.exe to centcom-releases
--    (Currently missing - only has "Centcom.exe" with wrong name)
-- 2. Verify all 4 files are present:
--    - centcom-releases: Centcom_1.0.0_x64-setup.exe, Centcom_1.0.0_x64_en-US.msi
--    - lyceum-releases: Lyceum_1.0.0_x64-setup.exe, Lyceum_1.0.0_x64_en-US.msi

-- ============================================================
-- STEP 1: Backup current URLs (for safety)
-- ============================================================
CREATE TEMP TABLE IF NOT EXISTS url_backup AS
SELECT
  version_number,
  platform,
  installer_type,
  brand_type,
  download_url as old_url
FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0';

-- View backup
SELECT * FROM url_backup;

-- ============================================================
-- STEP 2: Update Centcom branded URLs
-- ============================================================

-- Update Centcom EXE installer
UPDATE application_versions
SET
  download_url = 'https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe',
  changelog_url = 'https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.0'
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
  AND platform = 'windows'
  AND installer_type = 'exe'
  AND brand_type = 'centcom';

-- Update Centcom MSI installer
UPDATE application_versions
SET
  download_url = 'https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi',
  changelog_url = 'https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.0'
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
  AND platform = 'windows'
  AND installer_type = 'msi'
  AND brand_type = 'centcom';

-- ============================================================
-- STEP 3: Update Lyceum branded URLs
-- ============================================================

-- Update Lyceum EXE installer
UPDATE application_versions
SET
  download_url = 'https://github.com/joshlevylabs/lyceum-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64-setup.exe',
  changelog_url = 'https://github.com/joshlevylabs/lyceum-releases/releases/tag/v1.0.0'
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
  AND platform = 'windows'
  AND installer_type = 'exe'
  AND brand_type = 'lyceum';

-- Update Lyceum MSI installer
UPDATE application_versions
SET
  download_url = 'https://github.com/joshlevylabs/lyceum-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64_en-US.msi',
  changelog_url = 'https://github.com/joshlevylabs/lyceum-releases/releases/tag/v1.0.0'
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
  AND platform = 'windows'
  AND installer_type = 'msi'
  AND brand_type = 'lyceum';

-- ============================================================
-- STEP 4: Verify all URLs are updated correctly
-- ============================================================

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

-- Expected output: 4 rows with correct URLs
-- ┌─────────┬──────────┬───────────────┬────────────┬────────────────────────────────────────────────────────────────────────┐
-- │ version │ platform │ installer_type│ brand_type │ download_url                                                           │
-- ├─────────┼──────────┼───────────────┼────────────┼────────────────────────────────────────────────────────────────────────┤
-- │ 1.0.0   │ windows  │ exe           │ centcom    │ https://github.com/joshlevylabs/centcom-releases/.../Centcom...exe     │
-- │ 1.0.0   │ windows  │ msi           │ centcom    │ https://github.com/joshlevylabs/centcom-releases/.../Centcom...msi     │
-- │ 1.0.0   │ windows  │ exe           │ lyceum     │ https://github.com/joshlevylabs/lyceum-releases/.../Lyceum...exe       │
-- │ 1.0.0   │ windows  │ msi           │ lyceum     │ https://github.com/joshlevylabs/lyceum-releases/.../Lyceum...msi       │
-- └─────────┴──────────┴───────────────┴────────────┴────────────────────────────────────────────────────────────────────────┘

-- ============================================================
-- STEP 5: Test download URLs (optional manual verification)
-- ============================================================

-- Copy these URLs and test in browser:
SELECT
  brand_type,
  installer_type,
  download_url as test_url
FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
ORDER BY brand_type, installer_type;

-- ============================================================
-- STEP 6: Rollback procedure (if needed)
-- ============================================================

/*
-- If something goes wrong, restore from backup:

UPDATE application_versions av
SET download_url = ub.old_url
FROM url_backup ub
WHERE av.version_number = ub.version_number
  AND av.platform = ub.platform
  AND av.installer_type = ub.installer_type
  AND av.brand_type = ub.brand_type;
*/

-- ============================================================
-- MIGRATION COMPLETE!
-- ============================================================

-- Summary of changes:
-- ✅ Centcom EXE → centcom-releases/Centcom_1.0.0_x64-setup.exe
-- ✅ Centcom MSI → centcom-releases/Centcom_1.0.0_x64_en-US.msi
-- ✅ Lyceum EXE → lyceum-releases/Lyceum_1.0.0_x64-setup.exe
-- ✅ Lyceum MSI → lyceum-releases/Lyceum_1.0.0_x64_en-US.msi

-- Next steps:
-- 1. Test downloads from the Lyceum dashboard
-- 2. Verify both Centcom and Lyceum users get correct installers
-- 3. Update any documentation referencing the old repo
-- 4. (Optional) Archive or deprecate datacenter-releases repo
