# Get Fresh Authentication Token

## Run this in your browser console to get a fresh token:

```javascript
// Get the current auth token from Supabase
const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token'));
const freshToken = authData?.access_token;

console.log('=== FRESH TOKEN ===');
console.log('Token:', freshToken);
console.log('Expires:', new Date(authData?.expires_at * 1000));
console.log('User:', authData?.user?.email);

// Copy to clipboard (if available)
if (navigator.clipboard) {
  navigator.clipboard.writeText(freshToken).then(() => {
    console.log('✅ Token copied to clipboard!');
  });
}

// Also return it for easy copying
freshToken;
```

## Test API with Fresh Token:

Once you have the fresh token, run this test:

```javascript
fetch('http://localhost:3594/api/clusters', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_FRESH_TOKEN_HERE',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log('Response:', data))
.catch(error => console.error('Error:', error));
```

## Expected Success Response:

```json
{
  "success": true,
  "clusters": [],
  "total": 0,
  "offset": 0,
  "limit": 50
}
```
