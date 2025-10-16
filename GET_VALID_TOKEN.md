# How to Get a Valid Token for Testing

## Method 1: From Centcom's Logged-In Session

```javascript
// In Centcom browser console (when logged in)
const session = JSON.parse(localStorage.getItem('lyceum_session'));
console.log('Session:', session);

// Get the access_token (not session_token!)
const token = session?.access_token;
console.log('Access Token:', token);

// Now test with the correct token
fetch('http://localhost:3594/api/user/dashboard/stats', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log);
```

## Method 2: Check localStorage Structure

```javascript
// See what's actually in localStorage
console.log('All localStorage keys:', Object.keys(localStorage));

// Check different possible keys
console.log('lyceum_session:', localStorage.getItem('lyceum_session'));
console.log('supabase.auth.token:', localStorage.getItem('supabase.auth.token'));

// Supabase stores auth in this format:
const supabaseKey = Object.keys(localStorage).find(key =>
  key.startsWith('sb-') && key.includes('-auth-token')
);
if (supabaseKey) {
  const authData = JSON.parse(localStorage.getItem(supabaseKey));
  console.log('Supabase Auth:', authData);
  console.log('Access Token:', authData?.access_token);
}
```

## Method 3: Get Fresh Token from Supabase Client

```javascript
// In Centcom console
import { supabase } from './path/to/supabase/client';

const { data: { session }, error } = await supabase.auth.getSession();
if (session) {
  console.log('✅ Valid Token:', session.access_token);

  // Test immediately
  fetch('http://localhost:3594/api/user/dashboard/stats', {
    headers: { 'Authorization': `Bearer ${session.access_token}` }
  })
  .then(r => r.json())
  .then(console.log);
} else {
  console.log('❌ Not logged in or session expired');
}
```

## Method 4: Use Network Tab

1. Open Chrome DevTools → Network tab
2. In Centcom, perform any action that calls the API
3. Find a request to `localhost:3594/api/...`
4. Look at the Request Headers
5. Copy the `Authorization: Bearer ...` value

## Quick Fix: Check Token Format

The issue might be:
- Using `session_token` instead of `access_token`
- Token might be expired
- Token might be from wrong environment

Try this:

```javascript
// Check what you have
const session = JSON.parse(localStorage.getItem('lyceum_session'));
console.log('Keys in session:', Object.keys(session));

// Try both possible token fields
const token1 = session?.access_token;
const token2 = session?.session_token;

console.log('access_token exists:', !!token1);
console.log('session_token exists:', !!token2);

// Test both
if (token1) {
  fetch('http://localhost:3594/api/user/dashboard/stats', {
    headers: { 'Authorization': `Bearer ${token1}` }
  })
  .then(r => r.json())
  .then(data => console.log('With access_token:', data));
}

if (token2) {
  fetch('http://localhost:3594/api/user/dashboard/stats', {
    headers: { 'Authorization': `Bearer ${token2}` }
  })
  .then(r => r.json())
  .then(data => console.log('With session_token:', data));
}
```

## Common Issues

### Issue 1: Wrong Token Field
- ❌ `session_token` - Not the right field
- ✅ `access_token` - This is what Supabase uses

### Issue 2: Expired Token
- Tokens expire after a certain time
- Re-login to Centcom to get a fresh token

### Issue 3: Wrong Storage Key
- Check if it's `lyceum_session` or something else
- Supabase often uses keys like `sb-kffiaqsihldgqdwagook-auth-token`

## Once You Have a Valid Token

```javascript
// Save it for easy testing
window.TEST_TOKEN = 'your_valid_token_here';

// Then you can quickly test:
fetch('http://localhost:3594/api/user/dashboard/stats', {
  headers: { 'Authorization': `Bearer ${window.TEST_TOKEN}` }
})
.then(r => r.json())
.then(console.log);
```

## Expected Success Response

When it works, you should see:
```json
{
  "data_clusters": 0,
  "test_projects": 0,
  "plugin_licenses": 0,
  "total_sessions": 0,
  "active_users": 0,
  "measurements_today": 0,
  "measurements_this_week": 0,
  "storage_used_gb": 0
}
```
