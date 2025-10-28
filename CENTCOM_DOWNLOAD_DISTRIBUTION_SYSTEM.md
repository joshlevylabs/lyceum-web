# Centcom/Native Lyceum Download & Distribution System

**Version:** 1.0
**Last Updated:** 2025-10-27
**Status:** Implementation Ready

---

## Executive Summary

This document outlines the complete implementation plan for hosting, distributing, and auto-updating the Centcom/Native Lyceum desktop application through the Lyceum platform. The system will enable users to download the correct version for their operating system with one click from the dashboard, and allow the desktop application to check for and install updates automatically.

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Backend Implementation (Lyceum Team)](#backend-implementation-lyceum-team)
3. [Frontend Implementation (Lyceum Team)](#frontend-implementation-lyceum-team)
4. [Desktop Application Integration (Centcom Team)](#desktop-application-integration-centcom-team)
5. [Deployment & Release Process](#deployment--release-process)
6. [Security Considerations](#security-considerations)
7. [Testing & Validation](#testing--validation)
8. [Rollback Procedures](#rollback-procedures)

---

## System Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Lyceum Web Platform                          │
│  ┌─────────────────┐      ┌──────────────────────────────────┐ │
│  │   Dashboard UI  │──────│  Supabase Storage                │ │
│  │  (Download CTA) │      │  Bucket: centcom-releases        │ │
│  └─────────────────┘      │  - Windows: .exe, .msi           │ │
│          │                │  - macOS: .dmg, .pkg             │ │
│          │                │  - Linux: .AppImage, .deb, .rpm  │ │
│          ▼                └──────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Version API Endpoints                         │   │
│  │  - GET /api/centcom/versions/available                  │   │
│  │  - GET /api/centcom/versions/latest                     │   │
│  │  - GET /api/centcom/download/{version}/{platform}       │   │
│  │  - POST /api/centcom/download/track                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTPS API Calls
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              Centcom/Native Lyceum Desktop App                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Auto-Update Service                           │   │
│  │  - Check for updates on launch                          │   │
│  │  - Check for updates every 6 hours                      │   │
│  │  - Download update in background                        │   │
│  │  - Prompt user to install                               │   │
│  │  - Apply update on next restart                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Components

1. **Storage Layer**: Supabase Storage bucket for hosting application binaries
2. **API Layer**: RESTful endpoints for version management and downloads
3. **Dashboard UI**: User-facing download interface
4. **Desktop App**: Auto-update mechanism (Centcom team responsibility)

---

## Backend Implementation (Lyceum Team)

### 1. Supabase Storage Configuration

#### Create Storage Bucket

```sql
-- Create centcom-releases bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'centcom-releases',
  'centcom-releases',
  false, -- Private bucket, requires signed URLs
  524288000, -- 500MB max file size
  ARRAY[
    'application/x-msdownload', -- .exe
    'application/x-msi', -- .msi
    'application/x-apple-diskimage', -- .dmg
    'application/x-debian-package', -- .deb
    'application/x-rpm', -- .rpm
    'application/octet-stream' -- .AppImage
  ]
);
```

#### Set Storage Policies (RLS)

```sql
-- Allow authenticated users to read releases (with license validation)
CREATE POLICY "Authenticated users can read releases"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'centcom-releases');

-- Only admins can upload/delete releases
CREATE POLICY "Only admins can upload releases"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'centcom-releases' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

CREATE POLICY "Only admins can delete releases"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'centcom-releases' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);
```

#### File Structure Convention

```
centcom-releases/
├── windows/
│   ├── 1.0.0/
│   │   ├── centcom-setup-1.0.0.exe
│   │   ├── centcom-setup-1.0.0.msi
│   │   └── manifest.json
│   ├── 1.0.1/
│   │   ├── centcom-setup-1.0.1.exe
│   │   ├── centcom-setup-1.0.1.msi
│   │   └── manifest.json
├── macos/
│   ├── 1.0.0/
│   │   ├── centcom-1.0.0.dmg
│   │   ├── centcom-1.0.0.pkg
│   │   └── manifest.json
├── linux/
│   ├── 1.0.0/
│   │   ├── centcom-1.0.0.AppImage
│   │   ├── centcom-1.0.0.deb
│   │   ├── centcom-1.0.0.rpm
│   │   └── manifest.json
```

**manifest.json example:**
```json
{
  "version": "1.0.0",
  "platform": "windows",
  "files": [
    {
      "type": "installer",
      "format": "exe",
      "size": 125829120,
      "sha256": "abc123...",
      "filename": "centcom-setup-1.0.0.exe"
    },
    {
      "type": "installer",
      "format": "msi",
      "size": 123456789,
      "sha256": "def456...",
      "filename": "centcom-setup-1.0.0.msi"
    }
  ],
  "release_notes": "Initial release with local cluster support",
  "required_license_types": ["trial", "standard", "professional", "enterprise"],
  "min_os_version": {
    "windows": "10.0.0",
    "macos": "10.15",
    "linux": "Ubuntu 20.04"
  }
}
```

### 2. Database Schema Updates

#### Extend `application_versions` Table

```sql
-- Add platform-specific fields
ALTER TABLE application_versions
ADD COLUMN IF NOT EXISTS platform VARCHAR(20) CHECK (platform IN ('windows', 'macos', 'linux', 'all')),
ADD COLUMN IF NOT EXISTS architecture VARCHAR(20) CHECK (architecture IN ('x64', 'arm64', 'x86', 'universal')),
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS sha256_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS installer_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS auto_update_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS force_update BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_app_versions_platform_stable
ON application_versions(application_name, platform, is_stable, release_date DESC);
```

#### Create `application_downloads` Tracking Table

```sql
CREATE TABLE IF NOT EXISTS application_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  application_name VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  installer_type VARCHAR(20),
  license_type VARCHAR(50),
  download_started_at TIMESTAMPTZ DEFAULT NOW(),
  download_completed_at TIMESTAMPTZ,
  was_successful BOOLEAN,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_downloads_user ON application_downloads(user_id, created_at DESC);
CREATE INDEX idx_downloads_version ON application_downloads(application_name, version, created_at DESC);
```

#### Create `application_update_checks` Tracking Table

```sql
CREATE TABLE IF NOT EXISTS application_update_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  application_name VARCHAR(100) NOT NULL,
  current_version VARCHAR(50) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  latest_version_available VARCHAR(50),
  update_available BOOLEAN,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_update_checks_user ON application_update_checks(user_id, checked_at DESC);
```

### 3. API Endpoints Implementation

#### 3.1. GET `/api/centcom/versions/latest`

**Purpose**: Get the latest version for a specific platform

**File Location**: `src/app/api/centcom/versions/latest/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const platform = searchParams.get('platform') // windows, macos, linux
    const currentVersion = searchParams.get('current_version')
    const userId = searchParams.get('user_id')
    const licenseType = searchParams.get('license_type')

    if (!platform) {
      return NextResponse.json({
        success: false,
        error: 'Platform parameter is required'
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get user's license type if not provided
    let userLicenseType = licenseType
    if (userId && !licenseType) {
      userLicenseType = await getUserLicenseType(supabase, userId)
    }

    // Query latest stable version for platform
    const { data: latestVersion, error } = await supabase
      .from('application_versions')
      .select('*')
      .eq('application_name', 'centcom')
      .eq('platform', platform)
      .eq('is_stable', true)
      .eq('is_supported', true)
      .eq('auto_update_enabled', true)
      .order('release_date', { ascending: false })
      .limit(1)
      .single()

    if (error || !latestVersion) {
      return NextResponse.json({
        success: false,
        error: 'No stable version found for this platform'
      }, { status: 404 })
    }

    // Check if update is available
    const updateAvailable = currentVersion
      ? compareVersions(latestVersion.version_number, currentVersion) > 0
      : true

    // Log update check
    if (userId) {
      await supabase.from('application_update_checks').insert({
        user_id: userId,
        application_name: 'centcom',
        current_version: currentVersion || 'unknown',
        platform: platform,
        latest_version_available: latestVersion.version_number,
        update_available: updateAvailable,
        ip_address: req.headers.get('x-forwarded-for') || req.ip,
        user_agent: req.headers.get('user-agent')
      })
    }

    // Generate signed download URL (valid for 1 hour)
    const { data: signedUrlData } = await supabase.storage
      .from('centcom-releases')
      .createSignedUrl(latestVersion.storage_path, 3600)

    return NextResponse.json({
      success: true,
      update_available: updateAvailable,
      current_version: currentVersion,
      latest_version: {
        version: latestVersion.version_number,
        release_date: latestVersion.release_date,
        download_url: signedUrlData?.signedUrl || latestVersion.download_url,
        file_size_bytes: latestVersion.file_size_bytes,
        sha256_hash: latestVersion.sha256_hash,
        changelog_url: latestVersion.changelog_url,
        release_notes: latestVersion.breaking_changes || [],
        force_update: latestVersion.force_update,
        installer_type: latestVersion.installer_type,
        min_os_version: latestVersion.min_license_version
      }
    })

  } catch (error: any) {
    console.error('Latest version check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Helper: Compare semantic versions
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0
    const num2 = parts2[i] || 0

    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }

  return 0
}

// Helper: Get user's license type (reuse from existing code)
async function getUserLicenseType(supabase: any, userId: string): Promise<string | null> {
  // ... (Use existing implementation from /api/centcom/versions/available)
  return 'trial' // placeholder
}
```

#### 3.2. GET `/api/centcom/download/[version]/[platform]`

**Purpose**: Generate signed download URL with tracking

**File Location**: `src/app/api/centcom/download/[version]/[platform]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  req: NextRequest,
  { params }: { params: { version: string; platform: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const installerType = searchParams.get('installer_type') || 'exe'

    // Validate authorization
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Verify user has valid license
    const userLicense = await getUserLicenseType(supabase, userId)
    if (!userLicense) {
      return NextResponse.json({
        success: false,
        error: 'No valid license found'
      }, { status: 403 })
    }

    // Get version details
    const { data: version, error } = await supabase
      .from('application_versions')
      .select('*')
      .eq('application_name', 'centcom')
      .eq('version_number', params.version)
      .eq('platform', params.platform)
      .single()

    if (error || !version) {
      return NextResponse.json({
        success: false,
        error: 'Version not found'
      }, { status: 404 })
    }

    // Generate signed download URL (valid for 2 hours)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('centcom-releases')
      .createSignedUrl(version.storage_path, 7200)

    if (urlError || !signedUrlData?.signedUrl) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate download URL'
      }, { status: 500 })
    }

    // Track download initiation
    const downloadId = await trackDownload(supabase, {
      userId,
      applicationName: 'centcom',
      version: params.version,
      platform: params.platform,
      installerType,
      licenseType: userLicense,
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent')
    })

    return NextResponse.json({
      success: true,
      download_id: downloadId,
      download_url: signedUrlData.signedUrl,
      file_name: version.storage_path.split('/').pop(),
      file_size_bytes: version.file_size_bytes,
      sha256_hash: version.sha256_hash,
      expires_in: 7200 // 2 hours
    })

  } catch (error: any) {
    console.error('Download URL generation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

async function trackDownload(supabase: any, downloadData: any) {
  const { data, error } = await supabase
    .from('application_downloads')
    .insert({
      user_id: downloadData.userId,
      application_name: downloadData.applicationName,
      version: downloadData.version,
      platform: downloadData.platform,
      installer_type: downloadData.installerType,
      license_type: downloadData.licenseType,
      ip_address: downloadData.ipAddress,
      user_agent: downloadData.userAgent
    })
    .select('id')
    .single()

  return data?.id
}

async function getUserLicenseType(supabase: any, userId: string): Promise<string | null> {
  // ... (Use existing implementation)
  return 'trial'
}
```

#### 3.3. POST `/api/centcom/download/track`

**Purpose**: Track download completion/failure

**File Location**: `src/app/api/centcom/download/track/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { download_id, status, error_message } = body

    if (!download_id) {
      return NextResponse.json({
        success: false,
        error: 'Download ID is required'
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Update download record
    const { error } = await supabase
      .from('application_downloads')
      .update({
        download_completed_at: new Date().toISOString(),
        was_successful: status === 'success',
        error_message: error_message || null
      })
      .eq('id', download_id)

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update download record'
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Download tracking error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
```

### 4. Admin Endpoints (Upload Releases)

#### POST `/api/admin/centcom/releases/upload`

**Purpose**: Upload new release to Supabase Storage and create version record

**File Location**: `src/app/api/admin/centcom/releases/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '500mb'
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const version = formData.get('version') as string
    const platform = formData.get('platform') as string
    const installerType = formData.get('installer_type') as string
    const changelog = formData.get('changelog') as string
    const isStable = formData.get('is_stable') === 'true'
    const forceUpdate = formData.get('force_update') === 'true'

    if (!file || !version || !platform) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate storage path
    const storagePath = `${platform}/${version}/${file.name}`

    // Calculate SHA256 hash
    const fileBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
    const sha256Hash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('centcom-releases')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Create version record
    const { data: versionData, error: versionError } = await supabase
      .from('application_versions')
      .insert({
        application_name: 'centcom',
        version_number: version,
        platform: platform,
        architecture: 'x64', // Default, can be parameterized
        installer_type: installerType,
        file_size_bytes: file.size,
        sha256_hash: sha256Hash,
        storage_path: storagePath,
        release_date: new Date().toISOString(),
        is_stable: isStable,
        is_supported: true,
        auto_update_enabled: true,
        force_update: forceUpdate,
        changelog_url: changelog || null
      })
      .select()
      .single()

    if (versionError) {
      // Rollback: Delete uploaded file
      await supabase.storage.from('centcom-releases').remove([storagePath])
      return NextResponse.json({ error: `Version creation failed: ${versionError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      version: versionData
    })

  } catch (error: any) {
    console.error('Release upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## Frontend Implementation (Lyceum Team)

### 1. Dashboard UI Component

#### Add Download Section to Dashboard

**File**: `src/app/dashboard/page.tsx`

Add a new stat card and section for desktop app downloads:

```typescript
// Add to existing stats interface
interface DashboardStats {
  testDataProjects: number
  connectedClusters: number
  groups: number
  onboardingSessions: number
  centcomVersion: string | null  // ADD THIS
}

// Add state for desktop app info
const [desktopAppInfo, setDesktopAppInfo] = useState<{
  hasApp: boolean
  currentVersion: string | null
  latestVersion: string | null
  updateAvailable: boolean
  platform: string
} | null>(null)

// Add fetch function for desktop app version
const fetchDesktopAppInfo = async () => {
  if (!user) return

  try {
    const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
    if (!session?.access_token) return

    // Detect user's platform
    const platform = detectPlatform()

    const response = await fetch(
      `/api/centcom/versions/latest?platform=${platform}&user_id=${user.id}`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      setDesktopAppInfo({
        hasApp: false, // Will be true if Centcom is installed and reports version
        currentVersion: null,
        latestVersion: data.latest_version?.version,
        updateAvailable: data.update_available,
        platform: platform
      })
    }
  } catch (error) {
    console.warn('Could not fetch desktop app info:', error)
  }
}

// Helper function to detect platform
const detectPlatform = (): string => {
  if (typeof window === 'undefined') return 'windows'

  const userAgent = window.navigator.userAgent.toLowerCase()

  if (userAgent.includes('win')) return 'windows'
  if (userAgent.includes('mac')) return 'macos'
  if (userAgent.includes('linux')) return 'linux'

  return 'windows' // Default fallback
}

// Call in useEffect
useEffect(() => {
  if (user && !loading) {
    fetchDashboardStats()
    fetchOnboardingSessions()
    fetchTickets()
    fetchDesktopAppInfo() // ADD THIS
  }
}, [user, loading])
```

#### Add Desktop App Download Card

Insert this new card in the stats grid section (around line 562):

```typescript
{/* Desktop App Download - Add after Onboarding Sessions card */}
<div className="overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow ring-1 ring-indigo-400">
  <div className="p-5">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      </div>
      <div className="ml-5 w-0 flex-1">
        <dl>
          <dt className="truncate text-sm font-medium text-indigo-100">
            Desktop Application
          </dt>
          <dd className="mt-1 text-lg font-semibold text-white">
            {desktopAppInfo?.hasApp ? (
              <>
                v{desktopAppInfo.currentVersion}
                {desktopAppInfo.updateAvailable && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-400 text-yellow-900">
                    Update Available
                  </span>
                )}
              </>
            ) : (
              'Not Installed'
            )}
          </dd>
        </dl>
      </div>
    </div>
    <div className="mt-4">
      <button
        onClick={() => setShowDownloadModal(true)}
        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
        {desktopAppInfo?.hasApp ? 'Download Update' : 'Download Centcom'}
      </button>
    </div>
  </div>
</div>
```

#### Add Download Modal Component

Add this modal near the other modals (around line 1074):

```typescript
{/* Download Centcom Modal */}
{showDownloadModal && desktopAppInfo && (
  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div className="relative top-20 mx-auto p-5 border max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
      <div className="mt-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Download {userProfile?.license_type?.includes('CENTCOM') ? 'Centcom' : 'Native Lyceum'}
          </h3>
          <button
            onClick={() => setShowDownloadModal(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Latest Version: {desktopAppInfo.latestVersion}
                </h3>
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                  <p>Platform detected: <strong className="capitalize">{desktopAppInfo.platform}</strong></p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Choose your installer format:
            </h4>
            <div className="space-y-2">
              {desktopAppInfo.platform === 'windows' && (
                <>
                  <button
                    onClick={() => handleDownload('exe')}
                    className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center">
                      <svg className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                      </svg>
                      <div className="ml-3 text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Setup.exe (Recommended)
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Standard Windows installer
                        </p>
                      </div>
                    </div>
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDownload('msi')}
                    className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center">
                      <svg className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                      </svg>
                      <div className="ml-3 text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Setup.msi
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          For enterprise deployment
                        </p>
                      </div>
                    </div>
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </>
              )}
              {desktopAppInfo.platform === 'macos' && (
                <>
                  <button
                    onClick={() => handleDownload('dmg')}
                    className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center">
                      <svg className="h-8 w-8 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                      </svg>
                      <div className="ml-3 text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Disk Image (.dmg)
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Standard macOS installer
                        </p>
                      </div>
                    </div>
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </>
              )}
              {desktopAppInfo.platform === 'linux' && (
                <>
                  <button
                    onClick={() => handleDownload('AppImage')}
                    className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center">
                      <svg className="h-8 w-8 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.84-.41 1.684-.287 2.489a6.372 6.372 0 002.716 4.521c.885.584 1.249.584 2.716.584 1.092 0 2.716-.584 2.716-2.489 0-1.467.584-2.716 1.467-2.716 1.467 0 2.716 1.467 2.716 2.716 0 1.905 1.624 2.489 2.716 2.489 1.467 0 1.831 0 2.716-.584a6.372 6.372 0 002.716-4.521c.123-.805-.009-1.649-.287-2.489-.589-1.771-1.831-3.47-2.716-4.521-.75-1.067-.974-1.928-1.05-3.02-.065-1.491 1.056-5.965-3.17-6.298-.165-.013-.325-.021-.48-.021z" />
                      </svg>
                      <div className="ml-3 text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          AppImage
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Universal Linux package
                        </p>
                      </div>
                    </div>
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDownload('deb')}
                    className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center">
                      <svg className="h-8 w-8 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.84-.41 1.684-.287 2.489a6.372 6.372 0 002.716 4.521c.885.584 1.249.584 2.716.584 1.092 0 2.716-.584 2.716-2.489 0-1.467.584-2.716 1.467-2.716 1.467 0 2.716 1.467 2.716 2.716 0 1.905 1.624 2.489 2.716 2.489 1.467 0 1.831 0 2.716-.584a6.372 6.372 0 002.716-4.521c.123-.805-.009-1.649-.287-2.489-.589-1.771-1.831-3.47-2.716-4.521-.75-1.067-.974-1.928-1.05-3.02-.065-1.491 1.056-5.965-3.17-6.298-.165-.013-.325-.021-.48-.021z" />
                      </svg>
                      <div className="ml-3 text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Debian Package (.deb)
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          For Debian/Ubuntu systems
                        </p>
                      </div>
                    </div>
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-xs text-gray-600 dark:text-gray-400">
            <p className="font-medium text-gray-900 dark:text-white mb-1">System Requirements:</p>
            <ul className="list-disc list-inside space-y-1">
              {desktopAppInfo.platform === 'windows' && (
                <>
                  <li>Windows 10 or later (64-bit)</li>
                  <li>4GB RAM minimum (8GB recommended)</li>
                  <li>500MB available disk space</li>
                </>
              )}
              {desktopAppInfo.platform === 'macos' && (
                <>
                  <li>macOS 10.15 (Catalina) or later</li>
                  <li>4GB RAM minimum (8GB recommended)</li>
                  <li>500MB available disk space</li>
                </>
              )}
              {desktopAppInfo.platform === 'linux' && (
                <>
                  <li>Ubuntu 20.04+ or equivalent</li>
                  <li>4GB RAM minimum (8GB recommended)</li>
                  <li>500MB available disk space</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
```

#### Add Download Handler Function

```typescript
const [downloadingApp, setDownloadingApp] = useState(false)
const [showDownloadModal, setShowDownloadModal] = useState(false)

const handleDownload = async (installerType: string) => {
  if (!user || !desktopAppInfo) return

  setDownloadingApp(true)

  try {
    const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
    if (!session?.access_token) {
      setDownloadingApp(false)
      return
    }

    const response = await fetch(
      `/api/centcom/download/${desktopAppInfo.latestVersion}/${desktopAppInfo.platform}?user_id=${user.id}&installer_type=${installerType}`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to get download URL')
    }

    const data = await response.json()

    // Trigger download
    const link = document.createElement('a')
    link.href = data.download_url
    link.download = data.file_name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Track download completion
    await fetch('/api/centcom/download/track', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        download_id: data.download_id,
        status: 'success'
      })
    })

    setShowDownloadModal(false)

  } catch (error) {
    console.error('Download error:', error)
    alert('Failed to download application. Please try again.')
  } finally {
    setDownloadingApp(false)
  }
}
```

---

## Desktop Application Integration (Centcom Team)

This section outlines what the **Centcom development team** needs to implement in their desktop application to enable auto-updates.

### 1. Auto-Update Service Architecture

#### Recommended Technologies

- **Electron**: Use `electron-updater` package
- **Tauri**: Use built-in updater module
- **Native (C++/C#/Rust)**: Implement custom update checker

#### Update Flow

```
App Launch
    │
    ├─> Check for updates (background)
    │   └─> Call: GET /api/centcom/versions/latest
    │       └─> Compare current version with latest
    │           ├─> If update available
    │           │   ├─> Download installer (signed URL)
    │           │   ├─> Verify SHA256 hash
    │           │   ├─> Store in temp directory
    │           │   └─> Show update notification
    │           └─> If no update
    │               └─> Continue normal operation
    │
    ├─> Schedule periodic checks (every 6 hours)
    │
    └─> User clicks "Install Update"
        ├─> Close application gracefully
        ├─> Run installer with elevated privileges
        └─> Restart application
```

### 2. Implementation Requirements

#### 2.1. Version Check on Launch

**Pseudo-code:**

```javascript
// On application startup
async function checkForUpdates() {
  try {
    // Get current app version from package.json or binary metadata
    const currentVersion = app.getVersion() // e.g., "1.0.0"

    // Get user session token (from login)
    const authToken = await getUserAuthToken()
    const userId = await getUserId()

    // Detect platform
    const platform = process.platform === 'win32' ? 'windows'
                   : process.platform === 'darwin' ? 'macos'
                   : 'linux'

    // Call Lyceum API
    const response = await fetch(
      `https://lyceum.app/api/centcom/versions/latest?` +
      `platform=${platform}&current_version=${currentVersion}&user_id=${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'User-Agent': `Centcom/${currentVersion} (${platform})`
        }
      }
    )

    const data = await response.json()

    if (data.success && data.update_available) {
      // Show update notification
      showUpdateNotification({
        currentVersion: currentVersion,
        latestVersion: data.latest_version.version,
        releaseNotes: data.latest_version.release_notes,
        forceUpdate: data.latest_version.force_update
      })
    }

  } catch (error) {
    console.error('Update check failed:', error)
    // Fail silently, don't block app launch
  }
}

// Call on app ready
app.whenReady().then(() => {
  checkForUpdates()
})
```

#### 2.2. Periodic Update Checks

```javascript
// Check for updates every 6 hours (21600000 ms)
setInterval(() => {
  checkForUpdates()
}, 6 * 60 * 60 * 1000)
```

#### 2.3. Download Update

```javascript
async function downloadUpdate(updateInfo) {
  try {
    const authToken = await getUserAuthToken()
    const userId = await getUserId()
    const platform = getPlatform()

    // Get download URL
    const response = await fetch(
      `https://lyceum.app/api/centcom/download/${updateInfo.version}/${platform}?` +
      `user_id=${userId}&installer_type=exe`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    )

    const data = await response.json()

    // Download file
    const downloadPath = path.join(app.getPath('temp'), data.file_name)

    // Stream download with progress
    const fileStream = fs.createWriteStream(downloadPath)
    const downloadResponse = await fetch(data.download_url)
    const reader = downloadResponse.body.getReader()

    let downloadedBytes = 0
    const totalBytes = data.file_size_bytes

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      fileStream.write(value)
      downloadedBytes += value.length

      // Update progress bar
      const progress = (downloadedBytes / totalBytes) * 100
      updateDownloadProgress(progress)
    }

    fileStream.end()

    // Verify SHA256 hash
    const fileHash = await calculateSHA256(downloadPath)
    if (fileHash !== data.sha256_hash) {
      throw new Error('File integrity check failed')
    }

    // Track successful download
    await fetch('https://lyceum.app/api/centcom/download/track', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        download_id: data.download_id,
        status: 'success'
      })
    })

    // Store update info for installation
    app.setUpdateInfo({
      installerPath: downloadPath,
      version: updateInfo.version
    })

    // Show "Install Now" notification
    showInstallNotification()

  } catch (error) {
    console.error('Update download failed:', error)

    // Track failed download
    await fetch('https://lyceum.app/api/centcom/download/track', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        download_id: data.download_id,
        status: 'failed',
        error_message: error.message
      })
    })
  }
}
```

#### 2.4. Install Update

```javascript
async function installUpdate() {
  const updateInfo = app.getUpdateInfo()

  if (!updateInfo || !fs.existsSync(updateInfo.installerPath)) {
    console.error('Update installer not found')
    return
  }

  // Close all windows
  BrowserWindow.getAllWindows().forEach(win => win.close())

  // Run installer with elevated privileges
  if (process.platform === 'win32') {
    // Windows: Run .exe or .msi
    const { spawn } = require('child_process')
    spawn(updateInfo.installerPath, [], {
      detached: true,
      stdio: 'ignore'
    })
  } else if (process.platform === 'darwin') {
    // macOS: Open .dmg or run .pkg
    const { exec } = require('child_process')
    exec(`open "${updateInfo.installerPath}"`)
  } else if (process.platform === 'linux') {
    // Linux: Run AppImage or install .deb
    const { exec } = require('child_process')
    if (updateInfo.installerPath.endsWith('.AppImage')) {
      exec(`chmod +x "${updateInfo.installerPath}" && "${updateInfo.installerPath}"`)
    } else if (updateInfo.installerPath.endsWith('.deb')) {
      exec(`sudo dpkg -i "${updateInfo.installerPath}"`)
    }
  }

  // Quit application
  app.quit()
}
```

#### 2.5. UI Notifications

**Update Available Notification:**

```javascript
function showUpdateNotification(updateInfo) {
  const notification = new Notification({
    title: 'Update Available',
    body: `Version ${updateInfo.latestVersion} is now available. You're currently on ${updateInfo.currentVersion}.`,
    actions: [
      { type: 'button', text: 'Download Now' },
      { type: 'button', text: 'Later' }
    ]
  })

  notification.on('action', (event, index) => {
    if (index === 0) {
      downloadUpdate(updateInfo)
    }
  })

  notification.show()
}
```

**Install Ready Notification:**

```javascript
function showInstallNotification() {
  const notification = new Notification({
    title: 'Update Ready to Install',
    body: 'The update has been downloaded. Restart to apply the update.',
    actions: [
      { type: 'button', text: 'Restart Now' },
      { type: 'button', text: 'Later' }
    ]
  })

  notification.on('action', (event, index) => {
    if (index === 0) {
      installUpdate()
    }
  })

  notification.show()
}
```

### 3. Security Considerations

1. **Always use HTTPS** for API calls
2. **Verify SHA256 hash** of downloaded files before installation
3. **Validate JWT token** on every API request
4. **Handle expired tokens** gracefully (refresh or re-authenticate)
5. **Store download path securely** (use OS temp directory)
6. **Clean up installers** after successful installation

### 4. Error Handling

```javascript
// Implement retry logic for network failures
async function checkForUpdatesWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await checkForUpdates()
      return
    } catch (error) {
      console.error(`Update check attempt ${i + 1} failed:`, error)

      if (i === maxRetries - 1) {
        // Final failure - log and give up
        console.error('Update check failed after max retries')
      } else {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)))
      }
    }
  }
}
```

### 5. Testing Checklist for Centcom Team

- [ ] Update check triggers on app launch
- [ ] Periodic update checks run every 6 hours
- [ ] Current version is correctly detected
- [ ] API authentication works with Centcom JWT
- [ ] Download progress is shown to user
- [ ] SHA256 verification works correctly
- [ ] Installer runs with correct permissions
- [ ] App restarts after update installation
- [ ] Old versions are cleaned up after update
- [ ] Error messages are user-friendly
- [ ] Force update scenario is handled (blocks app until updated)
- [ ] Offline mode gracefully skips update check

---

## Deployment & Release Process

### 1. Preparing a New Release

#### Step 1: Build Application Binaries

**Centcom team builds for all platforms:**

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

#### Step 2: Calculate SHA256 Hashes

```bash
# Windows
certutil -hashfile centcom-setup-1.0.0.exe SHA256

