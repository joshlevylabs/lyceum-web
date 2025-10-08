# How to Get Supabase JWT Token for Testing

## Method 1: Browser DevTools (Easiest)

1. **Open Lyceum in your browser**:
   ```
   http://localhost:3594
   ```

2. **Log in** with your test user credentials

3. **Open Browser DevTools**:
   - Chrome/Edge: Press `F12` or `Ctrl+Shift+I`
   - Firefox: Press `F12`
   - Safari: `Cmd+Option+I`

4. **Go to Console tab**

5. **Run this command**:
   ```javascript
   // Copy and paste this into the console
   (async () => {
     const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
     const supabase = createClient(
       'https://kffiaqsihldgqdwagook.supabase.co',
       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTU0MTYsImV4cCI6MjA2ODQ3MTQxNn0.5Wzzoat1TsoLLbsqjuoUEKyawJgYmvrMYbJ-uvosdu0'
     );
     const { data: { session } } = await supabase.auth.getSession();
     if (session) {
       console.log('🎫 Your JWT Token:');
       console.log(session.access_token);
       console.log('\n📋 Copy the token above and use it in your test script!');
       return session.access_token;
     } else {
       console.log('❌ Not logged in. Please log in first.');
     }
   })();
   ```

6. **Copy the token** that gets printed

7. **Update your test script**:
   ```javascript
   TEST_CONFIG.authToken = "paste_token_here"
   ```

---

## Method 2: From localStorage (Alternative)

1. **After logging in**, open DevTools Console

2. **Run**:
   ```javascript
   localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token')
   ```

3. **Parse the result** to get the access_token:
   ```javascript
   JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token')).access_token
   ```

---

## Method 3: Create a Helper Script

Create `get-jwt-token.html` and open in browser after logging in:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Get JWT Token</title>
  <style>
    body { font-family: monospace; padding: 20px; max-width: 800px; margin: 0 auto; }
    .token { background: #f0f0f0; padding: 15px; border-radius: 5px; word-break: break-all; }
    button { padding: 10px 20px; margin: 10px 0; cursor: pointer; }
  </style>
</head>
<body>
  <h1>🎫 Get Supabase JWT Token</h1>
  <button onclick="getToken()">Get My Token</button>
  <div id="result"></div>

  <script type="module">
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
    
    window.getToken = async function() {
      const supabase = createClient(
        'https://kffiaqsihldgqdwagook.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTU0MTYsImV4cCI6MjA2ODQ3MTQxNn0.5Wzzoat1TsoLLbsqjuoUEKyawJgYmvrMYbJ-uvosdu0'
      )
      
      const { data: { session } } = await supabase.auth.getSession()
      const result = document.getElementById('result')
      
      if (session) {
        result.innerHTML = `
          <h2>✅ Token Retrieved</h2>
          <p><strong>User:</strong> ${session.user.email}</p>
          <p><strong>Expires:</strong> ${new Date(session.expires_at * 1000).toLocaleString()}</p>
          <h3>Your JWT Token:</h3>
          <div class="token">${session.access_token}</div>
          <button onclick="navigator.clipboard.writeText('${session.access_token}')">📋 Copy to Clipboard</button>
        `
      } else {
        result.innerHTML = '<h2>❌ Not Logged In</h2><p>Please log in to Lyceum first, then refresh this page.</p>'
      }
    }
  </script>
</body>
</html>
```

---

## Method 4: Quick SQL Query (Get User ID)

If you just need the user ID:

```sql
-- Get your test user's ID
SELECT id, email FROM auth.users 
WHERE email LIKE '%test%' 
ORDER BY created_at DESC 
LIMIT 1;
```

---

## Token Lifetime

⚠️ **Important**: Supabase JWT tokens expire after 1 hour by default.

If your token expires during testing:
- Just get a new one using any method above
- The tokens are safe to regenerate

---

## Quick Setup Checklist

1. ✅ Run `create-test-license-for-centcom.sql` in Supabase SQL Editor
2. ✅ Copy the generated license key_code
3. ✅ Log in to Lyceum at `http://localhost:3594`
4. ✅ Open DevTools Console and run the token script
5. ✅ Copy the JWT token
6. ✅ Update both values in `test-centcom-cluster-apis.js`:
   ```javascript
   const TEST_CONFIG = {
     licenseKey: 'CENTCOM-TEST-PRO-abc12345',  // From SQL
     authToken: 'eyJhbG...',  // From DevTools
     // ...
   }
   ```
7. ✅ Run tests: `node test-centcom-cluster-apis.js`

---

## Troubleshooting

**Token not found?**
- Make sure you're logged in first
- Try refreshing the page after logging in

**Token expired?**
- Just get a new one - they regenerate on each login

**Can't access DevTools?**
- Use Method 3 (HTML helper file)
- Or use Method 4 to at least test the license endpoint

---

That's it! Once you have both values, your tests will run successfully. 🚀

