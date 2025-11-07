# How Version Updates Work

## Overview

When you release a new version (like v1.0.1), the system automatically detects and serves the new version to users through the desktop application's auto-update feature.

---

## The Update Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Release New Version to GitHub                      │
│ - Upload installers to centcom-releases / lyceum-releases  │
│ - Tag release as v1.0.1                                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Update Database                                     │
│ - Insert new records in application_versions table          │
│ - Mark new version as is_stable = true                      │
│ - Set auto_update_enabled = true                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Desktop App Checks for Updates                     │
│ - Calls GET /api/centcom/versions/latest                   │
│ - API queries database for latest stable version           │
│ - Compares current version vs latest version               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: User Gets Update Notification                      │
│ - Desktop app shows "Update Available" notification        │
│ - User clicks "Download Update"                             │
│ - Installer downloads in background                         │
│ - User prompted to restart and install                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step: Releasing v1.0.1

### Step 1: Build and Upload New Installers (10 min)

#### A. Build the new version in your desktop app repo

```bash
cd datacenter  # Or wherever your Tauri project is
# Update version in tauri.conf.json to "1.0.1"
npm run build
```

#### B. Upload to GitHub Releases

**For Centcom Brand:**
1. Go to: https://github.com/joshlevylabs/centcom-releases/releases
2. Click "Draft a new release"
3. Tag: `v1.0.1`
4. Title: `Centcom v1.0.1`
5. Upload files:
   - `Centcom_1.0.1_x64-setup.exe`
   - `Centcom_1.0.1_x64_en-US.msi`
6. Click "Publish release"

**For Lyceum Brand:**
1. Go to: https://github.com/joshlevylabs/lyceum-releases/releases
2. Click "Draft a new release"
3. Tag: `v1.0.1`
4. Title: `Lyceum Native v1.0.1`
5. Upload files:
   - `Lyceum_1.0.1_x64-setup.exe`
   - `Lyceum_1.0.1_x64_en-US.msi`
6. Click "Publish release"

### Step 2: Update the Database (2 min)

Run this SQL in Supabase SQL Editor:

```sql
-- ============================================
-- Insert Centcom v1.0.1
-- ============================================

-- Centcom EXE
INSERT INTO application_versions (
  application_name,
  version_number,
  platform,
  architecture,
  installer_type,
  file_size_bytes,
  sha256_hash,
  download_url,
  changelog_url,
  release_date,
  is_stable,
  is_supported,
  auto_update_enabled,
  force_update,
  brand_type
) VALUES (
  'centcom',
  '1.0.1',
  'windows',
  'x64',
  'exe',
  320000000, -- Replace with actual file size
  'ACTUAL_SHA256_HASH_HERE', -- Calculate with: certutil -hashfile file.exe SHA256
  'https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.1/Centcom_1.0.1_x64-setup.exe',
  'https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.1',
  NOW(),
  true,  -- is_stable (true = production ready)
  true,  -- is_supported
  true,  -- auto_update_enabled (true = desktop app will detect this)
  false, -- force_update (set to true to require immediate update)
  'centcom'
);

-- Centcom MSI
INSERT INTO application_versions (
  application_name,
  version_number,
  platform,
  architecture,
  installer_type,
  file_size_bytes,
  sha256_hash,
  download_url,
  changelog_url,
  release_date,
  is_stable,
  is_supported,
  auto_update_enabled,
  force_update,
  brand_type
) VALUES (
  'centcom',
  '1.0.1',
  'windows',
  'x64',
  'msi',
  323000000, -- Replace with actual file size
  'ACTUAL_SHA256_HASH_HERE',
  'https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.1/Centcom_1.0.1_x64_en-US.msi',
  'https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.1',
  NOW(),
  true,
  true,
  true,
  false,
  'centcom'
);

-- ============================================
-- Insert Lyceum v1.0.1
-- ============================================

-- Lyceum EXE
INSERT INTO application_versions (
  application_name,
  version_number,
  platform,
  architecture,
  installer_type,
  file_size_bytes,
  sha256_hash,
  download_url,
  changelog_url,
  release_date,
  is_stable,
  is_supported,
  auto_update_enabled,
  force_update,
  brand_type
) VALUES (
  'centcom',
  '1.0.1',
  'windows',
  'x64',
  'exe',
  320000000,
  'ACTUAL_SHA256_HASH_HERE',
  'https://github.com/joshlevylabs/lyceum-releases/releases/download/v1.0.1/Lyceum_1.0.1_x64-setup.exe',
  'https://github.com/joshlevylabs/lyceum-releases/releases/tag/v1.0.1',
  NOW(),
  true,
  true,
  true,
  false,
  'lyceum'
);

-- Lyceum MSI
INSERT INTO application_versions (
  application_name,
  version_number,
  platform,
  architecture,
  installer_type,
  file_size_bytes,
  sha256_hash,
  download_url,
  changelog_url,
  release_date,
  is_stable,
  is_supported,
  auto_update_enabled,
  force_update,
  brand_type
) VALUES (
  'centcom',
  '1.0.1',
  'windows',
  'x64',
  'msi',
  323000000,
  'ACTUAL_SHA256_HASH_HERE',
  'https://github.com/joshlevylabs/lyceum-releases/releases/download/v1.0.1/Lyceum_1.0.1_x64_en-US.msi',
  'https://github.com/joshlevylabs/lyceum-releases/releases/tag/v1.0.1',
  NOW(),
  true,
  true,
  true,
  false,
  'lyceum'
);

-- ============================================
-- Verify all versions
-- ============================================

SELECT
  version_number,
  brand_type,
  installer_type,
  is_stable,
  auto_update_enabled,
  release_date
FROM application_versions
WHERE application_name = 'centcom'
ORDER BY release_date DESC, brand_type, installer_type;

-- You should see:
-- v1.0.1 centcom exe
-- v1.0.1 centcom msi
-- v1.0.1 lyceum exe
-- v1.0.1 lyceum msi
-- v1.0.0 centcom exe
-- v1.0.0 centcom msi
-- v1.0.0 lyceum exe
-- v1.0.0 lyceum msi
```

