-- Check application versions in database
-- This will show what versions are available and their status

-- Check if application_versions table exists
SELECT '=== TABLE EXISTS ===' as section;
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'application_versions')
    THEN '✅ application_versions table exists'
    ELSE '❌ application_versions table does NOT exist'
  END as status;

-- Show all versions for the user's brand
SELECT '=== ALL VERSIONS FOR YOUR BRAND ===' as section;
SELECT
  id,
  application_name,
  version_number,
  platform,
  brand_type,
  is_stable,
  is_supported,
  auto_update_enabled,
  release_date,
  storage_path,
  download_url,
  created_at
FROM application_versions
WHERE application_name = 'centcom'
  AND platform = 'windows'
  AND brand_type = (
    SELECT CASE
      WHEN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = (SELECT id FROM auth.users WHERE email = 'josh@thelyceum.io')
          AND (
            LOWER(company) LIKE '%centcom%' OR
            LOWER(company) LIKE '%sonance%' OR
            LOWER(company) LIKE '%blaze%' OR
            LOWER(company) LIKE '%iport%' OR
            LOWER(company) LIKE '%danainnovations%' OR
            LOWER(company) LIKE '%dana innovations%' OR
            LOWER(company) LIKE '%james%' OR
            LOWER(company) LIKE '%trufig%'
          )
      )
      THEN 'centcom'
      ELSE 'lyceum'
    END
  )
ORDER BY release_date DESC;

-- Show what version would be returned by the API
SELECT '=== LATEST VERSION (API RESULT) ===' as section;
SELECT
  version_number,
  platform,
  brand_type,
  is_stable,
  is_supported,
  auto_update_enabled,
  release_date,
  installer_type,
  CASE
    WHEN is_stable = true AND is_supported = true AND auto_update_enabled = true
    THEN '✅ This version will be served'
    ELSE '❌ This version will NOT be served (check flags)'
  END as api_status
FROM application_versions
WHERE application_name = 'centcom'
  AND platform = 'windows'
  AND brand_type = (
    SELECT CASE
      WHEN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = (SELECT id FROM auth.users WHERE email = 'josh@thelyceum.io')
          AND (
            LOWER(company) LIKE '%centcom%' OR
            LOWER(company) LIKE '%sonance%' OR
            LOWER(company) LIKE '%blaze%' OR
            LOWER(company) LIKE '%iport%' OR
            LOWER(company) LIKE '%danainnovations%' OR
            LOWER(company) LIKE '%dana innovations%' OR
            LOWER(company) LIKE '%james%' OR
            LOWER(company) LIKE '%trufig%'
          )
      )
      THEN 'centcom'
      ELSE 'lyceum'
    END
  )
  AND is_stable = true
  AND is_supported = true
  AND auto_update_enabled = true
ORDER BY release_date DESC
LIMIT 1;

-- Count versions by status
SELECT '=== VERSION COUNTS BY STATUS ===' as section;
SELECT
  COUNT(*) FILTER (WHERE is_stable = true AND is_supported = true AND auto_update_enabled = true) as available_versions,
  COUNT(*) FILTER (WHERE is_stable = false) as unstable_versions,
  COUNT(*) FILTER (WHERE is_supported = false) as unsupported_versions,
  COUNT(*) FILTER (WHERE auto_update_enabled = false) as update_disabled_versions,
  COUNT(*) as total_versions
FROM application_versions
WHERE application_name = 'centcom'
  AND platform = 'windows';

-- Diagnosis
SELECT '=== DIAGNOSIS ===' as section;
SELECT
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'application_versions')
    THEN '❌ application_versions table does not exist. You need to create it and add version records.'

    WHEN NOT EXISTS (
      SELECT 1 FROM application_versions
      WHERE application_name = 'centcom'
        AND platform = 'windows'
        AND is_stable = true
        AND is_supported = true
        AND auto_update_enabled = true
    )
    THEN '❌ No versions available for download. Either: 1) Add version records, OR 2) Set is_stable=true, is_supported=true, auto_update_enabled=true on existing versions'

    ELSE '✅ Versions exist and should be downloadable. Check if the storage_path or download_url points to the correct files.'
  END as diagnosis;
