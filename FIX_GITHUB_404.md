# Fix GitHub 404 - Quick Action Plan

## Current Issue
Download URL returns 404: `https://github.com/joshlevylabs/datacenter/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe`

## Action Steps

### Step 1: Check the GitHub Release
Open: `https://github.com/joshlevylabs/datacenter/releases`

**Look for v1.0.0 release:**

#### If release DOES NOT exist:
1. Go to: `https://github.com/joshlevylabs/datacenter/releases/new`
2. Create new release:
   - Tag: `v1.0.0`
   - Title: `Centcom Desktop v1.0.0`
   - Description: Initial release of Centcom Desktop Application
3. Upload your MSI and EXE installers from the Tauri build output
4. Click "Publish release" (NOT "Save draft")

#### If release EXISTS but is a Draft:
1. Edit the release
2. Click "Publish release"

#### If release EXISTS and is Published:
1. Check the "Assets" section
2. Write down the EXACT filenames of the MSI and EXE files
3. Go to Step 2 below

---

### Step 2: Match Database URLs to Actual Files

Run `CHECK_DOWNLOAD_URLS.sql` in Supabase to see current URLs in database.

Then compare with actual filenames in GitHub release:

**Common Tauri naming patterns:**
- MSI: `Centcom_1.0.0_x64_en-US.msi`
- EXE (NSIS): `Centcom_1.0.0_x64-setup.exe`
- EXE (Alternative): `Centcom_1.0.0_x64_en-US.exe`

**If filenames DON'T match database:**
- Edit `UPDATE_DOWNLOAD_URLS.sql` with the actual filenames from GitHub
- Run the UPDATE statement in Supabase

---

### Step 3: Check Repository Visibility

Visit: `https://github.com/joshlevylabs/datacenter`

**If repository is PRIVATE:**
- GitHub requires authentication for downloading release assets
- Options:
  1. Make the repository public (if acceptable)
  2. Make ONLY the release assets public (Settings → General → Release options)
  3. Use alternative hosting (not recommended for 300MB files)

**If repository is PUBLIC:**
- Release assets should be downloadable without auth
- If still getting 404, it's a filename mismatch issue

---

### Step 4: Test the Fixed URL

After making changes, test by pasting the full URL in a browser:
`https://github.com/joshlevylabs/datacenter/releases/download/v1.0.0/[ACTUAL_FILENAME].exe`

- Should start downloading immediately
- Should NOT ask for login
- Should NOT show 404

---

### Step 5: Retest in Lyceum

1. Refresh the Lyceum dashboard
2. Click on Desktop Application card
3. Select installer type (MSI or EXE)
4. Download should work without errors

---

## Quick Reference: Where Are Files?

**GitHub Release URL Pattern:**
```
https://github.com/{owner}/{repo}/releases/download/{tag}/{filename}
```

**Your URLs:**
- Repository: `joshlevylabs/datacenter`
- Tag: `v1.0.0`
- Filenames: Need to verify in release

**Tauri Build Output Location** (in datacenter repo):
- Windows MSI: `src-tauri/target/release/bundle/msi/`
- Windows EXE: `src-tauri/target/release/bundle/nsis/`

---

## Most Likely Issue

Based on common scenarios, the issue is probably:

1. **Release doesn't exist yet** (60% likely)
   - Fix: Create the release and upload installers

2. **Release is a draft** (20% likely)
   - Fix: Publish the release

3. **Filename mismatch** (15% likely)
   - Fix: Update database URLs to match actual filenames

4. **Private repository** (5% likely)
   - Fix: Make repository or release public
