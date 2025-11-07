# License Agreement Implementation Guide

## Overview

The desktop application download now requires users to accept a license agreement and automatically generates a main-application license key before download.

---

## User Flow

```
┌────────────────────────────────────────────────────────────┐
│ 1. User on Dashboard                                       │
│    Clicks "Download Centcom" or "Download Lyceum Native"  │
└─────────────────┬──────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────┐
│ 2. Routed to /download-app Page                           │
│    - Shows End User License Agreement (EULA)              │
│    - Checkbox: "I agree to the terms"                     │
└─────────────────┬──────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────┐
│ 3. User Accepts Terms                                      │
│    - Clicks "I Agree - Continue to Download"              │
│    - API generates main-application license                │
└─────────────────┬──────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────┐
│ 4. License Generated                                       │
│    - Shows license key (e.g., LYC-APP-2025-ABC12345)     │
│    - Detects user's brand (Centcom or Lyceum)            │
│    - Detects platform (Windows/Mac/Linux)                 │
└─────────────────┬──────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────┐
│ 5. Download Options Shown                                  │
│    - Windows: EXE or MSI installer                        │
│    - Mac: DMG installer                                    │
│    - Linux: AppImage or DEB package                       │
└─────────────────┬──────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────┐
│ 6. User Downloads & Installs                               │
│    - Installer downloads from GitHub releases              │
│    - User installs application                             │
│    - Signs in with Lyceum credentials                      │
│    - License auto-activated                                │
└────────────────────────────────────────────────────────────┘
```

---

## Files Created

### 1. API Endpoint: Generate Main-Application License

**File**: `src/app/api/licenses/generate-main-app/route.ts`

**Purpose**: Automatically generates a main-application license when user accepts terms

**Features**:
- ✅ Generates unique license key (format: `LYC-APP-YYYY-XXXXXXXX`)
- ✅ Detects user's brand type (Centcom vs Lyceum) based on company field
- ✅ Checks if user already has a license (returns existing if found)
- ✅ Sets appropriate features and permissions
- ✅ No expiration date for main app licenses
- ✅ Self-assigned (user creates their own license)

**Request**:
```typescript
POST /api/licenses/generate-main-app
Headers:
  Authorization: Bearer <session_token>
```

**Response**:
```json
{
  "success": true,
  "message": "Main-application license created successfully",
  "license": {
    "key_code": "LYC-APP-2025-ABC12345",
    "license_type": "main-application",
    "status": "active",
    "created_at": "2025-11-05T10:00:00Z",
    "expires_at": null,
    "features": [
      "desktop_app_access",
      "local_cluster_support",
      "data_sync",
      "offline_mode",
      "auto_updates",
      "lyceum_branding"
    ],
    "brand_type": "lyceum"
  },
  "is_new": true
}
```

### 2. Download Page with License Agreement

**File**: `src/app/download-app/page.tsx`

**Purpose**: Shows EULA, generates license, and provides download options

**Sections**:
1. **Header**: Shows brand name (Centcom or Lyceum Native)
2. **License Agreement**: Full EULA text in scrollable area
3. **Acceptance Checkbox**: Must check to proceed
4. **Action Buttons**:
   - "I Agree - Continue to Download" (generates license)
   - "Cancel" (returns to dashboard)
5. **License Display**: Shows generated key after acceptance
6. **Download Options**: Platform-specific installers (EXE/MSI/DMG/etc.)

**Features**:
- ✅ Brand-aware (shows Centcom or Lyceum branding)
- ✅ Platform detection (Windows/Mac/Linux)
- ✅ Error handling and loading states
- ✅ Prevents download without accepting terms
- ✅ Shows existing license if already generated
- ✅ Tracks downloads via existing API

### 3. Dashboard Update

**File**: `src/app/dashboard/page.tsx` (modified)

**Changes**:
- ✅ Changed button to route to `/download-app` instead of showing modal
- ✅ Removed old download modal code (commented out)
- ✅ Button still shows brand-aware text