# macOS/Linux
sha256sum centcom-setup-1.0.0.exe
```

#### Step 3: Upload to Lyceum Platform

**Using Admin UI (Recommended):**

1. Log in to Lyceum as admin
2. Navigate to `/admin/releases`
3. Click "Upload New Release"
4. Fill in form:
   - Version: `1.0.0`
   - Platform: `windows`
   - Installer Type: `exe`
   - File: Select binary
   - Is Stable: ✓
   - Force Update: (only if critical security fix)
   - Release Notes: Markdown text
5. Click "Upload"

**Using API (Alternative):**

```bash
curl -X POST https://lyceum.app/api/admin/centcom/releases/upload \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F "file=@centcom-setup-1.0.0.exe" \
  -F "version=1.0.0" \
  -F "platform=windows" \
  -F "installer_type=exe" \
  -F "is_stable=true" \
  -F "force_update=false" \
  -F "changelog=## New Features\n- Added local cluster support\n- Improved performance"
```

#### Step 4: Verify Upload

```bash
curl https://lyceum.app/api/centcom/versions/latest?platform=windows
```

Should return the new version.

### 2. Release Channels

#### Stable (Production)

- `is_stable: true`
- `auto_update_enabled: true`
- Deployed to all users automatically

#### Beta (Pre-release)

- `is_stable: false`
- `auto_update_enabled: true`
- Only users with `include_unstable=true` flag

#### Alpha (Internal Testing)

- `is_stable: false`
- `auto_update_enabled: false`
- Manual download only

### 3. Rollback Procedure

If a release has critical bugs:

```sql
-- Disable auto-update for problematic version
UPDATE application_versions
SET auto_update_enabled = false
WHERE application_name = 'centcom'
  AND version_number = '1.0.1'
  AND platform = 'windows';

