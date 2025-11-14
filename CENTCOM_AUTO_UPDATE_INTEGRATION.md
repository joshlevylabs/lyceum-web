# Centcom/Lyceum Desktop App - Auto-Update Integration Guide

This document explains how to integrate the auto-update functionality into the Centcom/Lyceum desktop applications (built with Tauri).

---

## Overview

The auto-update system allows the desktop application to:
- Check for new versions automatically
- Download and install updates based on user role
- Support different release stages (testing vs production)
- Provide a seamless update experience for users

---

## How It Works

1. **Desktop app** calls Lyceum API to check for updates
2. **API** returns the latest available version based on:
   - User's role (regular, admin, superadmin)
   - Brand type (Lyceum vs Centcom)
   - Platform (Windows, macOS, Linux)
   - Installer type (EXE vs MSI)
3. **Desktop app** compares current version with latest version
4. If update available → **Desktop app** downloads and installs automatically

---

## API Endpoint

### GET `/api/centcom/versions/latest`

**Base URL:** `https://lyceum.yourdomain.com`

**Purpose:** Check for the latest available version

**Authentication:**
- Required: JWT Bearer token (from user login)
- Include in header: `Authorization: Bearer <user_jwt_token>`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | **Yes** | Operating system: `windows`, `macos`, or `linux` |
| `current_version` | string | No | Current app version (e.g., `1.0.0`) |
| `user_id` | string | No | User's UUID (improves tracking) |
| `installer_type` | string | No | Installer type: `exe` or `msi` (defaults based on platform) |

---

## Request Example

```bash
curl -X GET "https://lyceum.yourdomain.com/api/centcom/versions/latest?platform=windows&current_version=1.0.0&user_id=abc-123" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "update_available": true,
  "current_version": "1.0.0",
  "latest_version": {
    "version": "1.0.2",
    "release_date": "2025-01-15T10:00:00Z",
    "download_url": "https://github.com/joshlevylabs/centcom-releases/releases/download/v1.0.2/Centcom_1.0.2_x64-setup.exe",
    "file_size_bytes": 125829120,
    "sha256_hash": "abc123def456...",
    "changelog_url": "https://github.com/joshlevylabs/centcom-releases/releases/tag/v1.0.2",
    "release_notes": ["New feature X", "Bug fix Y"],
    "force_update": false,
    "installer_type": "exe",
    "min_os_version": null
  }
}
```

### No Update Available (200 OK)

```json
{
  "success": true,
  "update_available": false,
  "current_version": "1.0.2",
  "latest_version": {
    "version": "1.0.2",
    "release_date": "2025-01-15T10:00:00Z",
    "download_url": "...",
    "file_size_bytes": 125829120,
    "sha256_hash": "abc123...",
    "changelog_url": "...",
    "release_notes": [],
    "force_update": false,
    "installer_type": "exe",
    "min_os_version": null
  }
}
```

### Error Response (404)

```json
{
  "success": false,
  "error": "No stable version found for this platform"
}
```

---

## Release Stages and User Access

The API respects release stages to control version distribution:

| User Role | Can Access |
|-----------|------------|
| **Regular User** | Production versions only |
| **Admin** | Testing + Production versions |
| **Superadmin** | Testing + Production versions |

### Release Stage Lifecycle

```
Unreleased → Testing → Production
```

- **Unreleased**: New versions registered via GitHub Actions or manually created - not visible to any users
- **Testing**: Promoted by superadmin for QA - available to admins/superadmins for testing
- **Production**: Live for all users - automatically served to everyone

**This means:**
- When you're testing a new version, promote it to "Testing" stage
- Admins/superadmins will receive the testing version automatically
- Regular users continue to get the production version
- When ready for public release, promote to "Production"

---

## Implementation in Tauri App

### 1. Check for Updates on App Launch

```rust
// src-tauri/src/main.rs or update_manager.rs

use tauri::Manager;
use serde::{Deserialize, Serialize};
use reqwest;

#[derive(Debug, Serialize, Deserialize)]
struct LatestVersionResponse {
    success: bool,
    update_available: bool,
    current_version: String,
    latest_version: VersionInfo,
}

#[derive(Debug, Serialize, Deserialize)]
struct VersionInfo {
    version: String,
    release_date: String,
    download_url: String,
    file_size_bytes: Option<u64>,
    sha256_hash: Option<String>,
    changelog_url: Option<String>,
    release_notes: Option<Vec<String>>,
    force_update: bool,
    installer_type: String,
    min_os_version: Option<String>,
}

#[tauri::command]
async fn check_for_updates(
    user_jwt_token: String,
    user_id: String,
    current_version: String,
) -> Result<LatestVersionResponse, String> {
    let platform = std::env::consts::OS; // "windows", "macos", "linux"
    let api_url = format!(
        "https://lyceum.yourdomain.com/api/centcom/versions/latest?platform={}&current_version={}&user_id={}",
        platform, current_version, user_id
    );

    let client = reqwest::Client::new();
    let response = client
        .get(&api_url)
        .header("Authorization", format!("Bearer {}", user_jwt_token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }

    let data: LatestVersionResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(data)
}
```

