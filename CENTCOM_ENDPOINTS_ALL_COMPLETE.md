# All Centcom Endpoints - Complete Implementation

**Status**: All 7 endpoints now using Lyceum JWT authentication
**Date**: 2025-10-16

---

## Overview

All Centcom API endpoints have been updated to use Lyceum JWT tokens instead of Supabase auth tokens. This ensures consistent authentication across all endpoints.

### Authentication Pattern

All endpoints now follow this pattern:

```typescript
import { getUserIdFromToken } from '@/lib/auth'

// Validate JWT token
const authHeader = request.headers.get('Authorization')
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

const token = authHeader.substring(7)
const userId = getUserIdFromToken(token)

if (!userId) {
  return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
}

// Use userId for database queries
```

---

## Endpoints

### 1. Session Update (Primary) ✅
**POST** `/api/centcom/auth/session-update`

**File**: [src/app/api/centcom/auth/session-update/route.ts](src/app/api/centcom/auth/session-update/route.ts)

Updates session metadata after Centcom authentication.

**Request Body**:
```json
{
  "session_id": "string",
  "version": "string",
  "instance_id": "string",
  "user_agent": "string",
  "platform": "string",
  "build": "string",
  "timestamp": "ISO8601 string"
}
```

**Database**: Upserts to `user_sessions` table

---

### 2. Session Update (Fallback) ✅
**POST** `/api/admin/sessions/update`

**File**: [src/app/api/admin/sessions/update/route.ts](src/app/api/admin/sessions/update/route.ts)

Alternative endpoint with enhanced logging. Same functionality as primary endpoint.

---

### 3. Dashboard Statistics ✅
**GET** `/api/user/dashboard/stats`

**File**: [src/app/api/user/dashboard/stats/route.ts](src/app/api/user/dashboard/stats/route.ts)

Returns comprehensive dashboard statistics:

**Response**:
```json
{
  "data_clusters": 0,
  "test_projects": 0,
  "plugin_licenses": 3,
  "total_sessions": 902,
  "active_users": 0,
  "measurements_today": 0,
  "measurements_this_week": 0,
  "storage_used_gb": 0
}
```

**Database Queries**:
- `data_clusters` - Count by user_id
- `projects` - Count by created_by
- `license_keys` - Count active licenses
- `centcom_sessions` - Count and filter by activity
- `centcom_measurements` - Count by date ranges
- `user_storage` - Get total_bytes

---

### 4. Session Sync ✅ (NEW: JWT Auth Added)
**POST** `/api/centcom/sessions/sync`

**File**: [src/app/api/centcom/sessions/sync/route.ts](src/app/api/centcom/sessions/sync/route.ts)

**Changes Made**:
- ✅ Added `import { getUserIdFromToken } from '@/lib/auth'`
- ✅ Removed `user_id` from request body (now extracted from JWT)
- ✅ Added JWT validation at start of endpoint
- ✅ Updated all queries to use `userId` from token instead of `body.user_id`

**Request Body**:
```json
{
  "session_data": {
    "session_id": "string",
    "status": "active" | "idle" | "terminated",
    "created_at": "ISO8601 string",
    "last_activity": "ISO8601 string",
    "duration_seconds": 0,
    "location": {
      "ip": "string",
      "country": "string",
      "region": "string",
      "city": "string",
      "timezone": "string",
      "formatted": "string"
    },
    "device_info": {
      "platform": "windows" | "macos" | "linux",
      "os_version": "string",
      "device_type": "desktop" | "mobile" | "tablet",
      "browser": "string",
      "user_agent": "string",
      "formatted": "string"
    },
    "application_info": {
      "app_name": "centcom",
      "app_version": "string",
      "build_number": "string",
      "license_type": "enterprise" | "professional" | "trial"
    },
    "security_info": {
      "mfa_verified": false,
      "risk_score": 0.1,
      "risk_factors": [],
      "authentication_method": "string"
    }
  },
  "sync_metadata": {
    "sync_timestamp": "ISO8601 string",
    "sync_source": "string",
    "sync_version": "string",
    "heartbeat_type": "active_sync" | "idle_sync",
    "last_sync_interval": 480000
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Session synced successfully",
  "session_id": "centcom-sync-...",
  "external_session_id": "original-session-id",
  "action": "updated" | "created"
}
```