-- Re-enable previous stable version
UPDATE application_versions
SET is_stable = true, auto_update_enabled = true
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
  AND platform = 'windows';
```

---

## Security Considerations

### 1. Access Control

- Only authenticated users with valid licenses can download
- Signed URLs expire after 2 hours
- Download attempts are logged with IP address

### 2. File Integrity

- All binaries must have SHA256 hashes
- Desktop app verifies hash before installation
- Corrupted downloads are rejected

### 3. License Validation

- API checks user's license type before generating download URL
- Trial users can download but may have feature limitations
- Expired licenses are blocked from downloading

### 4. Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
// In API routes
const MAX_DOWNLOADS_PER_HOUR = 5
const MAX_UPDATE_CHECKS_PER_HOUR = 20

// Check user's download count
const downloadCount = await supabase
  .from('application_downloads')
  .select('id')
  .eq('user_id', userId)
  .gte('created_at', new Date(Date.now() - 3600000).toISOString())

if (downloadCount.length >= MAX_DOWNLOADS_PER_HOUR) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
}
```

---

## Testing & Validation

### Backend Testing

```bash
# Test version check API
curl "https://lyceum.app/api/centcom/versions/latest?platform=windows&current_version=0.9.0"

# Test download URL generation
curl "https://lyceum.app/api/centcom/download/1.0.0/windows?user_id=<UUID>" \
  -H "Authorization: Bearer <TOKEN>"

# Test download tracking
curl -X POST "https://lyceum.app/api/centcom/download/track" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"download_id":"<UUID>","status":"success"}'
```

