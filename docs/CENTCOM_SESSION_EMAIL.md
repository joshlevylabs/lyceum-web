# Email to CentCom Team

---

**Subject:** 🔄 Coordination Needed: Enhanced Session Tracking Integration

---

Hi CentCom Team,

We've implemented comprehensive session tracking in the Lyceum backend that will enable us to monitor desktop app sessions, enforce license-based session limits, and provide users with a detailed session management UI in Settings.

**We need to coordinate with you on the heartbeat data format to complete the integration.**

## What's New

We've enhanced the session tracking system to:
- Track both web and desktop sessions in one unified view
- Enforce session limits based on license type (1 for trial, 5 for pro, unlimited for enterprise)
- Calculate security risk scores automatically
- Allow users to view and revoke sessions from Settings
- Auto-revoke oldest sessions when limits are exceeded

## What We Need from CentCom

### New Required Fields in Heartbeat Payload

In addition to the fields you're already sending (session_id, version, platform, etc.), we need:

```typescript
{
  // ... existing fields ...

  // NEW REQUIRED FIELDS:
  session_type: "desktop",                              // Always "desktop" for CentCom
  device_name: "Windows Desktop (CentCom Desktop (Tauri))", // User-friendly device description
  location: "Local, Development" | "Production",        // Environment identifier
  license_type: "trial" | "basic" | "pro" | "enterprise", // User's license level
  mfa_verified: boolean,                                // MFA status
  os: "Windows 11",                                     // OS name and version

  // OPTIONAL:
  browser: null,                                        // Always null for desktop
  ip_address: "192.168.1.100",                         // Optional, we extract from headers
  session_metadata: { /* any additional data */ }      // Optional
}
```

### Critical: Session Revocation Handling

When the backend returns this error, **you must force logout**:

```json
{
  "success": false,
  "error": "session_revoked",
  "message": "This session has been revoked. Please log in again."
}
```

**Action required:** Clear token + force logout + redirect to login

## Implementation Questions

We need clarification on a few things:

1. **Device Name:** Can you generate `"Windows Desktop (CentCom Desktop (Tauri))"` dynamically based on OS?

2. **Location Field:** How do you distinguish dev vs production builds?
   - Environment variable?
   - Build configuration?
   - Something else?

3. **License Type:** How does CentCom currently know the user's license type?
   - In JWT payload?
   - Separate API call?
   - Stored locally?

4. **MFA Status:** Do you currently track/receive MFA verification status?

5. **OS Detection:** Can you access detailed OS info in Tauri? (e.g., "Windows 11", "macOS 14.2")

6. **Heartbeat Frequency:** How often are you currently sending heartbeats?
   - **Recommendation:** Every 30-60 seconds for accurate "last activity" tracking

## Example Complete Payload

```typescript
POST /api/centcom/auth/session-update
Authorization: Bearer <jwt_token>

{
  // Existing
  "session_id": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "version": "2.0.2",
  "instance_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_agent": "CentCom/2.0.2 (Windows NT 10.0; Win64; x64)",
  "platform": "windows",
  "build": "2024.01.25",
  "timestamp": "2025-01-25T15:22:18.000Z",

  // New
  "session_type": "desktop",
  "device_name": "Windows Desktop (CentCom Desktop (Tauri))",
  "location": "Local, Development",
  "license_type": "trial",
  "mfa_verified": true,
  "os": "Windows 11",
  "browser": null
}
```

## Backend Status

✅ **Already Implemented:**
- Database schema with new session fields
- Endpoint updated to accept new fields
- Automatic risk score calculation
- Session limit enforcement
- Auto-revoke oldest session when limit exceeded
- Session revocation detection
- Frontend UI for session management
- Session revoke functionality

📋 **Session Limits:**
- Trial/Basic: 1 concurrent session
- Pro: 5 concurrent sessions
- Enterprise: Unlimited

## Next Steps

**For CentCom:**
1. Review the attached detailed spec: `CENTCOM_SESSION_HEARTBEAT_SPEC.md`
2. Answer the implementation questions above
3. Update heartbeat payload with new fields
4. Implement session revocation error handling
5. Test session limits with different license types

**For Lyceum:**
1. Deploy database migration
2. Support CentCom during integration
3. Monitor session tracking after deployment

## Let's Sync

Can we schedule a quick call to discuss:
- Implementation questions
- Timeline for changes
- Any technical constraints on your end
- Testing strategy

**Please reply with:**
- Answers to the 6 implementation questions
- Estimated timeline
- Any concerns or blockers
- Preferred time for a sync call

Looking forward to collaborating on this!

**Full technical specification attached:** [`CENTCOM_SESSION_HEARTBEAT_SPEC.md`](./CENTCOM_SESSION_HEARTBEAT_SPEC.md)

Best,
The Lyceum Team

---

**Quick Reference Links:**
- Session Update Endpoint: `POST /api/centcom/auth/session-update`
- Backend Implementation: `src/app/api/centcom/auth/session-update/route.ts`
- Database Schema: `supabase/migrations/20250125_enhanced_session_tracking.sql`
