# GitHub Actions Setup Guide for Automatic Version Registration

This guide explains how to set up GitHub Actions to automatically register new versions in Lyceum when you publish a release.

---

## Overview

When you publish a new release on GitHub (centcom-releases or lyceum-releases), the GitHub Actions workflow will:
1. Detect the version from the release tag (e.g., `v1.0.2`)
2. Determine the brand (Centcom or Lyceum) based on repository name
3. Call Lyceum's API to register the version
4. Set the version as **"Unreleased"** (requires admin approval to promote)
5. Post a comment on the release with status

---

## Prerequisites

1. **Lyceum API deployed and accessible** (e.g., https://lyceum.yourdomain.com)
2. **Admin API key generated** (see below)
3. **GitHub repository admin access** for centcom-releases and lyceum-releases

---

## Step 1: Generate Admin API Key

**What is this for?** The `ADMIN_API_KEY` is for **GitHub Actions** to authenticate when automatically registering new versions. This is machine-to-machine authentication (not for human users).

**Human admins** use their normal login credentials and the `role` field in `user_profiles`.

1. **Generate a secure API key:**

   **Linux/Mac:**
   ```bash
   openssl rand -hex 32
   ```

   **Windows (PowerShell):**
   ```powershell
   -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
   ```

2. **Add to Lyceum environment variables:**

   **`.env.local` (for local development):**
   ```env
   ADMIN_API_KEY=your_generated_key_here
   ```

   **Production (Vercel/etc):**
   - Go to your hosting platform's environment variables
   - Add `ADMIN_API_KEY` with the generated value
   - Redeploy if necessary

---

## Step 2: Add GitHub Secrets (Both Repos)

For **BOTH** `centcom-releases` and `lyceum-releases` repositories:

1. Go to **Settings > Secrets and variables > Actions**
2. Click **"New repository secret"**
3. Add these two secrets:

### Secret 1: LYCEUM_API_URL
```
Name: LYCEUM_API_URL
Value: https://your-lyceum-domain.com
```
*Replace with your actual Lyceum URL (no trailing slash)*

### Secret 2: LYCEUM_API_KEY
```
Name: LYCEUM_API_KEY
Value: your_generated_key_here
```
*Use the same key you added to Lyceum's environment*

---

## Step 3: Add Workflow to Release Repositories

**Important:** This workflow goes in your **release repositories** (where you publish installer files), NOT in your application source code repository.

Copy the workflow file to **both** release repositories:

### For centcom-releases:
```bash
# In centcom-releases repository
mkdir -p .github/workflows
cp /path/to/lyceum/.github/workflows/register-version.yml .github/workflows/
git add .github/workflows/register-version.yml
git commit -m "feat: Add automatic version registration workflow"
git push
```

### For lyceum-releases:
```bash
# In lyceum-releases repository
mkdir -p .github/workflows
cp /path/to/lyceum/.github/workflows/register-version.yml .github/workflows/
git add .github/workflows/register-version.yml
git commit -m "feat: Add automatic version registration workflow"
git push
```

**Note:** The same workflow file works for both repos - it automatically detects the brand.

---

## Step 4: Run Database Migration

Run the migration to add release stages to your database:

1. **Open Supabase Dashboard** (or your PostgreSQL client)
2. **Go to SQL Editor**
3. **Copy and paste** the contents of `supabase/migrations/20250113_add_release_stages.sql`
4. **Click "Run"**
5. **Verify migration** completed successfully

---

## Step 5: Test the Workflow

### Manual Test (Recommended First Time)
1. Go to one of your release repositories (e.g., centcom-releases)
2. Go to **Actions** tab
3. Click on **"Register New Version"** workflow (if visible)
4. You should see it run when you create a release

### Live Test
1. Build your application with a new version (e.g., 1.0.3)
2. Create a GitHub Release:
   - Go to GitHub repository → **Releases** → **Create a new release**
   - **Tag:** `v1.0.3`
   - **Title:** `Version 1.0.3`
   - **Upload installers:**
     - `Centcom_1.0.3_x64-setup.exe` (or `Lyceum_1.0.3_x64-setup.exe`)
     - `Centcom_1.0.3_x64_en-US.msi` (or `Lyceum_1.0.3_x64_en-US.msi`)
   - Click **"Publish release"**
3. **GitHub Actions runs automatically**
4. **Check Results:**
   - Go to **Actions** tab → View workflow run
   - Check for success/failure
   - Should see comment on release with status
5. **Verify in Lyceum:**
   - Go to **Admin Panel** → **Desktop-App**
   - New version should appear with **"Unreleased"** stage

---

## How Release Stages Work

### Release Stage Lifecycle

```
unreleased → testing → production
```

1. **Unreleased** (default for new releases)
   - New versions automatically registered via GitHub Actions
   - NOT visible to users
   - Only visible in admin panel
   - Requires superadmin approval to promote

2. **Testing**
   - Promoted by superadmin for QA testing
   - Can be distributed to testers
   - Only one version per brand/installer can be in testing

3. **Production**
   - Promoted by superadmin when ready for all users
   - Visible and downloadable by all users
   - Only one version per brand/installer can be in production
   - Previous production version is automatically demoted to unreleased

### Promoting Versions

1. **Log in as superadmin**
2. **Go to Admin Panel** → **Desktop-App**
3. **Find the version** you want to promote
4. **Click the stage button** (Unreleased → Testing → Production)
5. **Confirm the promotion**
6. Previous versions in that stage are automatically demoted

---

## Troubleshooting

### GitHub Action Fails

**Check workflow logs:**
1. Go to repository → **Actions** tab
2. Click on failed workflow run
3. Expand steps to see error messages

**Common issues:**
- `401 Unauthorized` → API key mismatch or not set
- `404 Not Found` → Wrong Lyceum URL
- `500 Server Error` → Check Lyceum logs

**Solutions:**
1. Verify secrets are set correctly in GitHub repo
2. Verify `ADMIN_API_KEY` matches in both Lyceum and GitHub
3. Verify Lyceum URL is correct (include https://, no trailing slash)
4. Check Lyceum is deployed and accessible

### Version Not Appearing in Admin Panel

1. **Check GitHub Actions succeeded:**
   - Go to repository → Actions tab
   - Verify workflow completed successfully

2. **Check Lyceum database:**
   ```sql
   SELECT * FROM application_versions
   WHERE version_number = '1.0.3'
   ORDER BY created_at DESC;
   ```

3. **Check release_stage:**
   - New versions should have `release_stage = 'unreleased'`
   - If missing, run migration again

4. **Refresh admin panel:**
   - Click "Refresh" button in Desktop-App page

### Users Not Getting Updated Version

**Check version stage:**
- Only **production** versions are served to users
- Testing/unreleased versions require manual promotion

**Check API response:**
```bash
# Test API endpoint (replace URL and email)
curl -X GET "https://your-lyceum-domain.com/api/centcom/versions/latest?installer_type=exe" \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN"
```

---

## File Naming Convention (Important!)

Installer files **MUST** follow this exact naming pattern:

### Centcom:
- EXE: `Centcom_{VERSION}_x64-setup.exe`
- MSI: `Centcom_{VERSION}_x64_en-US.msi`

### Lyceum:
- EXE: `Lyceum_{VERSION}_x64-setup.exe`
- MSI: `Lyceum_{VERSION}_x64_en-US.msi`

### Examples for version 1.0.3:
- ✅ `Centcom_1.0.3_x64-setup.exe`
- ✅ `Centcom_1.0.3_x64_en-US.msi`
- ✅ `Lyceum_1.0.3_x64-setup.exe`
- ✅ `Lyceum_1.0.3_x64_en-US.msi`
- ❌ `Centcom-Setup-1.0.3.exe` (wrong format)
- ❌ `Lyceum_1.0.3_setup.exe` (missing x64)

---

## Next Steps

After setup is complete:

1. ✅ **Create a test release** to verify GitHub Actions works
2. ✅ **Check admin panel** to see the unreleased version
3. ✅ **Test promoting** to testing stage
4. ✅ **Test promoting** to production stage
5. ✅ **Verify users can download** the production version

---

## Summary

- **Automatic**: GitHub Actions registers new releases as "unreleased"
- **Manual Control**: Superadmin promotes through stages (unreleased → testing → production)
- **Safe**: Only production versions are served to users
- **Flexible**: Can test versions before making them public
- **Audit Trail**: Clear visibility of version stages in admin panel

For questions or issues, refer to the [Lyceum Documentation](https://docs.lyceum.io) or contact support.
