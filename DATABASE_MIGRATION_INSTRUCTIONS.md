# Database Migration Instructions - FIXED ✅

**Issue Resolved:** The `application_versions` table is now created automatically if it doesn't exist.

---

## Quick Start

### Step 1: Run the Migration Script

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Open the file: `SETUP_CENTCOM_DISTRIBUTION_SYSTEM.sql`
4. Click **"Run"**

**Expected Output:**
```
✓ Storage bucket "centcom-releases" created successfully
✓ Table "application_versions" exists
✓ All new columns added to application_versions
✓ Tables application_downloads and application_update_checks created
✓ RLS enabled on all tables

============================================================================
          Centcom Distribution System Setup Complete! ✅
============================================================================

Created:
  ✓ Storage bucket: centcom-releases
  ✓ Table: application_versions (with 8 new columns)
  ✓ Table: application_downloads
  ✓ Table: application_update_checks
  ✓ Indexes and RLS policies
  ✓ Helper functions: get_download_stats(), get_version_adoption()
```

---

## What Was Fixed

### Original Error:
```
ERROR: 42P01: relation "application_versions" does not exist
```

### Solution Applied:
The migration script now:
1. **Creates** the `application_versions` table if it doesn't exist
2. **Adds** all necessary columns for Centcom distribution
3. **Sets up** RLS policies for security
4. **Creates** tracking tables for analytics
5. **Adds** helper functions for monitoring

---

## What Gets Created

### 1. Storage Infrastructure
- **Bucket**: `centcom-releases` (500MB max file size)
- **Policies**: Authenticated users can read, only admins can write
- **Structure**: Organized by platform/version

### 2. Database Tables

#### `application_versions`
**Purpose:** Store version metadata for all applications

**Columns:**
- `id` - UUID primary key
- `application_name` - Name of the application (e.g., "centcom")
- `version_number` - Semantic version (e.g., "1.0.0")
- `platform` - Target OS: windows, macos, linux, or all
- `architecture` - CPU arch: x64, arm64, x86, universal
- `file_size_bytes` - Installer file size
- `sha256_hash` - File integrity hash
- `storage_path` - Path in Supabase Storage
- `installer_type` - Format: exe, msi, dmg, deb, rpm, AppImage
- `release_date` - When released
- `is_stable` - Production vs beta flag
- `is_supported` - Still maintained
- `auto_update_enabled` - Offer as auto-update
- `force_update` - Require update (for security fixes)
- `changelog_url` - Release notes link
- `documentation_url` - Docs link
- Plus standard metadata fields

#### `application_downloads`
**Purpose:** Track all download attempts for analytics

**Columns:**
- `id` - UUID primary key
- `user_id` - Who downloaded
- `application_name` - What application
- `version` - What version
- `platform` - What OS
- `installer_type` - What format
- `license_type` - User's license level
- `download_started_at` - When started
- `download_completed_at` - When finished
- `was_successful` - Success/failure flag
- `error_message` - If failed, why
- `ip_address` - User's IP
- `user_agent` - Browser/app info

#### `application_update_checks`
**Purpose:** Monitor update check frequency

**Columns:**
- `id` - UUID primary key
- `user_id` - Who checked
- `application_name` - What application
- `current_version` - User's current version
- `platform` - User's OS
- `latest_version_available` - Latest version found
- `update_available` - Was update available
- `checked_at` - When checked
- `ip_address` - User's IP
- `user_agent` - App info

### 3. Helper Functions

**`get_download_stats(days_ago INT)`**
- Returns download statistics by version/platform
- Shows success rates and average download times

**`get_version_adoption()`**
- Returns current version distribution
- Shows % of users on each version

---

## Verification

After running the migration, verify everything is set up:

### Check Storage Bucket
```sql
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'centcom-releases';
```

**Expected:** 1 row with `centcom-releases` bucket

### Check Tables
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name IN (
  'application_versions',
  'application_downloads',
  'application_update_checks'
);
```

**Expected:** 3 rows

### Check RLS Policies
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN (
  'application_versions',
  'application_downloads',
  'application_update_checks'
);
```

