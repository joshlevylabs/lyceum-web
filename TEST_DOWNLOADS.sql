-- Test Download System - Verification Scripts

-- ============================================================
-- TEST 1: Verify all 4 versions exist in database
-- ============================================================

SELECT
  version_number,
  platform,
  installer_type,
  brand_type,
  file_size_bytes / 1024 / 1024 as size_mb,
  download_url,
  sha256_hash
FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
ORDER BY brand_type, installer_type;

-- Expected: 4 rows (centcom exe, centcom msi, lyceum exe, lyceum msi)

-- ============================================================
-- TEST 2: Check your test user's organization and brand
-- ============================================================

-- Replace with your actual user ID
DO $$
DECLARE
  test_user_id UUID := '2c3d4747-8d67-45af-90f5-b5e9058ec246';
BEGIN
  -- Show user's organization and brand
  RAISE NOTICE '=== User Organization Info ===';

  PERFORM (
    SELECT RAISE(NOTICE, 'Organization: %, Brand: %', o.name, o.brand_type)
    FROM organization_members om
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = test_user_id
      AND om.status = 'active'
    LIMIT 1
  );

  -- If no organization found
  IF NOT FOUND THEN
    RAISE NOTICE 'No organization found for user. Will default to: lyceum';
  END IF;
END $$;

-- Alternative: Direct query to see user's organization
SELECT
  u.email as user_email,
  o.name as organization_name,
  o.brand_type as organization_brand,
  om.status as membership_status,
  om.role as user_role
FROM auth.users u
LEFT JOIN organization_members om ON u.id = om.user_id AND om.status = 'active'
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- ============================================================
-- TEST 3: Simulate version lookup for Lyceum brand
-- ============================================================

-- This simulates what the API does for a Lyceum user
SELECT
  version_number,
  installer_type,
  download_url,
  file_size_bytes / 1024 / 1024 as size_mb,
  sha256_hash
FROM application_versions
WHERE application_name = 'centcom'
  AND platform = 'windows'
  AND brand_type = 'lyceum'
  AND is_stable = true
ORDER BY release_date DESC
LIMIT 2;

-- Expected: 2 rows (lyceum exe and msi)

-- ============================================================
-- TEST 4: Simulate version lookup for Centcom brand
-- ============================================================

-- This simulates what the API does for a Centcom user
SELECT
  version_number,
  installer_type,
  download_url,
  file_size_bytes / 1024 / 1024 as size_mb,
  sha256_hash
FROM application_versions
WHERE application_name = 'centcom'
  AND platform = 'windows'
  AND brand_type = 'centcom'
  AND is_stable = true
ORDER BY release_date DESC
LIMIT 2;

-- Expected: 2 rows (centcom exe and msi)

-- ============================================================
-- TEST 5: Verify GitHub URLs are accessible
-- ============================================================

-- Copy these URLs and test them in your browser (incognito mode):

-- Centcom MSI:
-- https://github.com/lyceum-platform/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi

-- Centcom EXE:
-- https://github.com/lyceum-platform/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe

-- Lyceum MSI:
-- https://github.com/lyceum-platform/centcom-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64_en-US.msi

-- Lyceum EXE:
-- https://github.com/lyceum-platform/centcom-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64-setup.exe

-- All 4 URLs should start downloading immediately without asking for login

-- ============================================================
-- TEST 6: Create test organizations for both brands
-- ============================================================

-- Create a Lyceum test organization (if needed)
INSERT INTO organizations (name, brand_type)
VALUES ('Lyceum Test Organization', 'lyceum')
ON CONFLICT DO NOTHING
RETURNING id, name, brand_type;

-- Create a Centcom test organization (if needed)
INSERT INTO organizations (name, brand_type)
VALUES ('Centcom Test Organization', 'centcom')
ON CONFLICT DO NOTHING
RETURNING id, name, brand_type;

-- ============================================================
-- TEST 7: Switch your test user's organization brand
-- ============================================================

-- Option A: Change existing organization to Centcom
/*
UPDATE organizations
SET brand_type = 'centcom'
WHERE id = (
  SELECT organization_id
  FROM organization_members
  WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
    AND status = 'active'
  LIMIT 1
)
RETURNING id, name, brand_type;
*/

-- Option B: Change existing organization back to Lyceum
/*
UPDATE organizations
SET brand_type = 'lyceum'
WHERE id = (
  SELECT organization_id
  FROM organization_members
  WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
    AND status = 'active'
  LIMIT 1
)
RETURNING id, name, brand_type;
*/

-- ============================================================
-- TEST 8: Check recent downloads (after testing)
-- ============================================================

SELECT
  ad.created_at,
  u.email as user_email,
  ad.brand_type,
  ad.installer_type,
  ad.platform,
  ad.version,
  ad.status
FROM application_downloads ad
JOIN auth.users u ON ad.user_id = u.id
ORDER BY ad.created_at DESC
LIMIT 10;

-- ============================================================
-- TEST 9: Analytics - Downloads by brand
-- ============================================================

SELECT
  brand_type,
  installer_type,
  COUNT(*) as download_count,
  MAX(created_at) as last_download
FROM application_downloads
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY brand_type, installer_type
ORDER BY brand_type, installer_type;

-- ============================================================
-- TESTING CHECKLIST
-- ============================================================

-- [ ] Run TEST 1 - Verify 4 versions exist
-- [ ] Run TEST 2 - Check user's organization brand
-- [ ] Run TEST 3 - Verify Lyceum versions query works
-- [ ] Run TEST 4 - Verify Centcom versions query works
-- [ ] Run TEST 5 - Test all 4 GitHub URLs in browser
-- [ ] Test Lyceum download from dashboard
-- [ ] Run TEST 7 (Option A) - Switch org to Centcom
-- [ ] Test Centcom download from dashboard
-- [ ] Run TEST 7 (Option B) - Switch org back to Lyceum
-- [ ] Run TEST 8 - Verify downloads were tracked
-- [ ] Install and test both branded applications

-- ============================================================
-- TROUBLESHOOTING
-- ============================================================

-- If user gets wrong brand:
-- 1. Check organization brand: SELECT brand_type FROM organizations WHERE id = 'ORG_ID'
-- 2. Check user membership: SELECT * FROM organization_members WHERE user_id = 'USER_ID'
-- 3. Verify API logs show correct brand detection

-- If download fails:
-- 1. Test GitHub URL directly in browser
-- 2. Check database URLs match GitHub release
-- 3. Verify SHA256 hashes are correct
-- 4. Check Vercel API logs for errors
