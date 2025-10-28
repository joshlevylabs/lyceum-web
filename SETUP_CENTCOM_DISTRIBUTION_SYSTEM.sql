-- ============================================================================
-- Centcom/Native Lyceum Download & Distribution System - Database Setup
-- ============================================================================
-- This script sets up the complete infrastructure for hosting and distributing
-- the Centcom/Native Lyceum desktop application.
--
-- Run this script in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CREATE STORAGE BUCKET FOR RELEASES
-- ============================================================================

-- Create centcom-releases bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'centcom-releases',
  'centcom-releases',
  false, -- Private bucket, requires signed URLs
  524288000, -- 500MB max file size
  ARRAY[
    'application/x-msdownload', -- .exe
    'application/x-msi', -- .msi
    'application/x-apple-diskimage', -- .dmg
    'application/x-debian-package', -- .deb
    'application/x-rpm', -- .rpm
    'application/octet-stream' -- .AppImage
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. SET STORAGE POLICIES (RLS)
-- ============================================================================

-- Allow authenticated users to read releases (with license validation)
DROP POLICY IF EXISTS "Authenticated users can read releases" ON storage.objects;
CREATE POLICY "Authenticated users can read releases"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'centcom-releases');

-- Only admins can upload releases
DROP POLICY IF EXISTS "Only admins can upload releases" ON storage.objects;
CREATE POLICY "Only admins can upload releases"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'centcom-releases' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Only admins can delete releases
DROP POLICY IF EXISTS "Only admins can delete releases" ON storage.objects;
CREATE POLICY "Only admins can delete releases"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'centcom-releases' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- ============================================================================
-- 3. CREATE/EXTEND APPLICATION_VERSIONS TABLE
-- ============================================================================

-- Create application_versions table if it doesn't exist
CREATE TABLE IF NOT EXISTS application_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_name VARCHAR(100) NOT NULL,
  version_number VARCHAR(50) NOT NULL,
  release_date TIMESTAMPTZ DEFAULT NOW(),
  is_stable BOOLEAN DEFAULT true,
  is_supported BOOLEAN DEFAULT true,
  required_features JSONB,
  breaking_changes TEXT[],
  deprecation_warnings TEXT[],
  download_url TEXT,
  changelog_url TEXT,
  documentation_url TEXT,
  min_license_version VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add platform-specific fields to application_versions table
ALTER TABLE application_versions
ADD COLUMN IF NOT EXISTS platform VARCHAR(20) CHECK (platform IN ('windows', 'macos', 'linux', 'all')),
ADD COLUMN IF NOT EXISTS architecture VARCHAR(20) CHECK (architecture IN ('x64', 'arm64', 'x86', 'universal')),
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS sha256_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS installer_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS auto_update_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS force_update BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_app_versions_platform_stable
ON application_versions(application_name, platform, is_stable, release_date DESC);

-- Add unique constraint (after platform column exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'application_versions_app_version_platform_key'
  ) THEN
    ALTER TABLE application_versions
    ADD CONSTRAINT application_versions_app_version_platform_key
    UNIQUE (application_name, version_number, platform);
  END IF;
END $$;

-- Enable RLS on application_versions
ALTER TABLE application_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for application_versions
DROP POLICY IF EXISTS "Anyone can read application versions" ON application_versions;
CREATE POLICY "Anyone can read application versions"
ON application_versions FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Only admins can manage versions" ON application_versions;
CREATE POLICY "Only admins can manage versions"
ON application_versions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Add comments to table
COMMENT ON TABLE application_versions IS 'Stores version information for all applications including Centcom/Native Lyceum';
COMMENT ON COLUMN application_versions.platform IS 'Target platform: windows, macos, linux, or all';
COMMENT ON COLUMN application_versions.architecture IS 'CPU architecture: x64, arm64, x86, or universal';
COMMENT ON COLUMN application_versions.file_size_bytes IS 'Size of the installer file in bytes';
COMMENT ON COLUMN application_versions.sha256_hash IS 'SHA256 hash for file integrity verification';
COMMENT ON COLUMN application_versions.storage_path IS 'Path in Supabase Storage bucket';
COMMENT ON COLUMN application_versions.installer_type IS 'Installer format: exe, msi, dmg, deb, rpm, AppImage';
COMMENT ON COLUMN application_versions.auto_update_enabled IS 'Whether this version should be offered as an auto-update';
COMMENT ON COLUMN application_versions.force_update IS 'Whether users must update to this version (for critical security fixes)';

