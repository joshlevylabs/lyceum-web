# Datacenter Desktop Application - Deployment Update & Dual-Branding Plan

**Date:** October 28, 2025
**To:** Centcom Development Team
**From:** Lyceum Platform Team
**Subject:** Desktop Application Release Strategy & Branding Requirements

---

## Executive Summary

The Datacenter Desktop Application download system is now **live and operational**. We've successfully implemented a license-gated download system that allows users to download platform-specific installers (MSI/EXE for Windows) through the Lyceum dashboard.

**Key Achievement:** Users with valid licenses can now download the desktop application directly from their dashboard.

**Next Requirement:** We need to implement a dual-branding system where some users receive a **Lyceum-branded** version and others receive a **Centcom-branded** version of the same application.

---

## Current Implementation: Release Hosting Solution

### Why We Moved to Public GitHub Releases

**Problem We Solved:**
- Original plan was to host installers in the private `datacenter` repository
- Private GitHub repositories require authentication to download release assets
- End users don't have GitHub access, causing 404 errors and login prompts

**Solution Implemented:**
- Created separate **public repository**: `joshlevylabs/datacenter-releases`
- Hosts only compiled binaries (no source code exposure)
- Source code remains secure in private `datacenter` repository
- Zero hosting costs, excellent CDN performance

### Repository Structure

**Private Source Repository:** `joshlevylabs/datacenter`
- Contains all source code (private ✅)
- Development happens here
- Code remains secure and proprietary

**Public Release Repository:** `joshlevylabs/datacenter-releases`
- Contains only compiled installers (public ✅)
- No source code exposure
- Users can download without authentication
- Industry-standard pattern (used by Discord, VS Code, etc.)

### Current Release Assets

**Version 1.0.0 Assets:**
- `Centcom_1.0.0_x64-setup.exe` (306 MB) - Windows EXE installer
- `Centcom_1.0.0_x64_en-US.msi` (309 MB) - Windows MSI installer

**Release URL:** `https://github.com/joshlevylabs/datacenter-releases/releases/tag/v1.0.0`

### Security & Benefits

✅ **Source code protected** - Private repo keeps proprietary code secure
✅ **Free hosting** - GitHub provides unlimited bandwidth
✅ **Fast downloads** - GitHub's CDN ensures global performance
✅ **SHA256 verification** - All downloads include cryptographic hashes
✅ **License gating** - Lyceum API validates licenses before providing download URLs
✅ **Industry standard** - Common pattern for enterprise software distribution

---

## New Requirement: Dual-Branding System

### Business Requirement

The desktop application needs to support **two distinct brands**:

1. **Lyceum Brand** - For general Lyceum platform users
2. **Centcom Brand** - For users associated with Centcom organizations

**Same application, different visual identity** (logo, colors, application name display)

### User Experience Vision

**Lyceum Users:**
- See "Datacenter (Lyceum Edition)" in application
- Lyceum branding, colors, and logo
- Download installer: `Datacenter_Lyceum_1.0.0_x64-setup.exe`

**Centcom Users:**
- See "Datacenter (Centcom Edition)" in application
- Centcom branding, colors, and logo
- Download installer: `Datacenter_Centcom_1.0.0_x64-setup.exe`

---

## Proposed Implementation: User Grouping System

We need an **automated way** to determine which version a user should receive. Here are three approaches:

### Option 1: Organization-Based (Recommended)

**How It Works:**
- Add `brand_type` field to organizations table: `'lyceum' | 'centcom'`
- User's brand determined by their organization membership
- Admin sets organization brand type in dashboard

**Pros:**
✅ Scalable for multiple organizations
✅ Admin has full control
✅ Easy to manage and audit
✅ Supports users switching organizations
✅ Clear hierarchy: Organization → Users → Brand

**Cons:**
❌ Requires organization management UI updates

**Database Changes:**
```sql
-- Add brand_type to organizations table
ALTER TABLE organizations
ADD COLUMN brand_type TEXT DEFAULT 'lyceum'
CHECK (brand_type IN ('lyceum', 'centcom'));

-- Create index for performance
CREATE INDEX idx_organizations_brand_type
ON organizations(brand_type);
```

