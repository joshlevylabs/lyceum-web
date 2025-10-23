# Manual Testing Guide - Lyceum Backend Fix Verification

**Date:** 2025-10-20
**Purpose:** Verify JWT authentication fix is working

---

## What We're Testing

**Before Fix:** Centcom API calls returned 401 "Invalid token issuer"
**After Fix:** Centcom API calls should return 200 with data

---

## Prerequisites

You need:
- Valid user credentials (email + password)
- curl or Postman
- Or just use the Centcom desktop app

---

## Option 1: Automated Test Script (Recommended)

```bash
# Set your credentials
export TEST_EMAIL="admin@lyceum-analytics.com"
export TEST_PASSWORD="your-password-here"

# Run the test script
bash test-backend-fix.sh
```

The script will test:
1. Health endpoint
2. Authentication (get token)
3. Cluster discovery (THE FIX)
4. Usage sync

---

## Option 2: Manual Testing with curl

### Step 1: Test Authentication

```bash
curl -X POST https://lyceum-sable.vercel.app/api/centcom/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "YOUR_EMAIL_HERE",
    "password": "YOUR_PASSWORD_HERE",
    "client_info": {
      "version": "1.0.0",
      "platform": "Windows"
    }
  }' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "...",
    "roles": ["admin"]
  },
  "session": {
    "access_token": "eyJhbGc...",
    "expires_at": "2025-10-21T...",
    "permissions": ["*:*"]
  }
}
```

**Save the access_token** from the response!

### Step 2: Test Cluster Discovery (The Fix!)

```bash
# Replace <TOKEN> with the access_token from Step 1
curl -X GET https://lyceum-sable.vercel.app/api/centcom/clusters/discover \
  -H "Authorization: Bearer <TOKEN>" \
  -v
```

**Expected:**
- HTTP Status: `200 OK` (NOT 401!)
- Response with clusters array

**Before Fix:**
```
< HTTP/2 401
{"error": "Invalid token issuer"}
```

**After Fix:**
```
< HTTP/2 200
{
  "success": true,
  "clusters": [...],
  "total": 1
}
```

### Step 3: Test Usage Sync

```bash
# Replace <TOKEN> with your access_token
curl -X POST https://lyceum-sable.vercel.app/api/centcom/usage/sync \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "machine_fingerprint": "test-123",
    "storage_used_gb": 1,
    "queries_this_month": 100
  }' | jq '.'
```

**Expected:**
- HTTP Status: `200 OK`
- Response with usage statistics

---

## Option 3: Test with Centcom Desktop App

**Easiest method!**

1. Open Centcom desktop application
2. Go to Settings
3. Navigate to **Database Connections**
4. Check if you see:
   - ✅ Clusters listed (not "Error")
   - ✅ No "Invalid token issuer" errors in console
   - ✅ Cluster discovery working

**Before Fix:**
```
GET /api/centcom/clusters/discover → 401
Error: Invalid token issuer
```

**After Fix:**
```
GET /api/centcom/clusters/discover → 200
Clusters displayed successfully
```

---

## What to Look For

### ✅ Success Indicators

1. **Authentication works**
   - POST /api/centcom/auth/login returns 200
   - You receive an access_token

2. **Cluster discovery works** (THE KEY TEST)
   - GET /api/centcom/clusters/discover returns 200
   - NO MORE 401 errors
   - Clusters are returned

3. **Usage sync works**
   - POST /api/centcom/usage/sync returns 200
   - Usage statistics returned

### ❌ Failure Indicators

1. **Still getting 401 "Invalid token issuer"**
   - Fix may not be deployed yet
   - Check Vercel deployment status

2. **Other errors (500, 503)**
   - May be database issues (unrelated to fix)
   - Authentication itself is working

---

## Troubleshooting

### "I don't have credentials"

**Options:**
1. Use existing user account from Supabase
2. Create new test user in Supabase dashboard
3. Ask team for test credentials

**Check Supabase for existing users:**
```sql
SELECT email, role FROM user_profiles WHERE is_active = true;
```

### "Getting 503 errors"

This is likely a database connection issue, not related to the JWT fix. The JWT validation is working if you're NOT getting 401 "Invalid token issuer".

### "Vercel deployment not updating"

Check deployment status:
1. Go to https://vercel.com/[your-team]/lyceum
2. Check latest deployment
3. Verify commit `9ddf382` is deployed

---

## Quick Test Results Template

Copy this and fill in your results:

```
Lyceum Backend Fix Verification
Date: 2025-10-20
Tester: [Your Name]

[  ] Step 1: Authentication
     Email used: _______________
     Status code: ___
     Received token: YES / NO

[  ] Step 2: Cluster Discovery
     Status code: ___
     Expected: 200
     Result: PASS / FAIL
     Error message (if any): _______________

[  ] Step 3: Usage Sync
     Status code: ___
     Expected: 200
     Result: PASS / FAIL

Overall: PASS / FAIL

Notes:
_______________________________________________
```

---

## Need Help?

If tests fail or you see unexpected results:

1. Check the response error messages
2. Verify your credentials are correct
3. Check Vercel deployment logs
4. Report results with:
   - HTTP status codes
   - Error messages
   - Test credentials used (email only, not password)

---

**Ready to test! Pick Option 1, 2, or 3 above.**
