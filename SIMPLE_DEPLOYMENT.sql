-- SIMPLE DEPLOYMENT - Using user_profiles.company for Brand Detection
-- Repository: lyceum-platform/centcom-releases
-- Brand logic: company contains ANY of these → Centcom, else → Lyceum
--   - Centcom
--   - Sonance
--   - Blaze
--   - iPort
--   - Danainnovations / Dana Innovations
--   - James
--   - Trufig

-- ============================================================
-- STEP 1: Add brand_type to application_versions only
-- ============================================================

-- Add brand_type column
ALTER TABLE application_versions
ADD COLUMN IF NOT EXISTS brand_type TEXT DEFAULT 'lyceum'
CHECK (brand_type IN ('lyceum', 'centcom'));

-- Drop old unique constraint (if exists)
ALTER TABLE application_versions
DROP CONSTRAINT IF EXISTS application_versions_app_version_platform_installer_key;

-- Add new unique constraint including brand_type
ALTER TABLE application_versions
ADD CONSTRAINT application_versions_unique_version
UNIQUE (application_name, version_number, platform, installer_type, brand_type);

-- Create index for brand lookups
CREATE INDEX IF NOT EXISTS idx_application_versions_brand
ON application_versions(brand_type, platform, release_date DESC);

-- Add brand_type to application_downloads (for analytics)
ALTER TABLE application_downloads
ADD COLUMN IF NOT EXISTS brand_type TEXT;

CREATE INDEX IF NOT EXISTS idx_application_downloads_brand
ON application_downloads(brand_type, created_at);

-- ============================================================
-- STEP 2: Delete old records and insert all 4 branded versions
-- ============================================================

-- Delete any existing v1.0.0 records
DELETE FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0';

-- Insert Centcom MSI version
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
  '1.0.0',
  'windows',
  'x64',
  'msi',
  323946496, -- ~309 MB
  'C5020E23F74B9DC4B235F865F3D6C28F928F49B44E0E24DC65BAA0718C28A026',
  'https://github.com/lyceum-platform/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi',
  'https://github.com/lyceum-platform/centcom-releases/releases/tag/v1.0.0',
  NOW(),
  true,
  true,
  true,
  false,
  'centcom'
);

-- Insert Centcom EXE version
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
  '1.0.0',
  'windows',
  'x64',
  'exe',
  319815680, -- ~305 MB
  'D8C72E9ABB1A0B5C15FDFC37C0908C3F536B85B4A8492F46B7319DF357A70941',
  'https://github.com/lyceum-platform/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe',
  'https://github.com/lyceum-platform/centcom-releases/releases/tag/v1.0.0',
  NOW(),
  true,
  true,
  true,
  false,
  'centcom'
);

-- Insert Lyceum MSI version
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
  '1.0.0',
  'windows',
  'x64',
  'msi',
  323946496, -- ~309 MB
  '6D090766EB932ED33428F5396C357803480CA029977131E972435DED52B154A4',
  'https://github.com/lyceum-platform/centcom-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64_en-US.msi',
  'https://github.com/lyceum-platform/centcom-releases/releases/tag/v1.0.0',
  NOW(),
  true,
  true,
  true,
  false,
  'lyceum'
);

-- Insert Lyceum EXE version
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
  '1.0.0',
  'windows',
  'x64',
  'exe',
  320864256, -- ~306 MB
  '43FF3FCDC9AED5502900192573523406247F230BF767AF3BCC281D242EB5A0C1',
  'https://github.com/lyceum-platform/centcom-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64-setup.exe',
  'https://github.com/lyceum-platform/centcom-releases/releases/tag/v1.0.0',
  NOW(),
  true,
  true,
  true,
  false,
  'lyceum'
);

-- ============================================================
-- STEP 3: Verify all versions are correct
-- ============================================================

SELECT
  version_number,
  platform,
  installer_type,
  brand_type,
  file_size_bytes / 1024 / 1024 as size_mb,
  SUBSTRING(download_url FROM 'github.com/.*/([^/]+)$') as filename,
  SUBSTRING(sha256_hash FROM 1 FOR 16) || '...' as hash_preview
FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
ORDER BY brand_type, installer_type;

-- Expected output: 4 rows
-- 1.0.0 | windows | exe | centcom | 305 | Centcom_1.0.0_x64-setup.exe  | D8C72E9ABB1A0B5C...
-- 1.0.0 | windows | msi | centcom | 309 | Centcom_1.0.0_x64_en-US.msi  | C5020E23F74B9DC4...
-- 1.0.0 | windows | exe | lyceum  | 306 | Lyceum_1.0.0_x64-setup.exe   | 43FF3FCDC9AED550...
-- 1.0.0 | windows | msi | lyceum  | 309 | Lyceum_1.0.0_x64_en-US.msi   | 6D090766EB932ED3...

-- ============================================================
-- STEP 4: Check user_profiles.company field
-- ============================================================

-- See what companies exist
SELECT
  company,
  COUNT(*) as user_count
FROM user_profiles
WHERE company IS NOT NULL
GROUP BY company
ORDER BY user_count DESC;

-- Check your test user's company
SELECT
  id,
  email,
  full_name,
  company,
  CASE
    WHEN LOWER(company) LIKE '%centcom%' THEN 'centcom'
    WHEN LOWER(company) LIKE '%sonance%' THEN 'centcom'
    WHEN LOWER(company) LIKE '%blaze%' THEN 'centcom'
    WHEN LOWER(company) LIKE '%iport%' THEN 'centcom'
    WHEN LOWER(company) LIKE '%danainnovations%' THEN 'centcom'
    WHEN LOWER(company) LIKE '%dana innovations%' THEN 'centcom'
    WHEN LOWER(company) LIKE '%james%' THEN 'centcom'
    WHEN LOWER(company) LIKE '%trufig%' THEN 'centcom'
    ELSE 'lyceum'
  END as detected_brand
FROM user_profiles
WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- ============================================================
-- DEPLOYMENT COMPLETE!
-- ============================================================

-- Summary:
-- ✅ Added brand_type to application_versions
-- ✅ Inserted 4 version records (Centcom MSI/EXE + Lyceum MSI/EXE)
-- ✅ All download URLs point to lyceum-platform/centcom-releases
-- ✅ All SHA256 hashes match the actual built files
-- ✅ Using user_profiles.company for brand detection

-- Brand Detection Logic:
-- - If user_profiles.company contains ANY of these (case-insensitive) → Centcom brand:
--   * Centcom, Sonance, Blaze, iPort, Danainnovations, Dana Innovations, James, Trufig
-- - Otherwise → Lyceum brand (default)

-- Next steps:
-- 1. Deploy updated API code with company-based brand detection
-- 2. Test Lyceum user download (company = NULL or not 'centcom')
-- 3. Test Centcom user download (company contains 'centcom')
-- 4. Verify installers work correctly