**API Logic:**
```typescript
// Get user's organization brand
const organization = await getUserOrganization(userId)
const brandType = organization.brand_type // 'lyceum' or 'centcom'

// Return appropriate version
const version = await getLatestVersion('datacenter', platform, brandType)
```

---

### Option 2: License-Based

**How It Works:**
- Add `brand_type` field to license_keys table
- Brand determined by the license assigned to user
- Admin sets brand when creating/assigning licenses

**Pros:**
✅ Simple implementation
✅ Direct link between license and brand
✅ No organization dependency

**Cons:**
❌ Less flexible if user has multiple licenses
❌ Harder to bulk-manage users
❌ License and branding are conceptually separate concerns

**Database Changes:**
```sql
-- Add brand_type to license_keys table
ALTER TABLE license_keys
ADD COLUMN brand_type TEXT DEFAULT 'lyceum'
CHECK (brand_type IN ('lyceum', 'centcom'));
```

---

### Option 3: User Profile-Based

**How It Works:**
- Add `brand_preference` field to user_profiles table
- Admin sets brand preference per user
- Direct user-level control

**Pros:**
✅ Maximum flexibility per user
✅ Simplest database structure
✅ Easy to override for specific users

**Cons:**
❌ Requires manual configuration for each user
❌ Not scalable for large user bases
❌ No automatic grouping by organization

**Database Changes:**
```sql
-- Add brand_preference to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN brand_preference TEXT DEFAULT 'lyceum'
CHECK (brand_preference IN ('lyceum', 'centcom'));
```

---

## Recommended Approach: Option 1 (Organization-Based)

**Rationale:**
1. Most scalable solution for growing user base
2. Aligns with typical enterprise software patterns
3. Admin can manage brands at organization level
4. Automatic brand assignment for new users joining organizations
5. Supports future multi-tenant features

**Implementation Timeline:**
- Phase 1: Database schema updates (1 day)
- Phase 2: API endpoint modifications (2 days)
- Phase 3: Admin UI for brand management (3 days)
- Phase 4: Build and release branded versions (2 days)
- Phase 5: Testing and deployment (1 day)

**Total Estimated Time:** 9 development days

---

## Technical Implementation Details

### Database Schema

**New Fields Required:**

```sql
-- organizations table
ALTER TABLE organizations
ADD COLUMN brand_type TEXT DEFAULT 'lyceum'
CHECK (brand_type IN ('lyceum', 'centcom'));

-- application_versions table (already exists, needs brand field)
ALTER TABLE application_versions
ADD COLUMN brand_type TEXT DEFAULT 'lyceum'
CHECK (brand_type IN ('lyceum', 'centcom'));

-- Update unique constraint to include brand
ALTER TABLE application_versions
DROP CONSTRAINT IF EXISTS application_versions_app_version_platform_installer_key;

ALTER TABLE application_versions
ADD CONSTRAINT application_versions_unique_version
UNIQUE (application_name, version_number, platform, installer_type, brand_type);
```

### API Endpoint Updates

**Endpoint:** `GET /api/centcom/versions/latest`

**Current Behavior:**
- Returns latest version regardless of brand

**New Behavior:**
- Determines user's organization brand
- Returns brand-specific version
- Falls back to 'lyceum' if no organization

**Updated Logic:**
```typescript
// 1. Get user's organization
const { data: membership } = await supabase
  .from('organization_members')
  .select('organization:organizations(brand_type)')
  .eq('user_id', userId)
  .single()

const brandType = membership?.organization?.brand_type || 'lyceum'

// 2. Get latest version for user's brand
const { data: version } = await supabase
  .from('application_versions')
  .select('*')
  .eq('application_name', 'datacenter')
  .eq('platform', platform)
  .eq('brand_type', brandType)
  .order('release_date', { ascending: false })
  .limit(1)
  .single()
```

**Endpoint:** `GET /api/centcom/download/[version]/[platform]`

**Updates:**
- Include brand_type in version lookup
- Ensure download URL matches user's brand
- Track brand in download analytics

### Release File Naming Convention

**Proposed Naming Standard:**

```
Datacenter_[Brand]_[Version]_[Architecture]_[Locale]-[InstallerType].[ext]

Examples:
- Datacenter_Lyceum_1.0.0_x64_en-US.msi
- Datacenter_Lyceum_1.0.0_x64-setup.exe
- Datacenter_Centcom_1.0.0_x64_en-US.msi
- Datacenter_Centcom_1.0.0_x64-setup.exe
```