**Before**:
```typescript
<button onClick={() => setShowDownloadModal(true)}>
  Download Lyceum Native
</button>
```

**After**:
```typescript
<button onClick={() => router.push('/download-app')}>
  Download {brandName}
</button>
```

---

## License Key Details

### Format

```
LYC-APP-YYYY-XXXXXXXX

LYC     = Lyceum prefix
APP     = Application type
YYYY    = Year
XXXXXXXX = Random alphanumeric (8 chars)
```

**Examples**:
- `LYC-APP-2025-A1B2C3D4`
- `LYC-APP-2025-X9Y8Z7W6`

### Database Structure

**Table**: `license_keys`

**Key Fields**:
```sql
key_code            TEXT          -- LYC-APP-2025-XXXXXXXX
license_type        TEXT          -- 'main-application'
status              TEXT          -- 'active', 'inactive', 'expired'
assigned_to         UUID          -- User ID
created_at          TIMESTAMPTZ   -- When created
expires_at          TIMESTAMPTZ   -- NULL (no expiration)
features            JSONB         -- Array of feature flags
license_config      JSONB         -- Metadata including brand_type
```

**Example Record**:
```json
{
  "id": "uuid-here",
  "key_code": "LYC-APP-2025-ABC12345",
  "license_type": "main-application",
  "status": "active",
  "max_users": 1,
  "max_projects": 100,
  "max_storage_gb": 50,
  "features": [
    "desktop_app_access",
    "local_cluster_support",
    "data_sync",
    "offline_mode",
    "auto_updates",
    "lyceum_branding"
  ],
  "expires_at": null,
  "assigned_to": "user-uuid",
  "assigned_at": "2025-11-05T10:00:00Z",
  "created_by": "user-uuid",
  "license_config": {
    "brand_type": "lyceum",
    "auto_generated": true,
    "generated_via": "license_agreement",
    "version": "2.0",
    "created_at": "2025-11-05T10:00:00Z"
  }
}
```

---

## Brand Detection Logic

The system automatically detects which brand to assign based on the user's company field:

```typescript
const centcomCompanies = [
  'centcom',
  'sonance',
  'blaze',
  'iport',
  'danainnovations',
  'dana innovations',
  'james',
  'trufig'
]

// If user's company contains any of these (case-insensitive):
// → brand_type = 'centcom'
// → Shows "Download Centcom"
// → Gets Centcom branded installer

// Otherwise:
// → brand_type = 'lyceum'
// → Shows "Download Lyceum Native"
// → Gets Lyceum branded installer
```

This matches the existing brand detection in the API routes.

---

## Testing Guide

### Test Scenario 1: New User - Lyceum Brand

1. **Setup**: User with company = "Test Company" (not in Centcom list)
2. **Go to Dashboard**: `/dashboard`
3. **Click**: "Download Lyceum Native" button
4. **Verify**: Redirected to `/download-app`
5. **Verify**: Page shows "Download Lyceum Native" header
6. **Verify**: EULA is displayed with scroll
7. **Action**: Check "I agree" checkbox
8. **Action**: Click "I Agree - Continue to Download"
9. **Verify**: Loading spinner shows
10. **Verify**: License key appears (format: `LYC-APP-2025-XXXXXXXX`)
11. **Verify**: Download buttons show for Windows (EXE/MSI)
12. **Action**: Click "Setup.exe (Recommended)"
13. **Verify**: File downloads from GitHub
14. **Verify**: File is `Lyceum_1.0.0_x64-setup.exe` (or current version)

**Expected Database State**:
```sql
SELECT * FROM license_keys
WHERE assigned_to = 'user-id';

-- Should show:
-- license_type = 'main-application'
-- brand_type = 'lyceum' (in license_config)
-- status = 'active'
-- expires_at = NULL
```

