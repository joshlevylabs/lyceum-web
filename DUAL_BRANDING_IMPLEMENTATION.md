# Dual-Branding Implementation Guide

**Technical implementation guide for Lyceum/Centcom branded versions**

This document provides ready-to-use SQL scripts and code changes for implementing the dual-branding system.

---

## Phase 1: Database Schema Updates

### Step 1: Add brand_type to organizations table

**File:** `ADD_BRAND_TYPE_TO_ORGANIZATIONS.sql`

```sql
-- Add brand_type column to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS brand_type TEXT DEFAULT 'lyceum'
CHECK (brand_type IN ('lyceum', 'centcom'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_brand_type
ON organizations(brand_type);

-- Set default for all existing organizations
UPDATE organizations
SET brand_type = 'lyceum'
WHERE brand_type IS NULL;

-- Verify the update
SELECT
  id,
  name,
  brand_type,
  created_at
FROM organizations
ORDER BY name;
```

---

### Step 2: Add brand_type to application_versions table

**File:** `ADD_BRAND_TYPE_TO_VERSIONS.sql`

```sql
-- Add brand_type column to application_versions table
ALTER TABLE application_versions
ADD COLUMN IF NOT EXISTS brand_type TEXT DEFAULT 'lyceum'
CHECK (brand_type IN ('lyceum', 'centcom'));

-- Update existing records to have lyceum brand
UPDATE application_versions
SET brand_type = 'lyceum'
WHERE brand_type IS NULL;

-- Drop old unique constraint
ALTER TABLE application_versions
DROP CONSTRAINT IF EXISTS application_versions_app_version_platform_installer_key;

-- Add new unique constraint including brand_type
ALTER TABLE application_versions
ADD CONSTRAINT application_versions_unique_version
UNIQUE (application_name, version_number, platform, installer_type, brand_type);

-- Create index for brand lookups
CREATE INDEX IF NOT EXISTS idx_application_versions_brand
ON application_versions(brand_type, platform, release_date DESC);

-- Verify the update
SELECT
  id,
  application_name,
  version_number,
  platform,
  installer_type,
  brand_type
FROM application_versions
ORDER BY release_date DESC;
```

---

### Step 3: Add download tracking for brands (optional)

**File:** `ADD_BRAND_TRACKING.sql`

```sql
-- Add brand_type to application_downloads for analytics
ALTER TABLE application_downloads
ADD COLUMN IF NOT EXISTS brand_type TEXT;

-- Create index for brand analytics
CREATE INDEX IF NOT EXISTS idx_application_downloads_brand
ON application_downloads(brand_type, created_at);

-- Verify
SELECT
  COUNT(*) as total_downloads,
  brand_type,
  status
FROM application_downloads
GROUP BY brand_type, status
ORDER BY brand_type, status;
```

---

## Phase 2: Insert Branded Version Records

### Step 4: Duplicate v1.0.0 for both brands

**File:** `INSERT_BRANDED_VERSIONS.sql`

