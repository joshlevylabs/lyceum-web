# Repository Migration Action Plan

## Current Situation

Your system has **three** GitHub release repositories with different installers:

### 1. **datacenter-releases** (OLD - Currently Active)
- ✅ `Centcom_1.0.0_x64-setup.exe`
- ✅ `Centcom_1.0.0_x64_en-US.msi`
- ✅ `Lyceum_1.0.0_x64-setup.exe`
- ✅ `Lyceum_1.0.0_x64_en-US.msi`
- **Status**: Currently configured in database
- **URL**: https://github.com/joshlevylabs/datacenter-releases/releases/tag/v1.0.0

### 2. **centcom-releases** (NEW - Not Yet Active)
- ❌ `Centcom_1.0.0_x64-setup.exe` **MISSING**
- ⚠️ `Centcom.exe` (wrong filename - should be `Centcom_1.0.0_x64-setup.exe`)
- ✅ `Centcom_1.0.0_x64_en-US.msi`
- **Status**: Ready but missing correct EXE installer
- **URL**: https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.0

### 3. **lyceum-releases** (NEW - Ready to Use)
- ✅ `Lyceum_1.0.0_x64-setup.exe`
- ✅ `Lyceum_1.0.0_x64_en-US.msi`
- ✅ SHA256 files included
- **Status**: Ready to use
- **URL**: https://github.com/joshlevylabs/lyceum-releases/releases/tag/v1.0.0

---

## Issues to Fix

### 🔴 Critical Issue: Missing File in centcom-releases

The `centcom-releases` repository has a file named `Centcom.exe` instead of `Centcom_1.0.0_x64-setup.exe`.

**Action Required**:
1. Go to https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.0
2. Delete the incorrectly named `Centcom.exe`
3. Upload the correct file: `Centcom_1.0.0_x64-setup.exe`
4. Verify both installers are present:
   - `Centcom_1.0.0_x64-setup.exe` (EXE installer)
   - `Centcom_1.0.0_x64_en-US.msi` (MSI installer)

---

## Migration Steps

### Step 1: Fix centcom-releases Repository

#### Option A: Edit Existing Release (Recommended)
1. Go to: https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.0
2. Click "Edit" on the release
3. Delete `Centcom.exe` from assets
4. Upload `Centcom_1.0.0_x64-setup.exe` from your build output
5. Click "Update release"

#### Option B: Where to Find the Correct File
The correct installer should be in your build output directory:
```
src-tauri/target/release/bundle/nsis/Centcom_1.0.0_x64-setup.exe
```

Or you can get it from the `datacenter-releases` repo:
https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe

### Step 2: Run Database Migration

Once the file is uploaded, run the migration SQL:

```bash
# In Supabase SQL Editor or psql:
psql -h [your-supabase-host] -U postgres -d postgres < MIGRATE_TO_SEPARATE_REPOS.sql
```

Or copy/paste the contents of [MIGRATE_TO_SEPARATE_REPOS.sql](MIGRATE_TO_SEPARATE_REPOS.sql) into Supabase SQL Editor.

### Step 3: Verify Downloads Work

Test each download URL:

**Centcom Brand**:
- EXE: https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe
- MSI: https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi

**Lyceum Brand**:
- EXE: https://github.com/joshlevylabs/lyceum-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64-setup.exe
- MSI: https://github.com/joshlevylabs/lyceum-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64_en-US.msi

### Step 4: Test from Dashboard

1. Log in as a Centcom user (company = "sonance", "centcom", etc.)
   - Should see Centcom branded installers
2. Log in as a Lyceum user (any other company)
   - Should see Lyceum branded installers

---

## Quick Fix Script

If you want to quickly copy the file from datacenter-releases to centcom-releases:

```bash
# Download from datacenter-releases
curl -L -o Centcom_1.0.0_x64-setup.exe \
  https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe

# Then manually upload to centcom-releases via GitHub web interface
```

---

## Why Separate Repos?

**Benefits**:
- ✅ Clear brand separation
- ✅ Independent versioning per brand
- ✅ Easier to manage permissions
- ✅ Cleaner release notes per brand
- ✅ Users only see their brand's releases

**Drawbacks**:
- ⚠️ Must upload to two repos for each release
- ⚠️ Slightly more complex CI/CD

---

## Rollback Plan

If the migration causes issues, you can revert:

```sql
-- Restore to datacenter-releases
UPDATE application_versions
SET download_url = CASE
  WHEN installer_type = 'exe' AND brand_type = 'centcom' THEN
    'https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe'
  WHEN installer_type = 'msi' AND brand_type = 'centcom' THEN
    'https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi'
  WHEN installer_type = 'exe' AND brand_type = 'lyceum' THEN
    'https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64-setup.exe'
  WHEN installer_type = 'msi' AND brand_type = 'lyceum' THEN
    'https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Lyceum_1.0.0_x64_en-US.msi'
END
WHERE application_name = 'centcom'
  AND version_number = '1.0.0';
```

---

## Checklist

- [ ] Upload `Centcom_1.0.0_x64-setup.exe` to centcom-releases
- [ ] Verify all 4 files are accessible in their respective repos
- [ ] Run [MIGRATE_TO_SEPARATE_REPOS.sql](MIGRATE_TO_SEPARATE_REPOS.sql)
- [ ] Test all 4 download URLs in browser
- [ ] Test download from dashboard as Centcom user
- [ ] Test download from dashboard as Lyceum user
- [ ] Update documentation
- [ ] (Optional) Deprecate datacenter-releases repo

---

## Next Steps

1. **Immediate**: Upload the missing `Centcom_1.0.0_x64-setup.exe` file
2. **Today**: Run the migration SQL script
3. **Today**: Test downloads from dashboard
4. **This week**: Update CI/CD to deploy to both repos
5. **Future**: Consider archiving datacenter-releases

---

## Questions?

If you need help:
1. Check that all files are in the correct repos
2. Verify SHA256 hashes match your builds
3. Test URLs manually before running migration
4. Keep the backup table in case rollback is needed
