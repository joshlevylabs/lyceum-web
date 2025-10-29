# Setup Public Release Repository - Step by Step

## Overview
Create a separate **public** GitHub repository just for hosting release files, while keeping your source code **private**.

---

## ✅ Step-by-Step Instructions

### 1. Create Public Repository

Visit: `https://github.com/new`

**Settings:**
- Owner: `joshlevylabs`
- Repository name: `centcom-releases` (or `datacenter-releases`)
- Description: `Public release repository for Centcom Desktop Application`
- Visibility: **Public** ✅
- Initialize: Don't add README, .gitignore, or license
- Click: **Create repository**

---

### 2. Create Release in New Repo

Visit: `https://github.com/joshlevylabs/centcom-releases/releases/new`

**Release Details:**
- Tag version: `v1.0.0`
- Release title: `Centcom Desktop v1.0.0`
- Description:
  ```
  Initial release of Centcom Desktop Application

  ## Installation
  - **Windows (Recommended):** Download the MSI installer
  - **Windows (Alternative):** Download the EXE installer

  Both installers include the same application. Choose the format that works best for your environment.
  ```

**Upload Assets:**
1. Download files from private repo: `https://github.com/joshlevylabs/datacenter/releases/tag/v1.0.0`
   - `Centcom_1.0.0_x64-setup.exe` (306 MB)
   - `Centcom_1.0.0_x64_en-US.msi` (309 MB)
2. Drag and drop both files into the assets section
3. Wait for upload to complete

**Publish:**
- **Do NOT check** "Set as a pre-release"
- **Do NOT check** "Set as latest release" (will auto-detect)
- Click: **Publish release** ✅

---

### 3. Verify Public Access

**Test the download URLs** (in incognito/private browser window):

EXE:
```
https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe
```

MSI:
```
https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi
```

**Expected Result:** Download should start immediately, NO login prompt ✅

---

### 4. Update Database

Run the SQL script: `UPDATE_TO_PUBLIC_REPO.sql` in Supabase

This will update the URLs from:
- ❌ `github.com/joshlevylabs/datacenter/releases/...`

To:
- ✅ `github.com/joshlevylabs/centcom-releases/releases/...`

---

### 5. Test in Lyceum

1. Refresh Lyceum dashboard: `http://localhost:3000/dashboard`
2. Click **Desktop Application** card
3. Select installer type (MSI or EXE)
4. Click **Download**

**Expected Result:**
- ✅ Download starts immediately
- ✅ No 404 error
- ✅ No GitHub login prompt
- ✅ File downloads successfully

---

## Security Benefits

✅ **Source code stays private** - Main datacenter repo remains private
✅ **Only binaries are public** - No code exposure
✅ **Separate concerns** - Releases isolated from development
✅ **Common practice** - Used by many enterprise projects

## Cost

**$0/month** - Completely free!

---

## Future Releases

For future versions (v1.1.0, v2.0.0, etc.):
1. Build new installers in private datacenter repo
2. Create new release in **public** centcom-releases repo
3. Upload new installers
4. Insert new version in database with public repo URLs
5. Deploy!

---

## Example: Real Projects Using This Pattern

- **Discord** - Private main repo, public releases
- **VS Code** - Open source but releases in separate location
- **Many enterprise SaaS companies** - Public releases, private source

This is a proven, professional approach! ✅