```sql
-- First, check what we have currently
SELECT
  id,
  version_number,
  platform,
  installer_type,
  brand_type,
  download_url
FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0';

-- The current records should have brand_type = 'lyceum' (default)
-- Now we need to add Centcom branded versions

-- Insert Centcom EXE version
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
)
SELECT
  'centcom',
  '1.0.0',
  'windows',
  'x64',
  'exe',
  320586752, -- Will need to update with actual Centcom build size
  'TO_BE_UPDATED_AFTER_BUILD', -- Will need actual SHA256 hash
  'https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Datacenter_Centcom_1.0.0_x64-setup.exe',
  'https://github.com/joshlevylabs/datacenter-releases/releases/tag/v1.0.0',
  NOW(),
  true,
  true,
  true,
  false,
  'centcom'
WHERE NOT EXISTS (
  SELECT 1 FROM application_versions
  WHERE application_name = 'centcom'
    AND version_number = '1.0.0'
    AND platform = 'windows'
    AND installer_type = 'exe'
    AND brand_type = 'centcom'
);

-- Insert Centcom MSI version
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
)
SELECT
  'centcom',
  '1.0.0',
  'windows',
  'x64',
  'msi',
  323946496, -- Will need to update with actual Centcom build size
  'TO_BE_UPDATED_AFTER_BUILD', -- Will need actual SHA256 hash
  'https://github.com/joshlevylabs/datacenter-releases/releases/download/v1.0.0/Datacenter_Centcom_1.0.0_x64_en-US.msi',
  'https://github.com/joshlevylabs/datacenter-releases/releases/tag/v1.0.0',
  NOW(),
  true,
  true,
  true,
  false,
  'centcom'
WHERE NOT EXISTS (
  SELECT 1 FROM application_versions
  WHERE application_name = 'centcom'
    AND version_number = '1.0.0'
    AND platform = 'windows'
    AND installer_type = 'msi'
    AND brand_type = 'centcom'
);

-- Rename existing records to use Lyceum branding in URLs
UPDATE application_versions
SET download_url = REPLACE(
  download_url,
  'Centcom_1.0.0',
  'Datacenter_Lyceum_1.0.0'
)
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
  AND brand_type = 'lyceum'
RETURNING *;

-- Verify all versions
SELECT
  version_number,
  platform,
  installer_type,
  brand_type,
  download_url,
  file_size_bytes
FROM application_versions
WHERE application_name = 'centcom'
  AND version_number = '1.0.0'
ORDER BY brand_type, installer_type;

-- Expected result: 4 records total
-- 2 for Lyceum (msi, exe)
-- 2 for Centcom (msi, exe)
```

---

## Phase 3: API Updates

### Update: src/app/api/centcom/versions/latest/route.ts

**Add user brand detection:**