### Step 3: How the API Finds the Latest Version

The API endpoint `/api/centcom/versions/latest` automatically finds the newest version:

```typescript
// From src/app/api/centcom/versions/latest/route.ts

const { data: latestVersion, error } = await supabase
  .from('application_versions')
  .select('*')
  .eq('application_name', 'centcom')
  .eq('platform', platform)           // windows, macos, linux
  .eq('brand_type', brandType)        // centcom or lyceum
  .eq('is_stable', true)              // Only production-ready versions
  .eq('is_supported', true)           // Only supported versions
  .eq('auto_update_enabled', true)   // Only versions enabled for auto-update
  .order('release_date', { ascending: false })  // ← NEWEST FIRST
  .limit(1)
  .single()
```

**Key points:**
- Orders by `release_date DESC` (newest first)
- Only includes versions where `is_stable = true`
- Only includes versions where `auto_update_enabled = true`
- Returns the FIRST match = latest version

So when you insert v1.0.1 with a newer `release_date`, the API automatically returns it!

---

## Desktop App Auto-Update Flow

### 1. Desktop App Checks for Updates

The desktop app (built by the Centcom team) should call the API:

```javascript
// On app launch and every 6 hours
async function checkForUpdates() {
  const currentVersion = "1.0.0"  // From app.getVersion()
  const platform = "windows"
  const userId = getCurrentUserId()

  const response = await fetch(
    `https://lyceum.app/api/centcom/versions/latest?` +
    `platform=${platform}&current_version=${currentVersion}&user_id=${userId}`
  )

  const data = await response.json()

  if (data.update_available) {
    showUpdateNotification({
      currentVersion: currentVersion,
      latestVersion: data.latest_version.version,  // "1.0.1"
      downloadUrl: data.latest_version.download_url,
      releaseNotes: data.latest_version.release_notes
    })
  }
}
```

### 2. API Response for v1.0.1

When the API detects v1.0.1 is newer than v1.0.0:

```json
{
  "success": true,
  "update_available": true,
  "current_version": "1.0.0",
  "latest_version": {
    "version": "1.0.1",
    "release_date": "2025-11-15T10:00:00Z",
    "download_url": "https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.1/Centcom_1.0.1_x64-setup.exe",
    "file_size_bytes": 320000000,
    "sha256_hash": "abc123...",
    "changelog_url": "https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.1",
    "release_notes": [],
    "force_update": false,
    "installer_type": "exe"
  }
}
```

### 3. Version Comparison Logic

The API uses semantic versioning to compare:

```typescript
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)  // "1.0.1" → [1, 0, 1]
  const parts2 = v2.split('.').map(Number)  // "1.0.0" → [1, 0, 0]

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0
    const num2 = parts2[i] || 0

    if (num1 > num2) return 1   // v1 is newer
    if (num1 < num2) return -1  // v2 is newer
  }

  return 0  // Same version
}
```

**Examples:**
- `compareVersions("1.0.1", "1.0.0")` → 1 (update available)
- `compareVersions("1.1.0", "1.0.9")` → 1 (update available)
- `compareVersions("2.0.0", "1.9.9")` → 1 (update available)
- `compareVersions("1.0.0", "1.0.0")` → 0 (same, no update)

---

## Testing the Update Flow

### Test Scenario 1: User on v1.0.0, New v1.0.1 Available

1. **Insert v1.0.1** into database (as shown above)

2. **Desktop app running v1.0.0** calls API:
   ```
   GET /api/centcom/versions/latest?platform=windows&current_version=1.0.0&user_id=xxx
   ```

3. **API responds**:
   ```json
   {
     "update_available": true,
     "latest_version": {
       "version": "1.0.1",
       "download_url": "https://github.com/.../Centcom_1.0.1_x64-setup.exe"
     }
   }
   ```

4. **Desktop app shows notification**:
   ```
   📦 Update Available
   Version 1.0.1 is now available. You're currently on 1.0.0.
   [Download Now] [Later]
   ```

### Test Scenario 2: User on v1.0.1 (Latest)

1. **Desktop app running v1.0.1** calls API:
   ```
   GET /api/centcom/versions/latest?platform=windows&current_version=1.0.1&user_id=xxx
   ```

2. **API responds**:
   ```json
   {
     "update_available": false,
     "current_version": "1.0.1",
     "latest_version": {
       "version": "1.0.1"
     }
   }
   ```

3. **Desktop app** does nothing (already up to date)

---

## Special Version Types

### Beta/Pre-release Versions

For beta testing v1.0.1-beta:

```sql
INSERT INTO application_versions (
  application_name,
  version_number,
  -- ... other fields ...
  is_stable,           -- false for beta
  auto_update_enabled  -- false (beta users opt-in manually)
) VALUES (
  'centcom',
  '1.0.1-beta',
  -- ...
  false,  -- Not stable (beta)
  false   -- Don't auto-update to beta
);
```

Beta users can manually download from GitHub releases.

### Force Update (Critical Security Fix)

For critical v1.0.2 security patch:

```sql
INSERT INTO application_versions (
  -- ... other fields ...
  force_update  -- true = user MUST update
) VALUES (
  -- ...
  true  -- Force update
);
```

Desktop app should block usage until update is installed.

---

## Database Query Examples

### Check what version users will receive

```sql
-- What Centcom users see:
SELECT
  version_number,
  installer_type,
  release_date,
  is_stable,
  auto_update_enabled
