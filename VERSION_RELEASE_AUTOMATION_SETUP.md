# Version Release Automation Setup

This guide explains how to automate version registration when you create GitHub releases.

## How It Works

1. **You create a GitHub release** with tag `v1.0.2`
2. **GitHub Actions detects the release** and triggers the workflow
3. **Workflow calls Lyceum API** to register the version
4. **API adds version to database** (both exe and msi installers)
5. **Users automatically get the new version** when they download

---

## Setup Instructions

### Step 1: Add Admin API Key to Environment

1. **Generate a secure API key:**
   ```bash
   # Generate a random 32-character key
   openssl rand -hex 32
   ```

2. **Add to `.env.local`:**
   ```env
   ADMIN_API_KEY=your_generated_key_here
   ```

3. **Deploy to production** (Vercel, etc.) and add the same environment variable

### Step 2: Add GitHub Secrets

For **each release repository** (centcom-releases, lyceum-releases):

1. Go to repository **Settings > Secrets and variables > Actions**
2. Add these secrets:

   **LYCEUM_API_URL**
   ```
   https://your-lyceum-domain.com
   ```

   **LYCEUM_API_KEY**
   ```
   your_generated_key_here
   ```

### Step 3: Add Workflow to GitHub Repos

Copy [.github/workflows/register-version.yml](.github/workflows/register-version.yml) to **both**:
- `centcom-releases/.github/workflows/register-version.yml`
- `lyceum-releases/.github/workflows/register-version.yml`

Commit and push the workflow files.

---

## Usage: Releasing a New Version

### Automated Release (Recommended)

1. **Build your application** with new version (e.g., 1.0.2)
2. **Create GitHub Release:**
   - Go to GitHub repository
   - Click "Releases" → "Create a new release"
   - Tag: `v1.0.2`
   - Title: `Version 1.0.2`
   - Upload installers:
     - `Centcom-Setup-1.0.2.exe` (or `Lyceum-Setup-1.0.2.exe`)
     - `Centcom-Setup-1.0.2.msi` (or `Lyceum-Setup-1.0.2.msi`)
   - Click "Publish release"
3. **GitHub Actions runs automatically**
4. **Version is registered in database** ✅
5. **Done!** Users will get v1.0.2 when they download

### Manual Release (Fallback)

If automation fails or you prefer manual control:

1. Create GitHub release as above
2. Run this SQL in Supabase:

```sql
-- Replace VERSION, BRAND, and URLs as needed
INSERT INTO application_versions (
  application_name, version_number, platform, brand_type, installer_type,
  is_stable, is_supported, auto_update_enabled, force_update,
  release_date, download_url, storage_path, file_size_bytes,
  min_os_version, release_notes_url, changelog_url
) VALUES
  -- EXE installer
  (
    'centcom', '1.0.2', 'windows', 'centcom', 'exe',
    true, true, true, false,
    NOW(),
    'https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.2/Centcom-Setup-1.0.2.exe',
    null, null, 'Windows 10',
    'https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.2',
    'https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.2'
  ),
  -- MSI installer
  (
    'centcom', '1.0.2', 'windows', 'centcom', 'msi',
    true, true, true, false,
    NOW(),
    'https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.2/Centcom-Setup-1.0.2.msi',
    null, null, 'Windows 10',
    'https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.2',
    'https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.2'
  );

-- Disable old version
UPDATE application_versions
SET auto_update_enabled = false
WHERE version_number != '1.0.2'
  AND application_name = 'centcom'
  AND platform = 'windows'
  AND brand_type = 'centcom';
```

---

## How It Determines the Latest Version

The API query in [src/app/api/centcom/versions/latest/route.ts](src/app/api/centcom/versions/latest/route.ts) finds the latest version by:

```sql
SELECT * FROM application_versions
WHERE application_name = 'centcom'
  AND platform = 'windows'
  AND brand_type = 'lyceum' -- or 'centcom' based on user's company
  AND is_stable = true
  AND is_supported = true
  AND auto_update_enabled = true  -- Only enabled versions
ORDER BY release_date DESC
LIMIT 1
```

**Key flags:**
- `is_stable` - Production-ready version
- `is_supported` - Still receiving support
- `auto_update_enabled` - Should be offered to users

When you register a new version, the automation:
1. Sets old versions `auto_update_enabled = false`
2. Sets new version `auto_update_enabled = true`
3. Users automatically get the new version

---

## Troubleshooting

### GitHub Action Fails
1. Check GitHub Actions logs in repository
2. Verify secrets are set correctly:
   - `LYCEUM_API_URL` (include https://)
   - `LYCEUM_API_KEY` (matches `ADMIN_API_KEY` in Lyceum)
3. Verify API endpoint is deployed and accessible

### Version Not Showing in Downloads
1. Run diagnostic query:
   ```sql
   SELECT * FROM application_versions
   WHERE version_number = '1.0.2'
   ORDER BY created_at DESC;
   ```
2. Check flags: `is_stable`, `is_supported`, `auto_update_enabled` should all be `true`
3. Check `release_date` - newer versions take precedence

### Manual Registration
If automation fails, use [ADD_VERSION_1.0.1.sql](ADD_VERSION_1.0.1.sql) as a template:
1. Replace version number
2. Replace download URLs
3. Run in Supabase SQL Editor

---

## Next Steps

1. ✅ **Right now:** Run [ADD_VERSION_1.0.1.sql](ADD_VERSION_1.0.1.sql) to fix immediate issue
2. ⏭️ **Later:** Set up GitHub Actions automation (optional but recommended)
3. 🎯 **Future:** Consider building admin UI for version management

---

## File Naming Convention

**Important:** Installer files MUST follow this naming pattern:

- **Centcom:** `Centcom_{VERSION}_x64-setup.exe` and `Centcom_{VERSION}_x64_en-US.msi`
- **Lyceum:** `Lyceum_{VERSION}_x64-setup.exe` and `Lyceum_{VERSION}_x64_en-US.msi`

Example for version 1.0.2:
- `Centcom_1.0.2_x64-setup.exe`
- `Centcom_1.0.2_x64_en-US.msi`
- `Lyceum_1.0.2_x64-setup.exe`
- `Lyceum_1.0.2_x64_en-US.msi`

The automation constructs URLs based on this pattern. If you use different names, update the API endpoint at [src/app/api/admin/versions/register/route.ts](src/app/api/admin/versions/register/route.ts).
