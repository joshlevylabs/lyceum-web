-- ============================================================================
-- Fix Supabase Storage Size Limit for Centcom Releases
-- ============================================================================
-- The default upload limit is too small for 300MB installers
-- This script increases the bucket size limit to 500MB
-- ============================================================================

-- Check current bucket configuration
SELECT
  id,
  name,
  public,
  file_size_limit,
  ROUND(file_size_limit / 1024.0 / 1024.0, 2) as "Size Limit (MB)"
FROM storage.buckets
WHERE id = 'centcom-releases';

-- Update the bucket to allow 500MB files
UPDATE storage.buckets
SET file_size_limit = 524288000  -- 500 MB in bytes
WHERE id = 'centcom-releases';

-- Verify the change
SELECT
  id,
  name,
  file_size_limit,
  ROUND(file_size_limit / 1024.0 / 1024.0, 2) as "Size Limit (MB)"
FROM storage.buckets
WHERE id = 'centcom-releases';

-- Expected output:
-- id                | name              | file_size_limit | Size Limit (MB)
-- centcom-releases  | centcom-releases  | 524288000       | 500.00
