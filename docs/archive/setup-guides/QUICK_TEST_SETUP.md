# Quick Test Setup - Get License Key & Token

## Option 1: Use Existing License Key (FASTEST - 30 seconds)

### Step 1: Get an Existing License Key

Run this in **Supabase SQL Editor**:

```sql
SELECT key_code FROM license_keys WHERE status = 'active' LIMIT 1;
```

Copy the `key_code` value. Done! ✅

---

## Option 2: Create a New Test License (2 minutes)

### Step 1: Find Your User ID

Run in **Supabase SQL Editor**:

```sql
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 3;
```

Copy one of the `id` values (the UUID).

### Step 2: Create Test License

Run in **Supabase SQL Editor** (replace `YOUR_USER_ID_HERE`):

```sql
INSERT INTO license_keys (
  key_code,
  license_type,
  status,
  assigned_to,
  expires_at,
  allows_local_cluster,
  local_cluster_limits
) VALUES (
  'TEST-' || SUBSTRING(md5(random()::text) FROM 1 FOR 8),
  'professional',
  'active',
  'YOUR_USER_ID_HERE',  -- ⚠️ Replace with UUID from Step 1
  NOW() + INTERVAL '1 year',
  TRUE,
  '{"max_storage_gb": 50, "max_monthly_queries": 1000000}'::jsonb
)
RETURNING key_code;
```

Copy the returned `key_code`. Done! ✅

---

## Get JWT Token (1 minute)

### Step 1: Log in to Lyceum

Open: `http://localhost:3594` and log in

### Step 2: Get Token from Browser

Press `F12` → Console tab → Run:

```javascript
(async()=>{const{createClient}=await import('https://esm.sh/@supabase/supabase-js@2');const s=createClient('https://kffiaqsihldgqdwagook.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTU0MTYsImV4cCI6MjA2ODQ3MTQxNn0.5Wzzoat1TsoLLbsqjuoUEKyawJgYmvrMYbJ-uvosdu0');const{data:{session}}=await s.auth.getSession();console.log('TOKEN:',session?.access_token);})();
```

Copy the token that appears. Done! ✅

---

## Update Test Script (30 seconds)

Open `test-centcom-cluster-apis.js` and update lines 15-17:

```javascript
const TEST_CONFIG = {
  licenseKey: 'YOUR_KEY_CODE_HERE',  // Paste from above
  authToken: 'YOUR_TOKEN_HERE',      // Paste from above
  machineFingerprint: 'test-machine-' + Date.now()
}
```

Save and run:

```bash
node test-centcom-cluster-apis.js
```

---

## Expected Results

```
✅ License verification successful
  License Type: professional
  Storage Limit: 50 GB
  Query Limit: 1000000

✅ Cluster discovery successful
  Total Clusters Found: X

✅ Usage sync successful
  Storage %: X%
  Queries %: X%

✅ Connection tracking successful (or warning if no clusters)
```

---

## Troubleshooting

**"Invalid or inactive license"**
- Make sure you copied the full `key_code` value
- Check license status is 'active' in database

**"Unauthorized" (401 error)**
- Token may have expired (they last 1 hour)
- Just get a new token from browser

**No clusters found**
- This is expected if you haven't created any test clusters yet
- The API is still working correctly!

---

That's it! Total time: ~3 minutes 🚀