### Test Scenario 2: New User - Centcom Brand

1. **Setup**: User with company = "Sonance"
2. **Go to Dashboard**: `/dashboard`
3. **Verify**: Button says "Download Centcom"
4. **Click**: "Download Centcom"
5. **Verify**: Page shows "Download Centcom" header
6. **Action**: Accept terms
7. **Verify**: License key generated
8. **Verify**: Download buttons shown
9. **Action**: Download installer
10. **Verify**: File is `Centcom_1.0.0_x64-setup.exe`

**Expected Database State**:
```sql
SELECT license_config->>'brand_type'
FROM license_keys
WHERE assigned_to = 'user-id';

-- Should return: 'centcom'
```

### Test Scenario 3: Existing License

1. **Setup**: User already has main-application license
2. **Go to**: `/download-app`
3. **Action**: Check "I agree" and click continue
4. **Verify**: Existing license key is returned (not a new one)
5. **Verify**: Message says "License already exists"
6. **Verify**: `is_new: false` in API response
7. **Verify**: Download options still shown

### Test Scenario 4: Without Accepting Terms

1. **Go to**: `/download-app`
2. **Action**: Click "I Agree" button WITHOUT checking box
3. **Verify**: Error message appears
4. **Verify**: "You must agree to the license terms to continue"
5. **Verify**: No license generated
6. **Verify**: Download section not shown

### Test Scenario 5: Cancel and Return

1. **Go to**: `/download-app`
2. **Action**: Click "Cancel" button
3. **Verify**: Redirected back to `/dashboard`
4. **Verify**: No license generated

### Test Scenario 6: Check License in Settings

1. **Complete**: Test Scenario 1 or 2 (generate license)
2. **Go to**: `/settings` page
3. **Verify**: License key is visible in settings
4. **Verify**: Shows same key as generated
5. **Verify**: Status shows "Active"

---

## API Testing

### Test License Generation

```bash
# Get session token from browser dev tools after login
TOKEN="your-session-token"

# Generate license
curl -X POST https://lyceum.app/api/licenses/generate-main-app \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected Response (first time):
{
  "success": true,
  "message": "Main-application license created successfully",
  "license": {
    "key_code": "LYC-APP-2025-ABC12345",
    "license_type": "main-application",
    "status": "active",
    ...
  },
  "is_new": true
}

# Expected Response (already has license):
{
  "success": true,
  "message": "License already exists",
  "license": {
    "key_code": "LYC-APP-2025-ABC12345",
    ...
  },
  "is_new": false
}
```

### Verify in Database

```sql
-- Check user's licenses
SELECT
  key_code,
  license_type,
  status,
  assigned_to,
  created_at,
  license_config->>'brand_type' as brand_type,
  license_config->>'auto_generated' as auto_generated
FROM license_keys
WHERE assigned_to = 'user-uuid-here'
  AND license_type = 'main-application';

-- Should show the generated license
```

---

## Desktop Application Integration

### How the Desktop App Uses the License

When users sign into the desktop application:

1. **User enters email/password**
2. **App authenticates with Lyceum API**
3. **App fetches user's licenses**:
   ```typescript
   GET /api/user-profiles/licenses
   ```
4. **App looks for main-application license**:
   ```typescript
   const mainLicense = licenses.find(
     l => l.license_type === 'main-application' && l.status === 'active'
   )
   ```
5. **App validates license with API**:
   ```typescript
   POST /api/centcom/license/verify
   {
     "key_code": "LYC-APP-2025-ABC12345",
     "user_id": "user-uuid"
   }
   ```
6. **If valid**: App activates and shows appropriate branding
7. **If invalid**: App shows error and requires valid license

---

## Advantages of This Approach

### 1. Legal Protection
✅ Users must explicitly accept EULA before downloading
✅ Creates legal record of agreement
✅ Terms can be updated and users see latest version

