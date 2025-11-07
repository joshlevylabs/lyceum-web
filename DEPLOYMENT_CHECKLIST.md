# Deployment Checklist: Repository Migration & Dashboard Fix

## Summary of Changes Made

### 1. Dashboard Brand Detection (✅ Fixed)
Updated [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx:119-140) to show brand-aware download button text:
- **Before**: Button always said "Download Native Lyceum"
- **After**: Shows "Download Centcom" for Centcom users or "Download Lyceum Native" for others
- **Detection**: Based on user's `company` field (same logic as API)

### 2. Files Created
- [MIGRATE_TO_SEPARATE_REPOS.sql](MIGRATE_TO_SEPARATE_REPOS.sql) - Database migration script
- [REPO_MIGRATION_ACTION_PLAN.md](REPO_MIGRATION_ACTION_PLAN.md) - Detailed migration guide

---

## Your Questions Answered

### Q1: Do I need to push to redeploy on Vercel?

**YES** - You need to push the dashboard changes I just made:

```bash
git add src/app/dashboard/page.tsx
git commit -m "fix: Make download button brand-aware (Centcom vs Lyceum)"
git push origin main
```

**Why?**
- The API routes already work correctly (they use `download_url` from database)
- But the dashboard UI was hardcoded to say "Download Native Lyceum" for everyone
- I fixed it to dynamically detect the brand and show the correct name
- Once you push, Vercel will automatically redeploy

### Q2: Why does the button still show "Download Centcom"?

**It was actually showing "Download Native Lyceum" for EVERYONE** (not brand-aware)

I just fixed it so after you push and deploy, it will:
- Show **"Download Centcom"** for users whose company field contains: Centcom, Sonance, Blaze, iPort, Dana Innovations, James, or Trufig
- Show **"Download Lyceum Native"** for all other users

---

## Quick Deployment Steps

### Step 1: Fix Missing File in centcom-releases (5 min) ⚠️

**Problem**: `centcom-releases` is missing the correct EXE installer

**Solution**:
1. Go to: https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.0
2. Click "Edit release"
3. Delete `Centcom.exe` (wrong filename)
4. Upload `Centcom_1.0.0_x64-setup.exe`:
   - From your build: `src-tauri/target/release/bundle/nsis/Centcom_1.0.0_x64-setup.exe`
   - Or download from: https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe
5. Click "Update release"

### Step 2: Run Database Migration (2 min)

1. Open Supabase SQL Editor
2. Copy/paste contents of [MIGRATE_TO_SEPARATE_REPOS.sql](MIGRATE_TO_SEPARATE_REPOS.sql)
3. Click "Run"

This updates all URLs from `datacenter-releases` to the separate repos:
- `centcom-releases` → Centcom branded installers
- `lyceum-releases` → Lyceum branded installers

### Step 3: Deploy Dashboard Fix (2 min)

```bash
git status  # Should show modified: src/app/dashboard/page.tsx
git add src/app/dashboard/page.tsx
git commit -m "fix: Make download button brand-aware (Centcom vs Lyceum)"
git push origin main
```

Wait for Vercel to deploy (~2 minutes).

### Step 4: Test (5 min)

1. **Test Centcom user**:
   - Log in with user from Sonance/Centcom company
   - Button should say "Download Centcom"
   - Download should give Centcom installer

2. **Test Lyceum user**:
   - Log in with any other company
   - Button should say "Download Lyceum Native"
   - Download should give Lyceum installer

---

## Repository Status

### centcom-releases ⚠️ **ACTION NEEDED**
- URL: https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.0
- Files:
  - ❌ `Centcom_1.0.0_x64-setup.exe` **MISSING - NEEDS UPLOAD**
  - ⚠️ `Centcom.exe` (wrong name - DELETE)
  - ✅ `Centcom_1.0.0_x64_en-US.msi`

### lyceum-releases ✅ READY
- URL: https://github.com/joshlevylabs/lyceum-releases/releases/tag/v1.0.0
- Files:
  - ✅ `Lyceum_1.0.0_x64-setup.exe`
  - ✅ `Lyceum_1.0.0_x64_en-US.msi`
  - ✅ SHA256 files

### datacenter-releases ✅ (Can deprecate after migration)
- URL: https://github.com/joshlevylabs/datacenter-releases/releases/tag/v1.0.0
- Status: Complete, all 4 files present
- Can be archived after confirming new repos work

---

## Timeline

**Total: ~15 minutes**

1. ✅ Upload missing file (5 min)
2. ✅ Run SQL migration (2 min)
3. ✅ Push code (1 min)
4. ⏳ Wait for Vercel (2 min)
5. ✅ Test (5 min)

---

## Rollback (If Needed)

```sql
-- Revert to datacenter-releases
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
WHERE application_name = 'centcom' AND version_number = '1.0.0';
```

---

## What Changed

### Modified Files
- `src/app/dashboard/page.tsx`: Added brand detection logic and dynamic button/modal text

### New Files
- `MIGRATE_TO_SEPARATE_REPOS.sql`: Database migration script
- `REPO_MIGRATION_ACTION_PLAN.md`: Detailed migration guide
- `DEPLOYMENT_CHECKLIST.md`: This file

### Database Changes
- `application_versions.download_url`: Updated to point to separate repos per brand

---

## Success Criteria

- ✅ centcom-releases has both EXE and MSI files
- ✅ Database URLs point to correct repos
- ✅ Dashboard shows correct brand name in button
- ✅ Centcom users download Centcom installers
- ✅ Lyceum users download Lyceum installers
- ✅ No 404 errors
