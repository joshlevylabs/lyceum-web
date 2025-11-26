# CentCom Session Heartbeat Specification

**To:** CentCom Development Team
**From:** Lyceum Backend Team
**Date:** January 25, 2025
**Subject:** Enhanced Session Tracking & Heartbeat Data Requirements

---

## Overview

We've implemented comprehensive session tracking in the Lyceum backend to monitor and manage desktop application sessions. This enables us to:

- Track active desktop sessions alongside web sessions
- Enforce session limits based on license type (1 for trial/basic, 5 for pro, unlimited for enterprise)
- Calculate security risk scores for each session
- Allow users to view and revoke sessions from the Settings page
- Auto-revoke oldest sessions when limits are exceeded

**We need to coordinate with you on the heartbeat data format to ensure proper integration.**

---

## Current Endpoint

**URL:** `POST /api/centcom/auth/session-update`
**Authentication:** Bearer token (Lyceum JWT)
**Content-Type:** `application/json`

---

## Required Heartbeat Fields

### Current Fields (Already Implemented)
```typescript
{
  // Existing fields you're already sending
  session_id: string,        // JWT token or unique session identifier
  version: string,           // App version (e.g., "2.0.2")
  instance_id: string,       // Unique instance identifier
  user_agent: string,        // User agent string
  platform: string,          // Platform (e.g., "windows", "macos", "linux")
  build: string,             // Build number or identifier
  timestamp: string          // ISO 8601 timestamp (e.g., "2025-01-25T15:22:18Z")
}
```

### New Required Fields
```typescript
{
  // NEW: Session type (always "desktop" for CentCom)
  session_type: "desktop",

  // NEW: Device name/description
  device_name: string,       // Example: "Windows Desktop (CentCom Desktop (Tauri))"
                             // Format: "{OS} Desktop (CentCom Desktop (Tauri))"

  // NEW: Environment/Location identifier
  location: string,          // Examples: "Local, Development" | "Production" | "Local"
                             // Used for risk score calculation (dev environments = lower risk)

  // NEW: User's license type
  license_type: string,      // One of: "trial" | "basic" | "pro" | "enterprise" | "unknown"
                             // This determines session limits:
                             //   - trial/basic: 1 concurrent session
                             //   - pro: 5 concurrent sessions
                             //   - enterprise: unlimited

  // NEW: MFA verification status
  mfa_verified: boolean,     // Whether the user has MFA enabled and verified
                             // Affects risk score: +30 risk if false

  // NEW: Operating system details
  os: string,                // Example: "Windows 11" | "macOS 14.2" | "Ubuntu 22.04"

  // OPTIONAL: Browser (null for desktop apps)
  browser: null,             // Always null for CentCom desktop app

  // OPTIONAL: Client IP address (if available)
  ip_address?: string,       // Client's IP address (we'll also extract from headers)

  // OPTIONAL: Additional metadata (flexible JSONB field)
  session_metadata?: object  // Any additional session data (screen resolution, timezone, etc.)
}
```

---

## Complete Example Request

```typescript
// POST /api/centcom/auth/session-update
// Headers:
//   Authorization: Bearer <lyceum_jwt_token>
//   Content-Type: application/json

{
  // Existing fields
  "session_id": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "version": "2.0.2",
  "instance_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_agent": "CentCom/2.0.2 (Windows NT 10.0; Win64; x64)",
  "platform": "windows",
  "build": "2024.01.25",
  "timestamp": "2025-01-25T15:22:18.000Z",

  // New fields
  "session_type": "desktop",
  "device_name": "Windows Desktop (CentCom Desktop (Tauri))",
  "location": "Local, Development",  // or "Production" for production builds
  "license_type": "trial",           // Get from user's license info
  "mfa_verified": true,              // Get from user's auth status
  "os": "Windows 11",
  "browser": null,
  "ip_address": "192.168.1.100",     // Optional, we can extract from headers

  // Optional metadata
  "session_metadata": {
    "screen_resolution": "1920x1080",
    "timezone": "America/New_York",
    "language": "en-US"
  }
}
```

---