FROM application_versions
WHERE application_name = 'centcom'
  AND platform = 'windows'
  AND brand_type = 'centcom'
  AND is_stable = true
  AND is_supported = true
  AND auto_update_enabled = true
ORDER BY release_date DESC
LIMIT 1;

-- What Lyceum users see:
SELECT
  version_number,
  installer_type,
  release_date,
  is_stable,
  auto_update_enabled
FROM application_versions
WHERE application_name = 'centcom'
  AND platform = 'windows'
  AND brand_type = 'lyceum'
  AND is_stable = true
  AND is_supported = true
  AND auto_update_enabled = true
ORDER BY release_date DESC
LIMIT 1;
```

### See all versions chronologically

```sql
SELECT
  version_number,
  brand_type,
  installer_type,
  is_stable,
  auto_update_enabled,
  release_date,
  download_url
FROM application_versions
WHERE application_name = 'centcom'
  AND platform = 'windows'
ORDER BY release_date DESC, brand_type, installer_type;
```

### Disable auto-update for a problematic version

```sql
-- If v1.0.1 has a bug, disable it
UPDATE application_versions
SET auto_update_enabled = false
WHERE application_name = 'centcom'
  AND version_number = '1.0.1';

-- Users will stay on v1.0.0 until you release v1.0.2
```

---

## Best Practices

### 1. Always Test in Staging First

- Use `is_stable = false` for initial testing
- Set `auto_update_enabled = false` for internal testing
- Only set `is_stable = true` after QA approval

### 2. Calculate SHA256 Hashes

```bash
# Windows
certutil -hashfile Centcom_1.0.1_x64-setup.exe SHA256

# macOS/Linux
shasum -a 256 Centcom_1.0.1_x64-setup.exe
```

Desktop app should verify the hash before installing.

### 3. Keep Old Versions Available

Don't delete old version records - just set:
```sql
UPDATE application_versions
SET is_supported = false
WHERE version_number = '1.0.0';
```

Users on v1.0.0 can still download if needed, but new users get v1.0.1.

### 4. Use Semantic Versioning

- **Major** (2.0.0): Breaking changes
- **Minor** (1.1.0): New features, backwards compatible
- **Patch** (1.0.1): Bug fixes only

### 5. Write Release Notes

Include in GitHub release description:
```markdown
## v1.0.1 Release Notes

### Fixed
- Fixed crash when opening large projects
- Corrected cluster connection timeout issue

### Improved
- Faster measurement loading
- Better error messages

### Known Issues
- None
```

---

## Troubleshooting

### "Update not detected by desktop app"

1. Check database has new version:
   ```sql
   SELECT * FROM application_versions
   WHERE version_number = '1.0.1'
   AND auto_update_enabled = true;
   ```

2. Check release_date is newer than v1.0.0
3. Verify `is_stable = true` and `auto_update_enabled = true`
4. Check desktop app is calling the correct API endpoint

### "Wrong brand getting updates"

1. Check brand_type in database:
   ```sql
   SELECT brand_type, version_number
   FROM application_versions
   WHERE version_number = '1.0.1';
   ```

2. Verify user's company field matches brand detection logic

### "Download fails with 404"

1. Test GitHub URL directly in browser
2. Verify filename matches exactly
3. Check repo visibility (should be public)

---

## Summary

**The key mechanism:**
1. API always queries for the **latest** `release_date` where `auto_update_enabled = true`
2. When you insert a new version with a newer date, it automatically becomes the latest
3. Desktop apps check periodically and get the new version
4. No code changes needed in the API - it's automatic!

**To release v1.0.1:**
1. Build installers
2. Upload to GitHub
3. Run SQL INSERT for new version
4. Done! Users get notified automatically.