### 2. License Tracking
✅ Every user gets a unique license key
✅ Can track which users have downloaded
✅ Can revoke licenses if needed
✅ Usage analytics per license

### 3. User Experience
✅ Seamless process (one page, ~30 seconds)
✅ License auto-activates on app signin
✅ No manual entry of long license keys
✅ Can re-download anytime from Settings

### 4. Brand Management
✅ Automatically detects correct brand
✅ Consistent with rest of platform
✅ No manual brand selection needed

### 5. Security
✅ Requires authentication to download
✅ License tied to user account
✅ Can't share installers freely (need license)
✅ Tracks who downloaded what

---

## Future Enhancements

### Possible Additions

1. **License Acceptance Tracking**:
   ```sql
   CREATE TABLE license_acceptances (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id),
     license_version TEXT,
     accepted_at TIMESTAMPTZ,
     ip_address TEXT,
     user_agent TEXT
   );
   ```

2. **Email Confirmation**:
   - Send email after license generation
   - Include license key in email
   - Link to download page

3. **License Expiration**:
   - Set trial periods for certain users
   - Auto-expire after X days
   - Require renewal

4. **Multi-Device Licenses**:
   - Allow multiple devices per license
   - Track active installations
   - Enforce device limits

5. **License Transfer**:
   - Allow users to transfer license to another account
   - Requires admin approval
   - Audit trail

---

## Troubleshooting

### Issue: "Not authenticated" error

**Cause**: User's session expired or invalid

**Solution**:
1. Check user is logged in
2. Verify session token in browser
3. Have user log out and back in
4. Check Supabase authentication status

### Issue: License not appearing in Settings

**Cause**: License not properly assigned to user

**Solution**:
```sql
-- Check if license exists
SELECT * FROM license_keys
WHERE key_code = 'LYC-APP-2025-XXXXXXXX';

-- Update assigned_to if wrong
UPDATE license_keys
SET assigned_to = 'correct-user-uuid'
WHERE key_code = 'LYC-APP-2025-XXXXXXXX';
```

### Issue: Download button not working

**Cause**: GitHub URL incorrect or file missing

**Solution**:
1. Verify file exists in GitHub releases
2. Check URL format matches migration script
3. Test URL directly in browser
4. Check `application_versions` table has correct URLs

### Issue: Wrong brand assigned

**Cause**: Company field not matching detection logic

**Solution**:
```sql
-- Check user's company
SELECT company FROM user_profiles
WHERE id = 'user-uuid';

-- Update company if needed
UPDATE user_profiles
SET company = 'Sonance'  -- Or appropriate company
WHERE id = 'user-uuid';
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Test license generation for both brands
- [ ] Test with users having existing licenses
- [ ] Test all download options (EXE, MSI, etc.)
- [ ] Verify EULA text is correct and up-to-date
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test on different devices (mobile, tablet, desktop)
- [ ] Verify tracking (application_downloads table)
- [ ] Test cancel button returns to dashboard
- [ ] Verify license shows in Settings page
- [ ] Test desktop app can validate generated licenses
- [ ] Check error messages are user-friendly
- [ ] Verify loading states work correctly
- [ ] Test with expired/revoked licenses (if applicable)
- [ ] Push code changes to repository
- [ ] Deploy to Vercel
- [ ] Monitor for errors in production

---

## Summary

**What Changed**:
1. Dashboard button now routes to `/download-app` instead of showing modal
2. New page requires EULA acceptance before download
3. API automatically generates main-application license
4. License key is displayed and stored in database
5. Download proceeds with platform-specific installers

**User Impact**:
- Extra step (accepting EULA) but only ~30 seconds
- Gets a license key automatically (no manual entry)
- Better organized flow (dedicated page vs modal)
- Can return to download page anytime from Settings

**Technical Benefits**:
- Legal protection through documented EULA acceptance
- Every user has trackable license
- Better analytics on downloads
- Can manage/revoke licenses if needed
- Supports brand detection
