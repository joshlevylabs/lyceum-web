# Diagnose GitHub Release 404 Issue

## Problem
Getting 404 when trying to download: `https://github.com/joshlevylabs/datacenter/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe`

GitHub is asking for login credentials.

## Possible Causes

1. **Release doesn't exist** - The v1.0.0 tag/release hasn't been created yet
2. **Release is Draft** - Release exists but marked as draft (not published)
3. **Release is Private** - Repository is private, requiring authentication
4. **Wrong filename** - File exists but with different name than in database
5. **File not uploaded** - Release exists but EXE file wasn't uploaded

## Steps to Diagnose

### 1. Check if Release Exists
Visit: `https://github.com/joshlevylabs/datacenter/releases/tag/v1.0.0`

**If 404:** Release doesn't exist - need to create it
**If 200:** Release exists - check next steps

### 2. Check Release Status
If release exists, verify:
- [ ] Is it marked as "Published" (not "Draft")?
- [ ] Does it show the tag `v1.0.0`?
- [ ] Are there files attached to the release?

### 3. Check Uploaded Files
Look at the "Assets" section of the release:
- [ ] Is there an MSI file? What's the exact name?
- [ ] Is there an EXE file? What's the exact name?

**Expected filenames from database:**
- MSI: `Centcom_1.0.0_x64_en-US.msi`
- EXE: `Centcom_1.0.0_x64-setup.exe`

### 4. Check Repository Visibility
Visit: `https://github.com/joshlevylabs/datacenter`
- [ ] Is the repository Public or Private?
- [ ] If Private, release assets require authentication

## Current Database URLs

Run this SQL to see what URLs are stored:

```sql
SELECT
  id,
  version_number,
  platform,
  installer_type,
  download_url,
  file_size_bytes
FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
ORDER BY installer_type;
```

## Quick Fixes

### If Release Doesn't Exist
Create a new release at: `https://github.com/joshlevylabs/datacenter/releases/new`
- Tag: `v1.0.0`
- Title: `Centcom v1.0.0`
- Upload both MSI and EXE files
- Mark as Published (NOT Draft)

### If Filenames Don't Match
Option A: Rename files in GitHub release to match database
Option B: Update database to match actual filenames (see UPDATE_DOWNLOAD_URLS.sql)

### If Repository is Private
GitHub release assets from private repos require authentication. Options:
1. Make repository public
2. Use a different hosting solution (Azure Blob, AWS S3, etc.)
3. Generate and use GitHub Personal Access Tokens (complex for end users)

## Recommended Solution

Based on the Tauri MSI naming convention (`Centcom_1.0.0_x64_en-US.msi`), the EXE file is probably named:
`Centcom_1.0.0_x64_en-US.exe`

But the database has:
`Centcom_1.0.0_x64-setup.exe`

Check the actual Tauri build output directory to see the real filename, then update the database accordingly.
