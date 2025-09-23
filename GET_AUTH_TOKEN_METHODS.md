# How to Get Your Lyceum Authentication Token

## Method 1: Check localStorage (Most Common)

```javascript
// Check all localStorage for Supabase auth
Object.keys(localStorage).filter(key => key.includes('supabase') || key.includes('auth')).forEach(key => {
  console.log(key + ':', localStorage.getItem(key));
});
```

## Method 2: Direct Supabase Session Check

```javascript
// If you have access to the Supabase client
console.log('Supabase session:', supabase?.auth?.getSession());
```

## Method 3: Check All Cookies

```javascript
// Check all cookies
console.log('All cookies:', document.cookie);
```

## Method 4: Check sessionStorage

```javascript
// Check sessionStorage
Object.keys(sessionStorage).filter(key => key.includes('supabase') || key.includes('auth')).forEach(key => {
  console.log(key + ':', sessionStorage.getItem(key));
});
```

## Method 5: Network Tab Method (Most Reliable)

1. Open browser Developer Tools (F12)
2. Go to **Network** tab
3. Refresh the page or navigate to another page in Lyceum
4. Look for any API request to `/api/` endpoints
5. Click on one of the requests
6. Look in **Headers** → **Request Headers**
7. Find the `Authorization` header or `Cookie` header

## Method 6: Application Tab Method

1. Open Developer Tools (F12)
2. Go to **Application** tab
3. In the left sidebar, expand **Local Storage**
4. Click on your domain (e.g., `http://localhost:3594`)
5. Look for keys containing 'supabase', 'auth', or 'token'

## What to Look For

The token will likely be in one of these formats:

### localStorage Format:
```
Key: sb-[project-id]-auth-token
Value: {"access_token":"eyJ...","token_type":"bearer",...}
```

### Cookie Format:
```
supabase-auth-token=eyJ...
```

### Authorization Header Format:
```
Authorization: Bearer eyJ...
```

## Quick Test Script

Run this comprehensive script in the browser console:

```javascript
// Comprehensive auth token finder
console.log('=== SEARCHING FOR AUTH TOKEN ===');

// Method 1: localStorage
console.log('\n1. LOCALSTORAGE:');
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('auth') || key.includes('token')) {
    console.log(`${key}:`, localStorage.getItem(key));
  }
});

// Method 2: sessionStorage  
console.log('\n2. SESSIONSTORAGE:');
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('auth') || key.includes('token')) {
    console.log(`${key}:`, sessionStorage.getItem(key));
  }
});

// Method 3: Cookies
console.log('\n3. COOKIES:');
document.cookie.split(';').forEach(cookie => {
  if (cookie.includes('supabase') || cookie.includes('auth') || cookie.includes('token')) {
    console.log(cookie.trim());
  }
});

// Method 4: Try common Supabase patterns
console.log('\n4. COMMON PATTERNS:');
const patterns = [
  'sb-kffiaqsihldgqdwagook-auth-token',
  'supabase.auth.token',
  'supabase-auth-token',
  'auth-token'
];

patterns.forEach(pattern => {
  const value = localStorage.getItem(pattern) || sessionStorage.getItem(pattern);
  if (value) {
    console.log(`${pattern}:`, value);
  }
});

console.log('\n=== END SEARCH ===');
```

## Once You Find the Token

### If it's a JSON object:
```javascript
// Parse the JSON and extract access_token
const authData = JSON.parse(localStorage.getItem('sb-xxx-auth-token'));
const token = authData.access_token;
console.log('Token:', token);
```

### If it's already a JWT token:
```javascript
// It should start with 'eyJ'
const token = 'eyJ...'; // Your token here
console.log('Token:', token);
```

## Testing the Token

Once you have the token, test it:

```bash
# Replace YOUR_TOKEN_HERE with the actual token
curl -X GET http://localhost:3594/api/clusters \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

Expected response:
- **200 OK**: Token is valid
- **401 Unauthorized**: Token is invalid or expired
- **403 Forbidden**: Token is valid but lacks permissions

## Troubleshooting

### No Token Found
- Make sure you're logged into Lyceum
- Try logging out and logging back in
- Check if you're on the correct domain

### Token Doesn't Work
- Token might be expired - try logging out and back in
- Check if the token format is correct (should start with 'eyJ')
- Verify you're using the correct API endpoint URL

### Still Having Issues
Try this direct approach:

```javascript
// Get current user from Supabase (if available)
if (typeof supabase !== 'undefined') {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      console.log('Access Token:', session.access_token);
    } else {
      console.log('No active session');
    }
  });
}
```
