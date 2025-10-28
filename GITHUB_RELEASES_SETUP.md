# GitHub Releases Setup for Centcom Installers

Since Supabase Storage has file size limits, we'll use GitHub Releases (free, supports up to 2GB per file).

---

## Architecture Change

**Before**: Upload to Supabase Storage → Generate signed URLs
**After**: Upload to GitHub Releases → Use public GitHub URLs

---

## Step 1: Create GitHub Release

### Option A: Using GitHub Web Interface (Easiest)

1. Go to your repository (or create a new one for releases)
   - If using lyceum repo: https://github.com/YOUR_USERNAME/lyceum
   - Or create new repo: https://github.com/new (name it "centcom-releases" if private)

2. Go to **Releases** (right sidebar)

3. Click **Draft a new release**

4. Fill in the release details:
   - **Tag**: `v1.0.0`
   - **Release title**: `Centcom v1.0.0`
   - **Description**:
     ```markdown
     # Centcom v1.0.0 - Windows Installers

     ## Available Downloads

     ### MSI Installer (Recommended for Enterprise)
     - **File**: Centcom_1.0.0_x64_en-US.msi
     - **Size**: 309 MB
     - **SHA256**: `420F252125B7297AE49F7138EB2879E4A372955CAC6C3C0B2E789E41A88F31E0`
     - **Best For**: Enterprise deployments, Group Policy, IT administrators

     ### NSIS Installer (Recommended for End Users)
     - **File**: Centcom_1.0.0_x64-setup.exe
     - **Size**: 306 MB
     - **SHA256**: `AE1BE4E5BE6AA8177C5CA6F335BC63C88607AE79A83590139A477E802DA5B287`
     - **Best For**: Individual users, standard installations

     ## System Requirements
     - Windows 10 (64-bit) or later
     - 4 GB RAM minimum, 8 GB recommended
     - 1 GB available disk space

     ## Installation
     1. Download your preferred installer (MSI or EXE)
     2. Verify the SHA256 hash (optional but recommended)
     3. Run the installer and follow the prompts

     ## Auto-Update
     This version includes auto-update functionality via the Lyceum platform.
     ```

5. **Attach files**:
   - Drag and drop or click to upload:
     - `Centcom_1.0.0_x64_en-US.msi`
     - `Centcom_1.0.0_x64-setup.exe`
   - Upload will take 5-10 minutes per file

6. Click **Publish release**

---

## Step 2: Get GitHub Release URLs

After publishing, your files will have URLs like:

```
https://github.com/YOUR_USERNAME/REPO_NAME/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi
https://github.com/YOUR_USERNAME/REPO_NAME/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe
```

**Example** (if your GitHub username is "thelyceum" and repo is "centcom-releases"):
```
https://github.com/thelyceum/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi
https://github.com/thelyceum/centcom-releases/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe
```

Copy these URLs - you'll need them in Step 3.

---

## Step 3: Update Database with GitHub URLs

Once you have the URLs, run this SQL in Supabase:

```sql
-- Insert MSI version
INSERT INTO application_versions (
  application_name,
  version_number,
  platform,
  architecture,
  installer_type,
  file_size_bytes,
  sha256_hash,
  download_url,
  release_date,
  is_stable,
  is_supported,
  auto_update_enabled,
  force_update
) VALUES (
  'centcom',
  '1.0.0',
  'windows',
  'x64',
  'msi',
  323946496,  -- 309 MB in bytes
  '420F252125B7297AE49F7138EB2879E4A372955CAC6C3C0B2E789E41A88F31E0',
  'https://github.com/YOUR_USERNAME/REPO_NAME/releases/download/v1.0.0/Centcom_1.0.0_x64_en-US.msi',
  NOW(),
  true,
  true,
  true,
  false
);

-- Insert EXE version
INSERT INTO application_versions (
  application_name,
  version_number,
  platform,
  architecture,
  installer_type,
  file_size_bytes,
  sha256_hash,
  download_url,
  release_date,
  is_stable,
  is_supported,
  auto_update_enabled,
  force_update
) VALUES (
  'centcom',
  '1.0.0',
  'windows',
  'x64',
  'exe',
  320586752,  -- 306 MB in bytes
  'AE1BE4E5BE6AA8177C5CA6F335BC63C88607AE79A83590139A477E802DA5B287',
  'https://github.com/YOUR_USERNAME/REPO_NAME/releases/download/v1.0.0/Centcom_1.0.0_x64-setup.exe',
  NOW(),
  true,
  true,
  true,
  false
);
```

**⚠️ IMPORTANT**: Replace `YOUR_USERNAME/REPO_NAME` with your actual GitHub repo path!

---

## Step 4: Update API to Use GitHub URLs

The API endpoints need to return the GitHub URL directly instead of generating Supabase signed URLs.

I'll update the following files:
- `src/app/api/centcom/versions/latest/route.ts`
- `src/app/api/centcom/download/[version]/[platform]/route.ts`

Changes:
- Skip `createSignedUrl()` calls
- Return `download_url` directly from database
- GitHub URLs are already public, no signing needed

---

## Advantages of GitHub Releases

✅ **Free** - No cost for public or private repos
✅ **Large files** - Up to 2GB per file
✅ **Reliable** - GitHub's CDN, 99.9% uptime
✅ **Version history** - Built-in versioning
✅ **Release notes** - Can include changelogs
✅ **Public or private** - Your choice

---

## Public vs Private Repository

### Public Repository (Recommended)
- ✅ Anyone can download installers
- ✅ No authentication needed
- ✅ Better for open source or public software
- ⚠️ Anyone can see your releases

### Private Repository
- ✅ Only authorized users can download
- ⚠️ Requires GitHub authentication token
- ⚠️ More complex to implement
- ⚠️ Counts against your GitHub storage quota

**Recommendation**: Use a **public repository** for simplicity. The installers are meant to be downloaded by users anyway.

---

## Security Note

Even with public GitHub URLs:
- Users still need a valid Lyceum license to activate Centcom
- The download API still verifies user authentication
- Only the installer files are public, not the license keys

---

## Next Steps

1. ✅ Create GitHub release with both installers
2. ✅ Copy the GitHub download URLs
3. ✅ Run SQL to insert database records
4. ✅ Update API endpoints to use GitHub URLs
5. ✅ Test download from dashboard

---

Ready? Let's create your GitHub release!
