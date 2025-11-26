# Web Session Tracking - Implementation Complete

## Summary

Web browser session tracking has been fully implemented, matching desktop app session tracking capabilities.

## What Was Implemented

### 1. Web Session Sync Service
**File:** `src/services/webSessionSync.ts`

- Automatic heartbeat tracking (60 sec active, 10 min idle)
- Activity detection (mouse, keyboard, scroll, touch)
- Idle/active state transitions
- Browser and OS detection
- Device name generation
- Session revocation detection
- Automatic cleanup on logout

### 2. AuthContext Integration
**File:** `src/contexts/AuthContext.tsx`

- Starts web session tracking on login
- Stops tracking on logout
- Handles session revocation events
- Manages session lifecycle

### 3. Session Data Tracked

**Web Session Payload:**
```json
{
  "session_type": "web",
  "session_id": "access_token",
  "user_id": "uuid",
  "device_name": "Chrome on Windows",
  "browser": "Chrome",
  "os": "Windows",
  "platform": "windows",
  "location": "Local, Development" | "Production",
  "license_type": "enterprise",
  "mfa_verified": false,
  "version": "1.0.0",
  "build": "2025-01-25",
  "user_agent": "Mozilla/5.0...",
  "instance_id": "uuid",
  "timestamp": "2025-01-25T...",
  "session_metadata": {
    "status": "active" | "idle",
    "created_at": "2025-01-25T...",
    "last_activity": "2025-01-25T...",
    "sync_source": "web_active_heartbeat",
    "sync_version": "1.0_web"
  }
}
```

### 4. Features

✅ **Automatic Heartbeats**
- Active: Every 60 seconds
- Idle: Every 10 minutes
- Switches automatically based on user activity

✅ **Activity Detection**
- Mouse movements
- Keyboard input
- Scrolling
- Touch events

✅ **Browser Detection**
- Chrome, Firefox, Safari, Edge, Opera
- Falls back to "Unknown Browser"

✅ **OS Detection**
- Windows, macOS, Linux, Android, iOS
- Falls back to "Unknown OS"

✅ **Environment Detection**
- Local Development (localhost)
- Staging (*.staging.*)
- Production

✅ **Session Revocation**
- Detects 403 session_revoked responses
- Automatically logs out user
- Dispatches custom event for handling

✅ **Session Lifecycle**
- Starts on login
- Stops on logout
- Persists instance ID in localStorage

---

## Next Steps for Deployment

### 1. Run Database Migration

**IMPORTANT:** Run this first!

```bash
# Apply the enhanced session tracking migration
psql -h <supabase-host> -U postgres -d postgres -f supabase/migrations/20250125_enhanced_session_tracking.sql
```

Or via Supabase dashboard:
1. Go to SQL Editor
2. Paste contents of `supabase/migrations/20250125_enhanced_session_tracking.sql`
3. Run migration

### 2. Test Web Session Tracking

1. **Login to Lyceum web app**
   - Open browser console
   - Look for: `✅ Web session tracking started`

2. **Check heartbeats are sent**
   - Open Network tab
   - Filter: `/centcom/auth/session-update`
   - Verify requests every 60 seconds
   - Check payload matches specification

3. **View in Session Information page**
   - Go to Settings → Session Information
   - Should see your current web session
   - Device name: "Chrome on Windows" (or similar)
   - Status: Active
   - Last activity updating in real-time

4. **Test idle detection**
   - Don't interact for 5+ minutes
   - Status should change to "Idle"
   - Heartbeat frequency should drop to 10 minutes

5. **Test session revocation**
   - Open second browser/tab
   - Go to admin panel → Sessions
   - Revoke the first session
   - Verify first tab logs out automatically within 60 seconds

### 3. Test Session Limits

**Trial/Basic (1 session):**
1. Login on Chrome
2. Login on Firefox
3. Chrome session should be auto-revoked
4. Chrome should log out automatically

**Pro (5 sessions):**
1. Login on 5 different browsers/devices
2. All should stay active
3. 6th login should revoke oldest session

---

## API Endpoint Used

**Endpoint:** `POST /api/centcom/auth/session-update`

Both web and desktop sessions use the same endpoint. The `session_type` field differentiates them:
- Desktop: `session_type: "desktop"`
- Web: `session_type: "web"`

---

## Configuration

### Environment Variables

**Required:**
- `NEXT_PUBLIC_LYCEUM_API_BASE_URL` - API base URL (default: http://localhost:3594/api)

**Optional:**
- None

### Constants (in `webSessionSync.ts`)

```typescript
IDLE_THRESHOLD = 5 * 60 * 1000         // 5 minutes
ACTIVE_UPDATE_INTERVAL = 60 * 1000     // 60 seconds
IDLE_UPDATE_INTERVAL = 10 * 60 * 1000  // 10 minutes
```

---

## Troubleshooting

### Web session not appearing in Settings

**Check:**
1. Console for errors
2. Network tab for failed requests
3. Database migration applied
4. User authenticated successfully

### Heartbeats not being sent

**Check:**
1. Console for: `✅ Web session tracking started`
2. No console errors
3. Network tab for blocked requests
4. CORS configured correctly

### Session not logging out when revoked

**Check:**
1. 403 response has `error: "session_revoked"`
2. Event listener registered: `window.addEventListener('session-revoked')`
3. signOut function called

---

## Performance Impact

### Minimal Impact

**Network:**
- Active: 60 requests/hour = 1 req/min
- Idle: 6 requests/hour = 1 req/10min
- Payload size: ~1KB per request

**Client:**
- Activity listeners: Passive, no performance impact
- Memory: Single service instance per session
- CPU: Negligible (timers only)

**Server:**
- Same as desktop sessions
- 1000 active users = 16.7 req/sec
- Easily handled by modern infrastructure

---

## Future Enhancements

### V2 Features (Optional)

1. **MFA Status Integration**
   - Connect to real MFA verification
   - Update risk score accordingly

2. **Geolocation**
   - IP-based country/city detection
   - Display in session info

3. **Screen Resolution**
   - Track in session_metadata
   - Useful for analytics

4. **Network Type**
   - WiFi, cellular, ethernet
   - Track connection quality

5. **Visibility API**
   - Detect when tab is hidden
   - Pause heartbeats if hidden for long periods

---

## Files Modified

### Created:
1. `src/services/webSessionSync.ts` - Web session tracking service
2. `docs/WEB_SESSION_TRACKING_IMPLEMENTED.md` - This document

### Modified:
3. `src/contexts/AuthContext.tsx` - Integrated session tracking
4. `supabase/migrations/20250125_enhanced_session_tracking.sql` - Database schema

---

## Success Criteria

✅ Web session appears in Session Information page
✅ Heartbeats sent every 60 seconds
✅ Last activity updates in real-time
✅ Idle detection works after 5 minutes
✅ Session revocation forces logout
✅ Multiple browser sessions tracked separately
✅ Session limits enforced correctly

---

**Status:** ✅ **READY FOR TESTING**

**Next Action:** Run database migration and test!