### Frontend Testing

1. Log in to dashboard
2. Verify "Desktop Application" card appears
3. Click "Download Centcom"
4. Verify platform is correctly detected
5. Click installer type button
6. Verify file downloads with correct name

### Desktop App Testing

1. Launch app with version 0.9.0
2. Verify update notification appears (if 1.0.0 is available)
3. Click "Download Now"
4. Verify progress bar shows download progress
5. Verify "Install Now" notification appears when done
6. Click "Restart Now"
7. Verify app restarts with version 1.0.0

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Download Metrics**
   - Total downloads per version
   - Downloads by platform
   - Downloads by license type
   - Failed download rate

2. **Update Adoption**
   - % of users on latest version
   - Time to 50% adoption
   - Update check frequency

3. **Performance**
   - Average download time
   - Download success rate
   - API response times

### Dashboard Queries

```sql
-- Download stats by version
SELECT
  version,
  platform,
  COUNT(*) as download_count,
  COUNT(*) FILTER (WHERE was_successful = true) as successful_downloads,
  COUNT(*) FILTER (WHERE was_successful = false) as failed_downloads
FROM application_downloads
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY version, platform
ORDER BY download_count DESC;

-- Update check frequency
SELECT
  DATE_TRUNC('day', checked_at) as check_date,
  COUNT(*) as check_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE update_available = true) as updates_available
FROM application_update_checks
WHERE checked_at > NOW() - INTERVAL '30 days'
GROUP BY check_date
ORDER BY check_date DESC;

-- Version adoption
SELECT
  current_version,
  COUNT(DISTINCT user_id) as user_count,
  ROUND(COUNT(DISTINCT user_id)::numeric / SUM(COUNT(DISTINCT user_id)) OVER () * 100, 2) as percentage
FROM application_update_checks
WHERE checked_at > NOW() - INTERVAL '1 day'
GROUP BY current_version
ORDER BY user_count DESC;
```