**Release Structure (v1.0.0):**
```
v1.0.0/
├── Datacenter_Lyceum_1.0.0_x64_en-US.msi (309 MB)
├── Datacenter_Lyceum_1.0.0_x64-setup.exe (306 MB)
├── Datacenter_Centcom_1.0.0_x64_en-US.msi (309 MB)
└── Datacenter_Centcom_1.0.0_x64-setup.exe (306 MB)
```

### Tauri Build Configuration

**Need to Build Two Versions:**

**Lyceum Brand:**
```json
// tauri.conf.json (Lyceum build)
{
  "package": {
    "productName": "Datacenter (Lyceum Edition)",
    "version": "1.0.0"
  },
  "tauri": {
    "bundle": {
      "identifier": "com.lyceum.datacenter",
      "icon": ["icons/lyceum-icon.png"],
      "windows": {
        "wix": {
          "banner": "assets/lyceum-banner.png",
          "dialog": "assets/lyceum-dialog.png"
        }
      }
    }
  }
}
```

**Centcom Brand:**
```json
// tauri.conf.json (Centcom build)
{
  "package": {
    "productName": "Datacenter (Centcom Edition)",
    "version": "1.0.0"
  },
  "tauri": {
    "bundle": {
      "identifier": "com.centcom.datacenter",
      "icon": ["icons/centcom-icon.png"],
      "windows": {
        "wix": {
          "banner": "assets/centcom-banner.png",
          "dialog": "assets/centcom-dialog.png"
        }
      }
    }
  }
}
```

**Build Process:**
```bash
# Build Lyceum version
npm run build:lyceum

# Build Centcom version
npm run build:centcom

# Both builds create separate installers
```

---

## Admin UI Requirements

### Organization Management Dashboard

**New Admin Screen:** `/admin/organizations`

**Features Needed:**
1. **List all organizations** with brand type indicator
2. **Edit organization** - Change brand type
3. **Visual indicators:**
   - 🏢 Lyceum badge for Lyceum organizations
   - 🎯 Centcom badge for Centcom organizations
4. **Bulk actions:** Assign multiple organizations to a brand
5. **User preview:** See which users affected by brand change

**Example UI:**
```
Organizations

[+ New Organization]  [Filter: All Brands ▼]

┌─────────────────────────────────────────────────┐
│ Acme Corporation          🎯 Centcom  [Edit]   │
│ 25 members                                      │
├─────────────────────────────────────────────────┤
│ Beta Industries           🏢 Lyceum   [Edit]   │
│ 12 members                                      │
├─────────────────────────────────────────────────┤
│ Gamma Solutions           🎯 Centcom  [Edit]   │
│ 48 members                                      │
└─────────────────────────────────────────────────┘
```

---

## Testing Plan

### Test Scenarios

**1. Lyceum User Download:**
- ✅ User in Lyceum organization
- ✅ Downloads Lyceum-branded installer
- ✅ Installer shows Lyceum branding
- ✅ Application runs with Lyceum theme

**2. Centcom User Download:**
- ✅ User in Centcom organization
- ✅ Downloads Centcom-branded installer
- ✅ Installer shows Centcom branding
- ✅ Application runs with Centcom theme

**3. Admin Brand Changes:**
- ✅ Admin changes org from Lyceum → Centcom
- ✅ Users immediately see Centcom version available
- ✅ Previously downloaded Lyceum version continues working
- ✅ Update notification appears for Centcom version

**4. New User Onboarding:**
- ✅ New user joins Centcom organization
- ✅ Automatically sees Centcom download option
- ✅ No manual configuration needed

**5. Multi-Organization Users:**
- ✅ User belongs to multiple organizations
- ✅ Brand determined by primary organization
- ✅ Clear indication of active brand

---

## Deployment Strategy

### Phase 1: Database Migration (Week 1)
1. Add `brand_type` to organizations table
2. Add `brand_type` to application_versions table
3. Set all existing organizations to 'lyceum' (default)
4. Update constraints and indexes
5. Test data integrity

### Phase 2: Backend Implementation (Week 1-2)
1. Update version lookup API to consider brand
2. Update download API to validate brand
3. Add brand tracking to analytics
4. Update RLS policies if needed
5. Deploy to staging environment

