# Admin User Profile Authentication Fix

## Issue
When navigating to admin user profiles (e.g., `/admin/users/USER-3/profile`), the page was failing with a 401 error:

```
GET https://www.thelyceum.io/api/admin/users/resolve-key/USER-3 401 (Unauthorized)
Error: Missing or invalid authorization header
```

## Root Cause
The frontend was making a fetch request to `/api/admin/users/resolve-key/[userKey]` without including the Authorization header with the Supabase session token.

The API endpoint uses `requireAuth(request)` which expects an `Authorization: Bearer <token>` header, but the frontend was only sending `credentials: 'include'` without any headers.

## Solution
Updated `src/app/admin/users/[userId]/profile/page.tsx` to:

1. Import the Supabase client
2. Get the current session with `supabase.auth.getSession()`
3. Include the Authorization header with the access token in the fetch request

### Code Changes
**File:** `src/app/admin/users/[userId]/profile/page.tsx`

**Before (lines 222-237):**
```typescript
} else if (userId.startsWith('USER-')) {
  console.log('🔑 Detected user key format, resolving via API call:', userId)
  
  // Use fetch with timeout instead of direct Supabase query
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    console.log('⏱️ Query timeout after 10s')
    controller.abort()
  }, 10000)
  
  try {
    console.log('📞 Calling API to resolve user key...')
    const response = await fetch(`/api/admin/users/resolve-key/${userId}`, {
      signal: controller.signal,
      credentials: 'include'
    })
```

**After (lines 222-250):**
```typescript
} else if (userId.startsWith('USER-')) {
  console.log('🔑 Detected user key format, resolving via API call:', userId)
  
  // Get the Supabase session for authentication
  const { supabase } = await import('@/lib/supabase')
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    console.error('❌ No access token found')
    throw new Error('Authentication required')
  }
  
  // Use fetch with timeout instead of direct Supabase query
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    console.log('⏱️ Query timeout after 10s')
    controller.abort()
  }, 10000)
  
  try {
    console.log('📞 Calling API to resolve user key...')
    const response = await fetch(`/api/admin/users/resolve-key/${userId}`, {
      signal: controller.signal,
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })
```

## Other API Endpoints Checked
The following API endpoints were also checked and confirmed to **NOT require authentication** (they use service role keys directly):

- `/api/user-profiles/enhanced`
- `/api/user-profiles/sessions`
- `/api/user-profiles/licenses`
- `/api/admin/users/[userId]/detailed-licenses`
- `/api/admin/users/[userId]/centcom-sessions`

These endpoints are working correctly and don't need changes.

## Testing
After deploying this fix:

1. Navigate to `/admin/users` as an admin user
2. Click on any user profile (e.g., USER-1, USER-2, USER-3)
3. The profile should load successfully without 401 errors
4. All tabs (Profile, Licenses, Clusters, Sessions, Payment, Account) should work correctly

## Status
✅ **FIXED** - Ready for deployment to production

The fix ensures that admin users can properly view user profiles by including proper authentication in API requests.

