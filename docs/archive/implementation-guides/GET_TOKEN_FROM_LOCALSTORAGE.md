# 🎯 Get JWT Token from LocalStorage (EASIEST METHOD)

Supabase stores the session in `localStorage` - we can grab it directly!

## Steps:

1. **Open `http://localhost:3594` and log in**
2. **Press F12** → Go to **Console** tab
3. **Paste this one-liner:**

```javascript
(() => {
  const key = Object.keys(localStorage).find(k => k.includes('supabase.auth.token'));
  if (key) {
    const session = JSON.parse(localStorage.getItem(key));
    console.log('✅ JWT TOKEN:', session.access_token);
    console.log('✅ User ID:', session.user.id);
    console.log('\n📋 Copy this token and paste it in test-centcom-cluster-apis.js line 49\n');
    return { token: session.access_token, userId: session.user.id };
  } else {
    console.error('❌ No session found. Make sure you are logged in!');
  }
})();
```

4. **Copy the JWT TOKEN** from the output
5. **Copy the User ID** as well
6. **Update `test-centcom-cluster-apis.js`:**
   - Line 49: Replace `authToken` with your JWT token
   - Line 50: Replace `testUserId` with your User ID

7. **Run:** `node test-centcom-cluster-apis.js`

---

## What This Does:
- Finds the Supabase auth token in localStorage
- Extracts the `access_token` (JWT)
- Extracts the `user.id`
- Both are needed for the API tests

## Expected Output:
```
✅ JWT TOKEN: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
✅ User ID: 2c3d4747-8d67-45af-90f5-b5e9058ec246

📋 Copy this token and paste it in test-centcom-cluster-apis.js line 49
```

---

## Why This Works:
- No CSP restrictions (reading from localStorage)
- No need to import external libraries
- Simple and fast
- Works in all browsers