---

## FAQ

### For Centcom Team

**Q: How often should we check for updates?**
A: On app launch and every 6 hours. Don't check more frequently to avoid rate limiting.

**Q: What if the user is offline when an update is available?**
A: The update check will fail silently. Next time they're online and the app checks, they'll see the notification.

**Q: Should we force users to update immediately?**
A: Only for critical security patches. Set `force_update: true` in the version record, and block app usage until updated.

**Q: How do we handle beta testers?**
A: Include `include_unstable=true` in the API request. Beta versions should have `is_stable: false`.

**Q: What happens if SHA256 verification fails?**
A: Delete the corrupted file and show error message. Optionally, retry download once.

### For Lyceum Team

**Q: How do we handle multiple installers for the same version?**
A: Create separate `application_versions` records for each installer type (exe, msi, dmg, etc.) with the same version number but different `installer_type` values.

**Q: Can we revoke access to old versions?**
A: Yes, set `is_supported: false` or `auto_update_enabled: false` to hide from version list.

**Q: How much storage will this require?**
A: Each binary is ~100-200MB. With 3 platforms × 2 installer types × 10 versions = ~6GB per major version cycle.

**Q: Can we do gradual rollouts?**
A: Yes, add a `rollout_percentage` field and randomly assign users to receive the update.