### 2. Download and Install Update

```rust
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;

#[tauri::command]
async fn download_and_install_update(
    download_url: String,
    sha256_hash: Option<String>,
) -> Result<String, String> {
    // Download installer to temp directory
    let temp_dir = std::env::temp_dir();
    let installer_path = temp_dir.join("lyceum_update.exe");

    println!("📥 Downloading update from: {}", download_url);

    let client = reqwest::Client::new();
    let response = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // Verify SHA256 hash if provided
    if let Some(expected_hash) = sha256_hash {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(&bytes);
        let result = hasher.finalize();
        let actual_hash = format!("{:x}", result);

        if actual_hash != expected_hash {
            return Err("Hash verification failed! Update may be corrupted.".to_string());
        }
        println!("✅ Hash verification passed");
    }

    // Save installer to disk
    let mut file = File::create(&installer_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;

    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    println!("✅ Update downloaded to: {:?}", installer_path);

    // Launch installer
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new(&installer_path)
            .spawn()
            .map_err(|e| format!("Failed to launch installer: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&installer_path)
            .spawn()
            .map_err(|e| format!("Failed to launch installer: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&installer_path)
            .spawn()
            .map_err(|e| format!("Failed to launch installer: {}", e))?;
    }

    Ok(format!("Update installer launched: {:?}", installer_path))
}
```

### 3. Frontend Integration (React/Vue/Svelte)

```typescript
// src/services/updateService.ts

interface UpdateCheckResponse {
  success: boolean
  update_available: boolean
  current_version: string
  latest_version: {
    version: string
    release_date: string
    download_url: string
    file_size_bytes?: number
    sha256_hash?: string
    changelog_url?: string
    release_notes?: string[]
    force_update: boolean
    installer_type: string
  }
}

export async function checkForUpdates(): Promise<UpdateCheckResponse> {
  const { invoke } = await import('@tauri-apps/api/tauri')

  // Get user JWT token from your auth system
  const userToken = localStorage.getItem('user_jwt_token')
  const userId = localStorage.getItem('user_id')
  const currentVersion = '1.0.0' // Or get from package.json

  if (!userToken || !userId) {
    throw new Error('User not authenticated')
  }

  const result = await invoke<UpdateCheckResponse>('check_for_updates', {
    userJwtToken: userToken,
    userId: userId,
    currentVersion: currentVersion,
  })

  return result
}

export async function downloadAndInstallUpdate(downloadUrl: string, sha256Hash?: string): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/tauri')

  await invoke('download_and_install_update', {
    downloadUrl,
    sha256Hash,
  })
}

// Auto-check on app launch
export async function initAutoUpdater() {
  try {
    console.log('🔍 Checking for updates...')
    const result = await checkForUpdates()

    if (result.update_available) {
      console.log(`✨ Update available: ${result.latest_version.version}`)

      // Show notification to user
      const shouldUpdate = await showUpdatePrompt(result.latest_version)

      if (shouldUpdate) {
        await downloadAndInstallUpdate(
          result.latest_version.download_url,
          result.latest_version.sha256_hash
        )
      }
    } else {
      console.log('✅ App is up to date')
    }
  } catch (error) {
    console.error('❌ Update check failed:', error)
  }
}

function showUpdatePrompt(versionInfo: any): Promise<boolean> {
  return new Promise((resolve) => {
    // Implement your UI prompt here
    const message = `
      A new version ${versionInfo.version} is available!

      ${versionInfo.release_notes?.join('\n') || 'Check changelog for details'}

      Would you like to update now?
    `

    const result = confirm(message)
    resolve(result)
  })
}
```

### 4. Call on App Launch

```typescript
// src/main.ts or src/App.tsx

import { initAutoUpdater } from './services/updateService'

// After app initialization and user authentication
async function onAppReady() {
  // Wait for user to be authenticated
  await waitForAuth()

  // Check for updates
  await initAutoUpdater()
}

onAppReady()
```

---

## Testing Auto-Update

### Step 1: Create Mock Version

1. Log in to Lyceum as **superadmin**
2. Go to **Admin Panel** → **Desktop-App**
3. Click **"Create Version"**
4. Fill in:
   - Version Number: `1.0.1` (higher than current)
   - Brand Type: `centcom` or `lyceum`
   - Installer Type: `exe` or `msi`
   - Release Stage: **Testing**
   - Download URL: Use a real installer URL or mock URL for testing
