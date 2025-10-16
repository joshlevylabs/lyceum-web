# Update Required: Use Lyceum JWT Auth

## Problem
The new endpoints are trying to verify tokens as Supabase tokens, but Centcom uses custom Lyceum JWTs.

## Solution Created
Created `src/lib/auth.ts` with JWT decoding utilities.

## Files That Need Updating

Replace `supabase.auth.getUser(token)` with `getUserIdFromToken(token)` in these files:

### ✅ Already Updated:
1. `src/app/api/centcom/auth/session-update/route.ts`

### ⏳ Need to Update:
2. `src/app/api/admin/sessions/update/route.ts`
3. `src/app/api/user/dashboard/stats/route.ts`

## Quick Fix Template

**Find and replace this pattern:**

```typescript
// OLD CODE:
const { data: { user }, error: authError } = await supabase.auth.getUser(token);
if (authError || !user) {
  return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
}
const userId = user.id;
```

**With:**

```typescript
// NEW CODE:
import { getUserIdFromToken } from '@/lib/auth';

const userId = getUserIdFromToken(token);
if (!userId) {
  return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
}
```

## Test After Updates

```javascript
// In Centcom console:
const sessionData = JSON.parse(localStorage.getItem('centcom_lyceum_session'));
const token = sessionData?.session?.session_token;

// Test all endpoints
fetch('http://localhost:3594/api/user/dashboard/stats', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log);

fetch('http://localhost:3594/api/centcom/auth/session-update', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_id: 'test-' + Date.now(),
    version: '1.0.0',
    platform: 'Windows',
    timestamp: new Date().toISOString()
  })
})
.then(r => r.json())
.then(console.log);
```

## Why This Matters

Centcom issues custom JWT tokens via `/api/centcom/auth/login` with this structure:
```json
{
  "iss": "lyceum",
  "aud": "centcom",
  "sub": "user_id_here",
  "email": "user@example.com",
  "roles": ["admin"],
  "exp": 1760738384
}
```

These are NOT Supabase auth tokens, so `supabase.auth.getUser()` will always fail.