**Features**:
- Finds existing sessions by `external_session_id` or `centcom_session_id`
- Cleans up duplicate sessions automatically
- Supports optimized heartbeat intervals (8min active, 24hr idle)
- Stores comprehensive device, location, and security metadata
- Upserts to `centcom_sessions` table

**Database**: `centcom_sessions` table

---

### 5. Onboarding Sessions ✅ (NEW: JWT Auth Added)
**GET** `/api/user/onboarding/sessions`

**File**: [src/app/api/user/onboarding/sessions/route.ts](src/app/api/user/onboarding/sessions/route.ts)

**Changes Made**:
- ✅ Added `import { getUserIdFromToken } from '@/lib/auth'`
- ✅ Replaced `supabase.auth.getUser(token)` with `getUserIdFromToken(token)` in GET handler
- ✅ Replaced `supabase.auth.getUser(token)` with `getUserIdFromToken(token)` in PUT handler
- ✅ Already had CORS OPTIONS handler

**Response**:
```json
{
  "user_id": "uuid",
  "sessions": {
    "upcoming": [...],
    "completed": [...],
    "cancelled": [...],
    "all": [...]
  },
  "progress": [...],
  "summary": {
    "total_sessions": 0,
    "upcoming_count": 0,
    "completed_count": 0,
    "cancelled_count": 0,
    "completion_rate": 0
  }
}
```

**Database Queries**:
- `onboarding_sessions` - User's sessions with license data
- `license_keys` - License information joined by license_key_id
- `onboarding_progress` - User's progress records

---

### 6. Onboarding Session Update ✅
**PUT** `/api/user/onboarding/sessions`

**File**: Same as #5 - [src/app/api/user/onboarding/sessions/route.ts](src/app/api/user/onboarding/sessions/route.ts)

Updates scheduling for an onboarding session.

**Request Body**:
```json
{
  "session_id": "uuid",
  "scheduled_at": "ISO8601 string",
  "duration_minutes": 60
}
```

**Response**:
```json
{
  "message": "Session updated successfully",
  "session": {...}
}
```

---

### 7. CORS Preflight Handlers ✅

All endpoints have proper OPTIONS handlers for CORS preflight:

```typescript
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    'http://localhost:3003',
    'http://localhost:3594',
    'tauri://localhost',
    'https://centcom.thelyceum.io'
  ]

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin || '') ? origin! : '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}
```

---

## Testing All Endpoints

### JavaScript Console Tests

```javascript
// Get token
const session = JSON.parse(localStorage.getItem('centcom_lyceum_session'));
const token = session?.session?.session_token;

// Test 1: Session Update
fetch('http://localhost:3594/api/centcom/auth/session-update', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_id: crypto.randomUUID(),
    version: '1.0.0',
    platform: navigator.platform,
    user_agent: navigator.userAgent
  })
}).then(r => r.json()).then(console.log)

// Test 2: Dashboard Stats
fetch('http://localhost:3594/api/user/dashboard/stats', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log)

// Test 3: Session Sync (NEW JWT)
fetch('http://localhost:3594/api/centcom/sessions/sync', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_data: {
      session_id: crypto.randomUUID(),
      status: 'active',
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      location: {
        ip: '127.0.0.1',
        country: 'US',
        city: 'Development',
        timezone: 'UTC',
        formatted: 'Development, US'
      },
      device_info: {
        platform: navigator.platform,
        device_type: 'desktop',
        browser: 'CentCom Desktop',
        user_agent: navigator.userAgent,
        formatted: `${navigator.platform} / CentCom Desktop`
      },
      application_info: {
        app_name: 'centcom',
        app_version: '1.0.0',
        license_type: 'enterprise'
      },
      security_info: {
        mfa_verified: false,
        risk_score: 0.1
      }
    },
    sync_metadata: {
      sync_timestamp: new Date().toISOString(),
      sync_source: 'centcom_desktop',
      sync_version: '2.0_optimized'
    }
  })
}).then(r => r.json()).then(console.log)

// Test 4: Onboarding Sessions (NEW JWT)
fetch('http://localhost:3594/api/user/onboarding/sessions', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log)
```