### Phase 3: Build Branded Versions (Week 2)
1. Create Lyceum brand assets (icons, banners)
2. Create Centcom brand assets (icons, banners)
3. Set up dual build configuration
4. Build both MSI and EXE for each brand (4 files total)
5. Upload to datacenter-releases repository

### Phase 4: Admin UI (Week 2-3)
1. Create organization brand management screen
2. Add brand indicators throughout admin dashboard
3. Implement bulk brand assignment
4. Add user brand preview
5. Deploy to staging

### Phase 5: Testing & Production (Week 3)
1. QA testing all scenarios
2. User acceptance testing
3. Gradual rollout to production
4. Monitor download analytics
5. Gather user feedback

---

## Action Items for Centcom Team

### Immediate (This Week)
- [ ] **Review and approve** dual-branding approach
- [ ] **Provide Centcom brand assets:**
  - Application icon (PNG, multiple sizes)
  - Installer banner image (493×58 pixels)
  - Installer dialog image (493×312 pixels)
  - Color scheme (primary, secondary, accent colors)
  - Logo files (SVG preferred)
- [ ] **Identify test organizations** for initial Centcom branding

### Short-Term (Next 2 Weeks)
- [ ] **Approve organization-based grouping** approach (or suggest alternative)
- [ ] **Designate organizations** as Lyceum vs Centcom
- [ ] **Test branded installers** on Windows environments
- [ ] **Review admin UI mockups** for brand management

### Long-Term (Next Month)
- [ ] **Plan macOS version** (if needed)
- [ ] **Plan Linux version** (if needed)
- [ ] **Define brand switching policy** (can users switch? how?)
- [ ] **Document user-facing changes** for support team

---

## Questions for Discussion

1. **Branding Scope:** Should the two brands have:
   - Different product names? (e.g., "Lyceum Datacenter" vs "Centcom Datacenter")
   - Different feature sets? (e.g., Centcom gets additional features)
   - Same codebase with cosmetic differences only?

2. **Organization Assignment:**
   - How do we initially determine which existing orgs are Centcom vs Lyceum?
   - Can organizations change brands? Under what circumstances?
   - What happens to users if their org brand changes?

3. **User Experience:**
   - Should users be able to see/choose their brand?
   - Or should it be entirely admin-controlled and automatic?
   - What happens if a user belongs to both Lyceum and Centcom orgs?

4. **Technical Constraints:**
   - Do Centcom users need different API endpoints?
   - Do we need separate update channels for each brand?
   - Should analytics be separated by brand?

5. **Release Process:**
   - Do both brands always release simultaneously?
   - Can we have different version numbers per brand?
   - Who approves releases for each brand?

---

## Success Metrics

**Current Status (Post-Implementation):**
- ✅ Download system operational
- ✅ License gating working correctly
- ✅ Public GitHub releases hosting live
- ✅ SHA256 verification in place

**Target Metrics (Post Dual-Branding):**
- 100% of downloads matched to correct brand
- Zero authentication errors on public downloads
- < 1% mismatch between user org and downloaded brand
- Admin can change org brand in < 30 seconds
- New users see correct brand within 1 minute of org assignment

---

## Support & Documentation

**For Lyceum Platform Team:**
- Technical implementation guide (to be created)
- API documentation updates
- Database migration scripts
- Testing checklist

**For Centcom Team:**
- Brand asset specification guide
- Organization brand management guide
- User support documentation
- Troubleshooting guide

---

## Next Steps

**Awaiting from Centcom Team:**
1. ✅ Approval of organization-based branding approach
2. 📦 Centcom brand assets (logos, colors, installer images)
3. 📋 List of organizations to assign as "Centcom" brand
4. 🔍 Review of technical implementation plan

**Once we receive these, we can:**
- Begin database schema updates
- Build branded versions
- Implement admin UI
- Deploy to staging for testing

---

## Contact & Questions

For questions about this implementation, please contact:
- **Technical Implementation:** Lyceum Platform Team
- **Brand Requirements:** Centcom Product Team
- **Timeline & Priorities:** Project Management

**Estimated Timeline to Full Deployment:** 3-4 weeks from approval

---

**Document Version:** 1.0
**Last Updated:** October 28, 2025
**Status:** Awaiting Centcom Team Response