---

## Next Steps

### Immediate Actions (Week 1)

**Lyceum Team:**
- [ ] Create `centcom-releases` Supabase storage bucket
- [ ] Run database migration scripts
- [ ] Implement `/api/centcom/versions/latest` endpoint
- [ ] Implement `/api/centcom/download/[version]/[platform]` endpoint
- [ ] Add dashboard UI download section

**Centcom Team:**
- [ ] Review auto-update implementation requirements
- [ ] Choose update framework (electron-updater, Tauri updater, etc.)
- [ ] Implement version check on app launch

### Short-term Goals (Week 2-3)

**Lyceum Team:**
- [ ] Implement admin upload UI
- [ ] Add download tracking and analytics
- [ ] Test all API endpoints

**Centcom Team:**
- [ ] Implement update download with progress
- [ ] Implement SHA256 verification
- [ ] Implement installer execution
- [ ] Test update flow end-to-end

### Long-term Enhancements

- [ ] Add delta updates (only download changed files)
- [ ] Implement automatic rollback on failed updates
- [ ] Add in-app changelog viewer
- [ ] Create admin dashboard for release management
- [ ] Add A/B testing for gradual rollouts
- [ ] Implement crash reporting integration

---

## Support & Contact

**For implementation questions:**
- Lyceum Team: josh@thelyceum.io
- Centcom Team: [Contact TBD]

**Documentation:**
- API Reference: https://lyceum.app/docs/api
- Supabase Storage: https://supabase.com/docs/guides/storage

---

**Document Version:** 1.0
**Last Updated:** 2025-10-27
**Next Review:** 2025-11-10