## Expected Response

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Session updated successfully",
  "risk_score": 15,
  "session_limit": {
    "within_limit": true,
    "current_count": 1,
    "max_allowed": 1,
    "message": "Session allowed. 1 of 1 sessions used."
  }
}
```

### Session Revoked (403 Forbidden)
```json
{
  "success": false,
  "error": "session_revoked",
  "message": "This session has been revoked. Please log in again."
}
```

**When you receive this error, you must:**
1. Clear the stored JWT token
2. Force logout
3. Redirect user to login screen

### Session Limit Exceeded
If the session limit is exceeded, the backend will automatically revoke the oldest session and allow the new one. The response will indicate this in the `session_limit` object.

---

## Implementation Questions

### 1. Device Name Format
**Current Example:** `"Windows Desktop (CentCom Desktop (Tauri))"`

**Question:** Can you generate this dynamically or should we provide a specific format?

**Suggested format:**
```typescript
const deviceName = `${osName} Desktop (CentCom Desktop (Tauri))`;
// Examples:
// - "Windows Desktop (CentCom Desktop (Tauri))"
// - "macOS Desktop (CentCom Desktop (Tauri))"
// - "Linux Desktop (CentCom Desktop (Tauri))"
```

### 2. Location Field
**Question:** How do you currently distinguish between development and production builds?

**Options:**
- **Option A:** Use environment variable
  ```typescript
  location: process.env.NODE_ENV === 'development' ? 'Local, Development' : 'Production'
  ```
- **Option B:** Use build configuration
  ```typescript
  location: IS_DEV_BUILD ? 'Local, Development' : 'Production'
  ```
- **Option C:** User-configurable setting

**Please let us know which approach works best for your architecture.**

### 3. License Type Detection
**Question:** How does CentCom currently know the user's license type?

**Options:**
- Is it in the JWT token payload?
- Is it fetched from a separate API call?
- Is it stored locally after login?

**We need to know:** What's the best way for you to determine and send the license type?

### 4. MFA Verification Status
**Question:** Does CentCom currently track or receive MFA status for users?

**If not:** We can add it to the login/auth response, or you can default to `false` for now.

### 5. OS Detection
**Question:** Can you access detailed OS information in Tauri?

**Example approaches:**
```typescript
// Tauri approach
import { os } from '@tauri-apps/api';
const osVersion = await os.version(); // "10.0.22000" (Windows 11)
const osType = await os.type();       // "Windows_NT"
const osString = `${osType} ${osVersion}`; // "Windows_NT 10.0.22000"

// Or more user-friendly:
const getFriendlyOS = async () => {
  const type = await os.type();
  const version = await os.version();

  if (type === 'Windows_NT') return `Windows ${mapWindowsVersion(version)}`;
  if (type === 'Darwin') return `macOS ${version}`;
  if (type === 'Linux') return `Linux ${version}`;

  return `${type} ${version}`;
};
```

### 6. Heartbeat Frequency
**Question:** How often are you currently sending heartbeats?

**Recommendation:** Every 30-60 seconds for active sessions to ensure accurate "last activity" tracking.

---

## Backend Implementation Status

### ✅ Completed
- [x] Database schema updated with new session fields
- [x] Session update endpoint accepts all new fields
- [x] Automatic risk score calculation
- [x] Session limit enforcement
- [x] Auto-revoke oldest session when limit exceeded
- [x] Session revocation detection (returns `session_revoked` error)
- [x] Frontend UI for viewing all sessions (web + desktop)
- [x] Session revoke functionality from settings page

### 📋 Implementation Details
- **Risk Score Factors:**
  - MFA not verified: +30
  - IP address changes (last 24h): +20 each (max +40)
  - New/unknown IP: +15
  - Too many concurrent sessions: +10
  - Local/dev environment: -5 (lower risk)

- **Session Limits:**
  - Trial/Basic: 1 concurrent session
  - Pro: 5 concurrent sessions
  - Enterprise: Unlimited sessions

- **Auto-Revocation:**
  - When limit exceeded, oldest session is automatically revoked
  - Revoked sessions receive `session_revoked` error on next heartbeat
  - Must force logout and re-authenticate

---

## Next Steps

### For CentCom Team:
1. **Review this specification** and confirm if the data structure works for your implementation
2. **Answer the implementation questions** above (especially #2, #3, #4, #5, #6)
3. **Update your heartbeat payload** to include the new required fields
4. **Implement session revocation handling** to catch `session_revoked` errors
5. **Test session limits** with different license types
6. **Coordinate timing** for deployment (we'll need to deploy the backend migration first)

### For Lyceum Team:
1. Deploy database migration to production
2. Ensure backward compatibility (new fields are optional initially)
3. Monitor session tracking after CentCom updates are deployed
4. Provide support during CentCom integration

---

## Code Reference

### Backend Files Modified/Created:
- `supabase/migrations/20250125_enhanced_session_tracking.sql` - Database schema
- `src/app/api/centcom/auth/session-update/route.ts` - Session update endpoint
- `src/app/api/auth/sessions/route.ts` - Session retrieval endpoint (GET)
- `src/app/api/auth/sessions/revoke/route.ts` - Session revocation endpoint (POST)
- `src/app/settings/page.tsx` - Frontend UI for session management

---

## Testing Checklist

Once implemented, please test:

- [ ] Heartbeat sends all required fields successfully
- [ ] Risk score is calculated and returned
- [ ] Session limit enforcement works (try creating 2 sessions on a trial account)
- [ ] Auto-revocation of oldest session when limit exceeded
- [ ] Session revocation detection (revoke from settings page, verify next heartbeat gets error)
- [ ] Proper logout flow when session is revoked
- [ ] Sessions display correctly in Lyceum Settings → Session Information page

---

## Questions or Concerns?

Please reply with:
1. Answers to the implementation questions above
2. Any technical constraints or concerns from your side
3. Estimated timeline for implementing these changes
4. Whether you need any additional endpoints or data from our side

**Let's schedule a sync call if needed to discuss implementation details.**

---

## Summary

**What we need from you:**
- Update heartbeat payload to include new fields (device_name, location, license_type, mfa_verified, os)
- Implement session revocation error handling
- Confirm data format and answer implementation questions

**What we provide:**
- Automatic risk score calculation
- Session limit enforcement
- Auto-revocation of old sessions
- User-facing session management UI
- Detailed session tracking and analytics

Looking forward to your feedback!

---

**Lyceum Backend Team**