**Expected:** At least 6 policies

### Check Helper Functions
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'get_download_stats',
  'get_version_adoption'
);
```

**Expected:** 2 functions

---

## Next Steps

### 1. Upload Your First Release

**Option A: Using API (Recommended)**

```bash
curl -X POST https://lyceum.app/api/admin/centcom/releases/upload \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@centcom-setup-1.0.0.exe" \
  -F "version=1.0.0" \
  -F "platform=windows" \
  -F "installer_type=exe" \
  -F "is_stable=true" \
  -F "architecture=x64"
```

**Option B: Manual Upload**

1. Go to Supabase Dashboard → Storage → `centcom-releases`
2. Create folder structure: `windows/1.0.0/`
3. Upload `centcom-setup-1.0.0.exe`
4. Insert record into `application_versions`:

```sql
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
  storage_path
) VALUES (
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
  125829120,  -- Replace with actual file size in bytes
  'YOUR_SHA256_HASH_HERE',  -- Calculate using sha256sum or certutil
  'windows/1.0.0/centcom-setup-1.0.0.exe'
);
```

### 2. Test the Download

1. Log in to your dashboard at `https://lyceum.app/dashboard`
2. Look for the **"Desktop Application"** card (purple/indigo gradient)
3. Click **"Download Centcom"**
4. Verify the modal opens with your platform detected
5. Click the installer button (e.g., "Setup.exe (Recommended)")
6. Verify the file downloads

### 3. Verify in Database

```sql
-- Check version was inserted
SELECT * FROM application_versions
WHERE application_name = 'centcom'
ORDER BY release_date DESC;

-- Check download was tracked
SELECT * FROM application_downloads
ORDER BY created_at DESC
LIMIT 5;
```

---

## Calculating SHA256 Hash

### Windows (PowerShell)
```powershell
Get-FileHash centcom-setup-1.0.0.exe -Algorithm SHA256
```

### Windows (Command Prompt)
```cmd
certutil -hashfile centcom-setup-1.0.0.exe SHA256
```

### macOS / Linux
```bash
shasum -a 256 centcom-1.0.0.dmg
# or
sha256sum centcom-1.0.0.AppImage
```

---

## Troubleshooting

### Issue: Migration fails with "permission denied"

**Cause:** Not enough privileges in Supabase

**Solution:** Run migration as database owner or use Supabase Dashboard SQL Editor (which has elevated privileges)

### Issue: Storage bucket already exists

**Expected:** The script uses `ON CONFLICT DO NOTHING`, so this is fine

**Verification:** Check that `file_size_limit` is 524288000 (500MB)

### Issue: Columns already exist

**Expected:** The script uses `ADD COLUMN IF NOT EXISTS`, so this is safe

**Verification:** Run verification queries to confirm all columns present

### Issue: RLS policies conflict

**Expected:** The script drops existing policies first with `DROP POLICY IF EXISTS`

**Verification:** Check policies with the verification query above

---

## Important Notes

### RLS Policies
- **`application_versions`**: Anyone can read, only admins can modify
- **`application_downloads`**: Users can only see their own downloads
- **`application_update_checks`**: Users can only see their own checks

### Security
- Storage bucket is **private** (requires signed URLs)
- Download URLs expire after 1-2 hours
- All API endpoints require JWT authentication
- SHA256 hashes verify file integrity

### Analytics
- Every download is tracked with metadata
- Every update check is logged
- Helper functions provide aggregate statistics
- Use for monitoring adoption rates and success metrics

---

## Support

If you encounter any issues:

1. Check the verification queries above
2. Review error messages in Supabase logs
3. Ensure you're running the script in Supabase SQL Editor
4. Contact: josh@thelyceum.io

---

**Migration Script:** `SETUP_CENTCOM_DISTRIBUTION_SYSTEM.sql`
**Status:** ✅ Ready to run
**Estimated Time:** ~30 seconds
