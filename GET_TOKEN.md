# How to Get Your Admin JWT Token

## Method 1: Find Your Supabase Auth Token (Recommended)

1. Go to **https://thelyceum.io** and log in as admin
2. Open Browser DevTools (press **F12**)
3. Go to the **Console** tab
4. Run this code to find all Supabase-related localStorage keys:

```javascript
// List all localStorage keys to find the correct one
Object.keys(localStorage).filter(key => key.includes('auth')).forEach(key => {
    console.log('Key:', key);
    console.log('Value:', localStorage.getItem(key));
    console.log('---');
});
```

5. Look for a key that looks like: `sb-<something>-auth-token`
6. Once you find the correct key, run this to get just the access token:

```javascript
// Replace 'sb-YOUR-PROJECT-REF-auth-token' with the actual key name
const authData = JSON.parse(localStorage.getItem('sb-YOUR-PROJECT-REF-auth-token'));
console.log('Access Token:', authData.access_token);
```

## Method 2: Check All Possible Locations

Try running each of these in the console until one works:

```javascript
// Option A: Standard Supabase format
try {
    const data = JSON.parse(localStorage.getItem('sb-hgdihvqzugtczwskuwqw-auth-token'));
    console.log('Token:', data.access_token);
} catch(e) { console.log('Not found with this key'); }

// Option B: Check session storage
try {
    const data = JSON.parse(sessionStorage.getItem('supabase.auth.token'));
    console.log('Token:', data.access_token);
} catch(e) { console.log('Not in sessionStorage'); }

// Option C: Check for Next-Auth
try {
    const data = JSON.parse(localStorage.getItem('next-auth.session-token'));
    console.log('Token:', data);
} catch(e) { console.log('Not Next-Auth'); }

// Option D: Search all storage for any token-like strings
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    if (value && value.includes('eyJ')) {  // JWT tokens start with eyJ
        console.log('Found potential token in:', key);
        console.log('Value:', value.substring(0, 100) + '...');
    }
}
```

## Method 3: Get Token from Network Request

1. Stay logged in at https://thelyceum.io
2. Open DevTools (F12) → **Network** tab
3. Refresh the page
4. Look for any API request (like `/api/user` or `/api/dashboard`)
5. Click on the request
6. Go to **Headers** → **Request Headers**
7. Find the `Authorization` header
8. Copy the value after `Bearer ` (that's your token)

## Method 4: Use Supabase Dashboard (Alternative)

If you can't find the token in the browser:

1. Go to your Supabase project dashboard at https://supabase.com
2. Click on your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (⚠️ WARNING: This is very powerful, use carefully)
5. Use this as your ADMIN_TOKEN

**Note:** The service_role key bypasses all RLS policies, so only use it for admin tasks.

## Method 5: Generate a New Token via API

If you have access to your database:

1. Go to Supabase Dashboard → **SQL Editor**
2. Run this query to find your user ID:
   ```sql
   SELECT id, email, role
   FROM auth.users
   WHERE email = 'your-admin-email@example.com';
   ```

3. Then you can use the Supabase client to sign in and get a token programmatically

## Verification

Once you have your token, verify it's correct:

```javascript
// Decode the JWT to see what's inside (without verifying signature)
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch(e) {
        return null;
    }
}

// Use it:
const payload = parseJwt('YOUR_TOKEN_HERE');
console.log('User ID:', payload.sub);
console.log('Email:', payload.email);
console.log('Role:', payload.user_metadata?.role);
console.log('Expires:', new Date(payload.exp * 1000));
```

## Common Issues

### Token is expired
- JWT tokens typically expire after 1 hour
- Log out and log back in to get a fresh token
- Or refresh the page and grab the new token

### Token doesn't have admin permissions
- Check your role in the database:
  ```sql
  SELECT email, role FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
  ```
- Role should be `admin` or `superadmin`

### Still can't find the token?
- Make sure you're logged in to https://thelyceum.io
- Try logging out and back in
- Clear cache and try again
- Check if your app uses a custom auth system

## Quick Reference

**Your domain:** https://thelyceum.io
**API endpoint:** https://thelyceum.io/api/admin/centcom/releases/upload
**Token format:** Starts with `eyJ...` and is very long (500+ characters)

---

**Once you have your token**, paste it into line 8 of `upload_centcom_installers.ps1`