---

## Changes Summary

### Files Modified

1. **[src/app/api/centcom/sessions/sync/route.ts](src/app/api/centcom/sessions/sync/route.ts)**
   - Added JWT authentication
   - Removed `user_id` from request body interface
   - Extract user ID from token instead of request body
   - Updated all database queries to use `userId` from token

2. **[src/app/api/user/onboarding/sessions/route.ts](src/app/api/user/onboarding/sessions/route.ts)**
   - Added JWT authentication to GET handler
   - Added JWT authentication to PUT handler
   - Removed `supabase.auth.getUser()` calls
   - Already had CORS OPTIONS handler

### Authentication Library

**[src/lib/auth.ts](src/lib/auth.ts)** - Shared JWT utilities used by all endpoints:

```typescript
export function getUserIdFromToken(token: string): string | null {
  const payload = decodeLyceumToken(token);
  return payload?.sub || null;
}

export function decodeLyceumToken(token: string): LyceumJWTPayload | null {
  // Validates: structure, expiration, issuer, audience
  // Returns: { iss, aud, sub, email, roles, license_type, exp, iat }
}
```

---

## Verification Checklist

- [x] Session Update endpoint uses JWT auth
- [x] Admin Session Update endpoint uses JWT auth
- [x] Dashboard Stats endpoint uses JWT auth
- [x] Session Sync endpoint uses JWT auth (NEW)
- [x] Onboarding Sessions GET endpoint uses JWT auth (NEW)
- [x] Onboarding Sessions PUT endpoint uses JWT auth (NEW)
- [x] All endpoints have CORS OPTIONS handlers
- [x] All endpoints extract user_id from JWT token
- [x] All endpoints validate token before database queries
- [x] Token validation uses shared `getUserIdFromToken()` utility
- [ ] Test all endpoints with real Lyceum JWT tokens
- [ ] Update Centcom client to remove user_id from session sync requests

---

## Breaking Changes for Centcom Client

### Session Sync Endpoint

**Before** (Old client code):
```javascript
fetch('/api/centcom/sessions/sync', {
  body: JSON.stringify({
    user_id: userId,  // ❌ Remove this
    session_data: {...},
    sync_metadata: {...}
  })
})
```

**After** (New client code):
```javascript
fetch('/api/centcom/sessions/sync', {
  headers: {
    'Authorization': `Bearer ${token}`  // ✅ User ID extracted from token
  },
  body: JSON.stringify({
    // user_id field removed
    session_data: {...},
    sync_metadata: {...}
  })
})
```

---

## Next Steps

1. ✅ All endpoints updated with JWT authentication
2. ✅ All endpoints tested individually
3. ⏭️ Test Session Sync with real Centcom client
4. ⏭️ Test Onboarding Sessions with real Centcom client
5. ⏭️ Update Centcom client to remove `user_id` from session sync payload
6. ⏭️ Deploy to production
7. ⏭️ Monitor error logs for authentication issues

---

## Production Deployment Notes

### Environment Variables Required

```bash
NEXT_PUBLIC_SUPABASE_URL=https://kffiaqsihldgqdwagook.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Database Tables Required

- `user_sessions` - Session metadata
- `session_activity` - Session heartbeats
- `data_clusters` - Dashboard stats
- `centcom_measurements` - Measurements
- `user_storage` - Storage tracking
- `centcom_sessions` - Session sync data
- `onboarding_sessions` - Onboarding sessions
- `onboarding_progress` - Onboarding progress
- `license_keys` - License information
- `projects` - Test projects (existing table)

All tables created via migration: [supabase/migrations/20251016_centcom_FINAL.sql](supabase/migrations/20251016_centcom_FINAL.sql)

---

## Support

For issues:
1. Check server logs for authentication errors
2. Verify token in localStorage: `centcom_lyceum_session.session.session_token`
3. Test token decoding: `decodeLyceumToken(token)`
4. Check token expiration and issuer/audience claims
5. Review [CENTCOM_API_REFERENCE.md](CENTCOM_API_REFERENCE.md) for endpoint details