5. Click **"Create Version"**

### Step 2: Promote to Testing Stage

- If version was created as "Unreleased", click **"→ Testing"** to promote it
- Only admins/superadmins will be able to access this version

### Step 3: Test from Desktop App

1. Open desktop app as **admin or superadmin**
2. App should detect the update automatically on launch
3. Click "Update" when prompted
4. Installer should download and launch

### Step 4: Verify Update Check

```typescript
// In browser console or app console
const result = await checkForUpdates()
console.log(result)

// Should show:
// {
//   update_available: true,
//   latest_version: { version: "1.0.1", ... }
// }
```

### Step 5: Test with Regular User

1. Log in as regular user (not admin)
2. App should NOT see the testing version
3. Only production versions are available to regular users

### Step 6: Promote to Production

1. Go back to **Admin Panel** → **Desktop-App**
2. Find your version and click **"→ Production"**
3. Now ALL users (including regular users) will receive this update

---

## Periodic Update Checks

Instead of only checking on app launch, you can check periodically:

```typescript
// Check for updates every 6 hours
setInterval(async () => {
  try {
    const result = await checkForUpdates()
    if (result.update_available) {
      // Show subtle notification
      showUpdateNotification(result.latest_version)
    }
  } catch (error) {
    console.error('Update check failed:', error)
  }
}, 6 * 60 * 60 * 1000) // 6 hours in milliseconds
```

---

## Security Considerations

1. **Always verify SHA256 hash** when downloading updates
2. **Use HTTPS** for all API calls and downloads
3. **Validate JWT tokens** before making API requests
4. **Don't expose API keys** in the desktop app (only JWT tokens)
5. **Inform users** before downloading/installing updates

---

## Troubleshooting

### Update not detected

**Check:**
- Is user authenticated? (JWT token present)
- Is version number higher than current version?
- Is version promoted to correct stage (testing/production)?
- Is brand type correct (lyceum vs centcom)?
- Check browser/app console for errors

**Test API directly:**
```bash
curl -X GET "https://lyceum.yourdomain.com/api/centcom/versions/latest?platform=windows" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Download fails

**Check:**
- Is download URL accessible?
- Is file hosted on GitHub releases or publicly accessible?
- Check file permissions
- Verify URL format matches: `https://github.com/owner/repo/releases/download/tag/filename`

### Hash verification fails

**Check:**
- Was SHA256 hash provided when creating version?
- Is hash calculated correctly?
- Download file manually and verify hash:
  ```bash
  # Windows PowerShell
  Get-FileHash Centcom_1.0.1_x64-setup.exe -Algorithm SHA256

  # Linux/Mac
  sha256sum Centcom_1.0.1_x64-setup.exe
  ```

---

## API Response Fields Explained

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether API call succeeded |
| `update_available` | boolean | Whether a newer version exists |
| `current_version` | string | Version number passed in request |
| `latest_version.version` | string | Latest available version number |
| `latest_version.release_date` | string | ISO 8601 timestamp of release |
| `latest_version.download_url` | string | Direct download URL for installer |
| `latest_version.file_size_bytes` | number | Size of installer file in bytes |
| `latest_version.sha256_hash` | string | SHA256 hash for verification |
| `latest_version.changelog_url` | string | URL to release notes/changelog |
| `latest_version.release_notes` | array | List of changes in this version |
| `latest_version.force_update` | boolean | Whether update is mandatory |
| `latest_version.installer_type` | string | `exe` or `msi` |
| `latest_version.min_os_version` | string | Minimum OS version required |

---

## Version Comparison Logic

The API uses semantic versioning comparison:

```
1.0.0 < 1.0.1 < 1.1.0 < 2.0.0
```

**Examples:**
- Current: `1.0.0`, Latest: `1.0.1` → Update available ✅
- Current: `1.0.1`, Latest: `1.0.1` → No update ❌
- Current: `1.5.0`, Latest: `1.0.1` → No update (current is newer) ❌
- Current: `2.0.0-beta`, Latest: `2.0.0` → Update available ✅

---

## Summary

1. **Create mock version** via Admin Panel → Desktop-App → Create Version
2. **Set to Testing stage** for admin testing
3. **Desktop app calls** `/api/centcom/versions/latest` with JWT token
4. **API returns** latest version based on user role
5. **Desktop app downloads** and installs update
6. **Promote to Production** when ready for all users

For questions or issues, contact the Lyceum backend team or refer to the [GitHub Actions Setup Guide](./GITHUB_ACTIONS_SETUP_GUIDE.md) for automated version registration.