```typescript
async function getUserBrandType(supabase: any, userId: string): Promise<string> {
  try {
    // Get user's organization and its brand type
    const { data: membership } = await supabase
      .from('organization_members')
      .select(`
        organization:organizations (
          id,
          name,
          brand_type
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (membership?.organization?.brand_type) {
      return membership.organization.brand_type
    }

    // Default to lyceum if no organization
    return 'lyceum'

  } catch (error) {
    console.warn('Failed to get user brand type:', error)
    return 'lyceum' // Safe default
  }
}
```

**Update GET handler:**

```typescript
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const platform = searchParams.get('platform') || 'windows'
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID required'
      }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user's license type
    const userLicense = await getUserLicenseType(supabase, userId)
    if (!userLicense) {
      return NextResponse.json({
        success: false,
        has_license: false
      }, { status: 200 })
    }

    // Get user's brand type
    const brandType = await getUserBrandType(supabase, userId)
    console.log('✅ User brand type:', brandType)

    // Get latest version for user's brand
    const { data: latestVersion, error } = await supabase
      .from('application_versions')
      .select('*')
      .eq('application_name', 'centcom')
      .eq('platform', platform)
      .eq('brand_type', brandType)
      .eq('is_stable', true)
      .order('release_date', { ascending: false })
      .limit(1)
      .single()

    if (error || !latestVersion) {
      console.error('Failed to get latest version:', error)
      return NextResponse.json({
        success: false,
        error: 'No version available'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      has_license: true,
      license_type: userLicense,
      brand_type: brandType,
      latest_version: {
        version: latestVersion.version_number,
        release_date: latestVersion.release_date,
        changelog_url: latestVersion.changelog_url
      },
      update_available: false
    })

  } catch (error) {
    console.error('Error in latest version API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
```

---

### Update: src/app/api/centcom/download/[version]/[platform]/route.ts

**Add brand detection and version lookup:**

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { version: string; platform: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')
    const installerType = searchParams.get('installer_type') || 'exe'

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID required'
      }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify user has valid license
    const userLicense = await getUserLicenseType(supabase, userId)
    if (!userLicense) {
      return NextResponse.json({
        success: false,
        error: 'Valid license required'
      }, { status: 403 })
    }

    // Get user's brand type
    const brandType = await getUserBrandType(supabase, userId)
    console.log('✅ User brand type:', brandType)

    // Get version details for user's brand
    const { data: version, error } = await supabase
      .from('application_versions')
      .select('*')
      .eq('application_name', 'centcom')
      .eq('version_number', params.version)
      .eq('platform', params.platform)
      .eq('installer_type', installerType)
      .eq('brand_type', brandType) // Filter by brand
      .single()

    if (error || !version) {
      console.error('❌ Version not found:', {
        error,
        version: params.version,
        platform: params.platform,
        installerType,
        brandType
      })
      return NextResponse.json({
        success: false,
        error: `Version not found for ${brandType} brand`
      }, { status: 404 })
    }

    // Create download record
    const { data: download, error: downloadError } = await supabase
      .from('application_downloads')
      .insert({
        user_id: userId,
        version_id: version.id,
        platform: params.platform,
        installer_type: installerType,
        brand_type: brandType, // Track brand in downloads
        status: 'initiated',
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })
      .select()
      .single()

    if (downloadError) {
      console.error('Failed to create download record:', downloadError)
    }

    return NextResponse.json({
      success: true,
      download_id: download?.id,
      download_url: version.download_url,
      file_name: version.download_url.split('/').pop(),
      file_size: version.file_size_bytes,
      sha256_hash: version.sha256_hash,
      brand_type: brandType
    })

  } catch (error) {
    console.error('Error in download API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Add getUserBrandType function (same as in versions/latest/route.ts)
async function getUserBrandType(supabase: any, userId: string): Promise<string> {
  try {
    const { data: membership } = await supabase
      .from('organization_members')
      .select(`
        organization:organizations (
          brand_type
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    return membership?.organization?.brand_type || 'lyceum'
  } catch (error) {
    console.warn('Failed to get user brand type:', error)
    return 'lyceum'
  }
}
```

---

## Phase 4: Admin UI

### Create Admin Brand Management Page

**File:** `src/app/admin/organizations/page.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Organization {
  id: string
  name: string
  brand_type: 'lyceum' | 'centcom'
  member_count: number
  created_at: string
}

export default function OrganizationBrandManagement() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'lyceum' | 'centcom'>('all')

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        brand_type,
        created_at,
        organization_members(count)
      `)
      .order('name')

    if (!error && data) {
      setOrganizations(data.map(org => ({
        ...org,
        member_count: org.organization_members[0]?.count || 0
      })))
    }

    setLoading(false)
  }

  const updateBrandType = async (orgId: string, newBrand: 'lyceum' | 'centcom') => {
    const supabase = createClient()

    const { error } = await supabase
      .from('organizations')
      .update({ brand_type: newBrand })
      .eq('id', orgId)

    if (!error) {
      fetchOrganizations() // Refresh list
    } else {
      alert('Failed to update brand type')
    }
  }

  const filteredOrgs = filter === 'all'
    ? organizations
    : organizations.filter(org => org.brand_type === filter)

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Organization Brand Management</h1>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-4 py-2 border rounded"
        >
          <option value="all">All Brands</option>
          <option value="lyceum">Lyceum Only</option>
          <option value="centcom">Centcom Only</option>
        </select>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {filteredOrgs.map(org => (
            <div
              key={org.id}
              className="border rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <h3 className="font-semibold text-lg">{org.name}</h3>
                <p className="text-gray-600 text-sm">
                  {org.member_count} members
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  org.brand_type === 'centcom'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {org.brand_type === 'centcom' ? '🎯 Centcom' : '🏢 Lyceum'}
                </span>

                <select
                  value={org.brand_type}
                  onChange={(e) => updateBrandType(org.id, e.target.value as any)}
                  className="px-3 py-1 border rounded"
                >
                  <option value="lyceum">Lyceum</option>
                  <option value="centcom">Centcom</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Phase 5: Testing Scripts

### Test Brand Detection

**File:** `TEST_BRAND_DETECTION.sql`

```sql
-- Test 1: Check organization brand types
SELECT
  o.id,
  o.name,
  o.brand_type,
  COUNT(om.user_id) as member_count
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
GROUP BY o.id, o.name, o.brand_type
ORDER BY o.name;

-- Test 2: Check users and their organization brands
SELECT
  u.id as user_id,
  u.email,
  o.name as organization_name,
  o.brand_type,
  om.status as membership_status
FROM auth.users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE om.status = 'active'
ORDER BY u.email;

-- Test 3: Verify all branded versions exist
SELECT
  version_number,
  platform,
  installer_type,
  brand_type,
  SUBSTRING(download_url FROM 'Datacenter_[^_]+') as brand_in_url,
  file_size_bytes
FROM application_versions
WHERE application_name = 'centcom'
ORDER BY brand_type, installer_type;

-- Expected: 4 rows (2 brands × 2 installer types)

-- Test 4: Simulate brand lookup for a user
DO $$
DECLARE
  test_user_id UUID := '2c3d4747-8d67-45af-90f5-b5e9058ec246';
  user_brand TEXT;
BEGIN
  SELECT o.brand_type INTO user_brand
  FROM organization_members om
  JOIN organizations o ON om.organization_id = o.id
  WHERE om.user_id = test_user_id
    AND om.status = 'active'
  LIMIT 1;

  RAISE NOTICE 'User % has brand: %', test_user_id, COALESCE(user_brand, 'lyceum (default)');
END $$;
```

---

## Rollback Plan

### If Issues Occur, Rollback in Reverse Order

**File:** `ROLLBACK_BRAND_CHANGES.sql`

```sql
-- Step 1: Remove brand_type from application_versions
ALTER TABLE application_versions
DROP COLUMN IF EXISTS brand_type CASCADE;

-- Step 2: Restore old unique constraint
ALTER TABLE application_versions
ADD CONSTRAINT application_versions_app_version_platform_installer_key
UNIQUE (application_name, version_number, platform, installer_type);

-- Step 3: Remove brand_type from organizations
ALTER TABLE organizations
DROP COLUMN IF EXISTS brand_type CASCADE;

-- Step 4: Remove brand tracking from downloads
ALTER TABLE application_downloads
DROP COLUMN IF EXISTS brand_type;

-- Verify rollback
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'application_versions'
  AND column_name = 'brand_type';

-- Should return no rows if rollback successful
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Review all SQL scripts
- [ ] Backup production database
- [ ] Test on staging environment
- [ ] Verify RLS policies don't break

### Deployment
- [ ] Run `ADD_BRAND_TYPE_TO_ORGANIZATIONS.sql`
- [ ] Run `ADD_BRAND_TYPE_TO_VERSIONS.sql`
- [ ] Run `ADD_BRAND_TRACKING.sql` (optional)
- [ ] Deploy API changes
- [ ] Deploy admin UI changes
- [ ] Run `TEST_BRAND_DETECTION.sql`

### Post-Deployment
- [ ] Verify existing downloads still work
- [ ] Test brand detection for sample users
- [ ] Verify admin can change organization brands
- [ ] Monitor error logs for 24 hours
- [ ] Gather user feedback

---

## Future Enhancements

1. **Multiple Organization Support**
   - Handle users in multiple organizations
   - Primary organization concept
   - Organization switching UI

2. **Brand-Specific Features**
   - Feature flags per brand
   - Different API endpoints per brand
   - Separate analytics dashboards

3. **Automated Brand Assignment**
   - Auto-assign based on email domain
   - Bulk import with brand specification
   - Integration with SSO providers

4. **Brand Migration Tools**
   - Bulk reassign organizations
   - User notification on brand change
   - Version upgrade prompts

---

## Support

For implementation questions:
- **Database issues:** Check RLS policies and permissions
- **API errors:** Review logs in Vercel dashboard
- **Admin UI:** Check browser console for client errors
- **Download issues:** Verify GitHub release URLs

**Document Version:** 1.0
**Last Updated:** October 28, 2025