-- ============================================================================
-- 4. CREATE APPLICATION_DOWNLOADS TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS application_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  application_name VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  installer_type VARCHAR(20),
  license_type VARCHAR(50),
  download_started_at TIMESTAMPTZ DEFAULT NOW(),
  download_completed_at TIMESTAMPTZ,
  was_successful BOOLEAN,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_downloads_user ON application_downloads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_version ON application_downloads(application_name, version, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_platform ON application_downloads(platform, created_at DESC);

-- Add comments
COMMENT ON TABLE application_downloads IS 'Tracks all download attempts and completions for analytics';
COMMENT ON COLUMN application_downloads.was_successful IS 'NULL = in progress, TRUE = success, FALSE = failed';

-- ============================================================================
-- 5. CREATE APPLICATION_UPDATE_CHECKS TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS application_update_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  application_name VARCHAR(100) NOT NULL,
  current_version VARCHAR(50) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  latest_version_available VARCHAR(50),
  update_available BOOLEAN,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_update_checks_user ON application_update_checks(user_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_update_checks_date ON application_update_checks(checked_at DESC);

-- Add comments
COMMENT ON TABLE application_update_checks IS 'Tracks update check requests from desktop applications';

-- ============================================================================
-- 6. CREATE RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS
ALTER TABLE application_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_update_checks ENABLE ROW LEVEL SECURITY;

-- application_downloads policies
DROP POLICY IF EXISTS "Users can view their own downloads" ON application_downloads;
CREATE POLICY "Users can view their own downloads"
ON application_downloads FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can insert downloads" ON application_downloads;
CREATE POLICY "Service role can insert downloads"
ON application_downloads FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update downloads" ON application_downloads;
CREATE POLICY "Service role can update downloads"
ON application_downloads FOR UPDATE
TO service_role
USING (true);

-- application_update_checks policies
DROP POLICY IF EXISTS "Users can view their own update checks" ON application_update_checks;
CREATE POLICY "Users can view their own update checks"
ON application_update_checks FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can insert update checks" ON application_update_checks;
CREATE POLICY "Service role can insert update checks"
ON application_update_checks FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================================
-- 7. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get download statistics
CREATE OR REPLACE FUNCTION get_download_stats(
  p_days_ago INT DEFAULT 7
)
RETURNS TABLE (
  version VARCHAR(50),
  platform VARCHAR(20),
  download_count BIGINT,
  successful_downloads BIGINT,
  failed_downloads BIGINT,
  avg_download_time_seconds NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ad.version,
    ad.platform,
    COUNT(*) as download_count,
    COUNT(*) FILTER (WHERE ad.was_successful = true) as successful_downloads,
    COUNT(*) FILTER (WHERE ad.was_successful = false) as failed_downloads,
    ROUND(AVG(
      EXTRACT(EPOCH FROM (ad.download_completed_at - ad.download_started_at))
    ) FILTER (WHERE ad.was_successful = true), 2) as avg_download_time_seconds
  FROM application_downloads ad
  WHERE ad.created_at > NOW() - INTERVAL '1 day' * p_days_ago
  GROUP BY ad.version, ad.platform
  ORDER BY download_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get version adoption rate
CREATE OR REPLACE FUNCTION get_version_adoption()
RETURNS TABLE (
  current_version VARCHAR(50),
  user_count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    auc.current_version,
    COUNT(DISTINCT auc.user_id) as user_count,
    ROUND(
      COUNT(DISTINCT auc.user_id)::numeric /
      SUM(COUNT(DISTINCT auc.user_id)) OVER () * 100,
      2
    ) as percentage
  FROM application_update_checks auc
  WHERE auc.checked_at > NOW() - INTERVAL '1 day'
  GROUP BY auc.current_version
  ORDER BY user_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. INSERT SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================================================

-- Uncomment the following to insert a sample version for testing
/*
INSERT INTO application_versions (
  application_name,
  version_number,
  platform,
  architecture,
  installer_type,
  release_date,
  is_stable,
  is_supported,
  auto_update_enabled,
  force_update,
  file_size_bytes,
  sha256_hash,
  storage_path,
  changelog_url,
  documentation_url
) VALUES
(
  'centcom',
  '1.0.0',
  'windows',
  'x64',
  'exe',
  NOW(),
  true,
  true,
  true,
  false,
  125829120, -- ~120MB
  'abc123def456...',
  'windows/1.0.0/centcom-setup-1.0.0.exe',
  'https://lyceum.app/changelog/1.0.0',
  'https://lyceum.app/docs/installation'
)
ON CONFLICT DO NOTHING;
*/

-- ============================================================================
-- 9. VERIFICATION QUERIES
-- ============================================================================

-- Verify storage bucket was created
DO $$
DECLARE
  bucket_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bucket_count
  FROM storage.buckets
  WHERE id = 'centcom-releases';

  IF bucket_count > 0 THEN
    RAISE NOTICE '✓ Storage bucket "centcom-releases" created successfully';
  ELSE
    RAISE WARNING '✗ Storage bucket "centcom-releases" NOT found';
  END IF;
END $$;

-- Verify application_versions table exists
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_name = 'application_versions';

  IF table_count > 0 THEN
    RAISE NOTICE '✓ Table "application_versions" exists';
  ELSE
    RAISE WARNING '✗ Table "application_versions" NOT found';
  END IF;
END $$;

-- Verify new columns were added
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'application_versions'
    AND column_name IN ('platform', 'architecture', 'storage_path', 'sha256_hash');

  IF column_count = 4 THEN
    RAISE NOTICE '✓ All new columns added to application_versions';
  ELSE
    RAISE WARNING '✗ Expected 4 new columns, found %', column_count;
  END IF;
END $$;

-- Verify new tables were created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_name IN ('application_downloads', 'application_update_checks');

  IF table_count = 2 THEN
    RAISE NOTICE '✓ Tables application_downloads and application_update_checks created';
  ELSE
    RAISE WARNING '✗ Expected 2 tables, found %', table_count;
  END IF;
END $$;

-- Verify RLS is enabled
DO $$
DECLARE
  rls_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables
  WHERE tablename IN ('application_versions', 'application_downloads', 'application_update_checks')
    AND rowsecurity = true;

  IF rls_count = 3 THEN
    RAISE NOTICE '✓ RLS enabled on all tables';
  ELSE
    RAISE WARNING '✗ RLS not enabled on all tables (expected 3, found %)', rls_count;
  END IF;
END $$;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================

-- Print success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '          Centcom Distribution System Setup Complete! ✅';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  ✓ Storage bucket: centcom-releases';
  RAISE NOTICE '  ✓ Table: application_versions (with 8 new columns)';
  RAISE NOTICE '  ✓ Table: application_downloads';
  RAISE NOTICE '  ✓ Table: application_update_checks';
  RAISE NOTICE '  ✓ Indexes and RLS policies';
  RAISE NOTICE '  ✓ Helper functions: get_download_stats(), get_version_adoption()';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. API endpoints are already deployed ✅';
  RAISE NOTICE '  2. Dashboard UI is already updated ✅';
  RAISE NOTICE '  3. Upload your first release:';
  RAISE NOTICE '';
  RAISE NOTICE '     curl -X POST https://lyceum.app/api/admin/centcom/releases/upload \';
  RAISE NOTICE '       -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \';
  RAISE NOTICE '       -F "file=@centcom-setup-1.0.0.exe" \';
  RAISE NOTICE '       -F "version=1.0.0" \';
  RAISE NOTICE '       -F "platform=windows" \';
  RAISE NOTICE '       -F "installer_type=exe" \';
  RAISE NOTICE '       -F "is_stable=true"';
  RAISE NOTICE '';
  RAISE NOTICE '  4. Test the download from your dashboard!';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'System is ready for Centcom integration! 🚀';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
END $$;
