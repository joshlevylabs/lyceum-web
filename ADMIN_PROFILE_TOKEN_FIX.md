# Admin User Profile Token Expiration Fix

## Issue
When navigating to a user's profile from the admin panel, users encountered:
- Error: "API error response: {}"
- Error: "Token expired"

This occurred in the `resolveUserIdentifier` function when trying to resolve user keys (e.g., "USER-4").

## Root Cause
The code was attempting to get the authentication token in the wrong order:
1. **First**: Reading directly from localStorage (`sb-kffiaqsihldgqdwagook-auth-token`)
2. **Second**: Falling back to `supabase.auth.getSession()` if localStorage failed

The problem is that tokens in localStorage can expire, and the code was using an expired token without refreshing it. This caused the API call to `/api/admin/users/resolve-key/${userId}` to fail with "Token expired".

## Solution
Reversed the token retrieval order to prioritize fresh tokens:
1. **First**: Use `supabase.auth.getSession()` - automatically gets a fresh token
2. **Second**: Fall back to localStorage only if `getSession()` fails

This ensures we always have a valid, non-expired token when making API calls.

## Changes Made

### File: [src/app/admin/users/[userId]/profile/page.tsx](src/app/admin/users/[userId]/profile/page.tsx:222-261)

**Before**:
```typescript
// Get the auth token from localStorage (more reliable than getSession in this context)
let accessToken: string | null = null

try {
  // Try to get from Supabase auth storage
  const authData = localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token')
  if (authData) {
    const parsed = JSON.parse(authData)
    accessToken = parsed.access_token
  }
} catch (storageError) {
  console.error('❌ Error reading from localStorage:', storageError)
}

// Fallback: try getSession() with timeout
if (!accessToken) {
  const { supabase } = await import('@/lib/supabase')
  const { data: { session } } = await supabase.auth.getSession()
  accessToken = session?.access_token || null
}
```

**After**:
```typescript
// Get fresh auth token using getSession() - this automatically refreshes expired tokens
let accessToken: string | null = null

try {
  const { supabase } = await import('@/lib/supabase')

  // First, refresh the session to ensure we have a valid token
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.access_token) {
    accessToken = session.access_token
  }
} catch (sessionError: any) {
  console.error('❌ getSession failed:', sessionError.message)

  // Fallback: try to get from localStorage (less reliable, may be expired)
  try {
    const authData = localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token')
    if (authData) {
      const parsed = JSON.parse(authData)
      accessToken = parsed.access_token
    }
  } catch (storageError) {
    console.error('❌ Error reading from localStorage:', storageError)
  }
}
```

## Why This Works

### `supabase.auth.getSession()` Behavior
- Checks if the current session is still valid
- Automatically refreshes the token if it's expired
- Returns a fresh, valid access token
- Does NOT make unnecessary network requests if token is still valid

### localStorage Approach (Old)
- Stores the token statically
- Token can expire (typically after 1 hour)
- No automatic refresh mechanism
- Requires manual refresh logic

## Testing

After this fix, the admin user profile page should:
1. Load without token expiration errors
2. Successfully resolve user keys (e.g., "USER-4") to UUIDs
3. Fetch user data without authentication failures
4. Work even if the user has been logged in for an extended period

## Best Practices

When making authenticated API calls in Next.js/Supabase apps:

1. **Always use `supabase.auth.getSession()` first**
   ```typescript
   const { data: { session } } = await supabase.auth.getSession()
   const token = session?.access_token
   ```

2. **Don't rely on localStorage directly** - it doesn't handle token refresh

3. **Consider using `refreshSession()` for long-running sessions**
   ```typescript
   await supabase.auth.refreshSession()
   ```

4. **Handle token expiration gracefully** - redirect to login if refresh fails

## Related Files
- [src/lib/auth-utils.ts](src/lib/auth-utils.ts) - Server-side token validation
- [src/app/api/admin/users/resolve-key/[userKey]/route.ts](src/app/api/admin/users/resolve-key/[userKey]/route.ts) - API endpoint that validates tokens
- [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx:183-196) - Example of proper token usage

## Expected Outcome
No more "Token expired" errors when navigating to user profiles in the admin panel. All user key resolution and API calls will use fresh, valid tokens.
