# Get JWT Token - Quick Steps

## 🚀 Super Fast Method (30 seconds)

### Step 1: Open Lyceum and Log In
```
http://localhost:3594
```
Log in with your credentials (josh@thelyceum.io)

### Step 2: Open Browser Console
- Press `F12` (or `Ctrl+Shift+I`)
- Click **Console** tab

### Step 3: Run This Command
Copy and paste this entire block into the console:

```javascript
(async () => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(
    'https://kffiaqsihldgqdwagook.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTU0MTYsImV4cCI6MjA2ODQ3MTQxNn0.5Wzzoat1TsoLLbsqjuoUEKyawJgYmvrMYbJ-uvosdu0'
  );
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    console.log('🎫 YOUR TOKEN:');
    console.log(session.access_token);
    console.log('\n📋 Copy the token above!');
  } else {
    console.log('❌ Not logged in');
  }
})();
```

### Step 4: Copy the Token
You'll see output like:
```
🎫 YOUR TOKEN:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU5Mzc3ODUyLCJpYXQiOjE3NTkzNzQyNTIsImlzcyI6Imh0dHBzOi8va2ZmaWFxc2lobGRncWR3YWdvb2suc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjJjM2Q0NzQ3LThkNjctNDVhZi05MGY1LWI1ZTkwNThlYzI0NiIsImVtYWlsIjoiam9zaEB0aGVseWNldW0uaW8iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7fSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc1OTM3NDI1Mn1dLCJzZXNzaW9uX2lkIjoiNGE1YjZjN2QtOGU4Zi00OWZmLTlhMTAtMTI0NTY3ODkwYWJjIn0.signature_here
```

**Copy that long string** (starts with `eyJ...`)

### Step 5: Update Test Script

Open `test-centcom-cluster-apis.js` and update line 49:

```javascript
authToken: 'PASTE_YOUR_TOKEN_HERE',
```

### Step 6: Run Tests Again

```bash
node test-centcom-cluster-apis.js
```

## Expected Results

```
✅ License verification successful
✅ Cluster discovery successful  
  Total Clusters Found: X
✅ Usage sync successful
  Storage %: 0%
  Queries %: 0%
✅ Connection tracking successful (or warning if no clusters)

Success Rate: 100% (or 75% if no clusters exist)
```

---

## Alternative: Even Faster

If you have localStorage access:

```javascript
// In browser console
const auth = localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token');
if (auth) {
  const token = JSON.parse(auth).access_token;
  console.log('TOKEN:', token);
}
```

---

That's it! Get the token and run the tests! 🚀

