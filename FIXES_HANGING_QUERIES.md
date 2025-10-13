# Fixes for Hanging Queries and Auth Issues

## 🐛 Problems Identified

### 1. Admin User Profile Page (401 Error)
**Symptom:** API call to `/api/admin/users/resolve-key/USER-3` returns 401 Unauthorized

**Root Cause:** `supabase.auth.getSession()` was **hanging** in the browser when called from the profile page component. The code would log "🔐 Getting Supabase session..." but never complete.

**Why it hung:** 
- `getSession()` can hang in certain React contexts due to async/await timing issues
- The Supabase client might be trying to refresh tokens and waiting indefinitely
- Browser event loop blocking when multiple auth calls happen simultaneously

### 2. Dashboard Onboarding Sessions Not Loading
**Symptom:** Logs show "Querying onboarding_sessions table..." but no results appear

**Root Cause:** Supabase query to `onboarding_sessions` table was **hanging indefinitely**

**Why it hung:**
- Possible RLS (Row Level Security) policy blocking the query
- Network timeout not set
- Supabase query waiting for auth context that never resolves

---

## ✅ Solutions Implemented

### Fix 1: Admin User Profile Authentication

**File:** `src/app/admin/users/[userId]/profile/page.tsx`

**Changes:**
1. **Primary approach:** Read auth token directly from `localStorage` (synchronous, reliable)
   - Key: `sb-kffiaqsihldgqdwagook-auth-token`
   - Extract `access_token` from stored JSON
   
2. **Fallback approach:** Call `getSession()` with a **3-second timeout**
   - Uses `Promise.race()` to prevent hanging
   - If it times out, throws clear error
   
3. **Better error handling:**
   - Clear logging at each step
   - User-friendly error messages
   - Graceful degradation

**Code flow:**
```
1. Try localStorage → If found ✅ use it
2. If not found → Try getSession() with 3s timeout
3. If timeout → Show clear error
4. If token found → Make API call with Bearer token
```

### Fix 2: Dashboard Onboarding Sessions

**File:** `src/app/dashboard/page.tsx`

**Changes:**
1. Added **5-second timeout** to Supabase query using `Promise.race()`
2. If query times out:
   - Logs warning about potential RLS or performance issues
   - Shows empty sessions list (graceful failure)
   - Doesn't block the rest of the dashboard from loading

**Code flow:**
```
1. Start query
2. Race against 5s timeout
3. If completes → Show sessions
4. If times out → Show empty + log warning
```

---

## 🚀 Deploy These Fixes

```powershell
cd C:\Users\joshual\Documents\Cursor\lyceum

# Commit changes
git add .
git commit -m "Fix: Resolve hanging getSession() and Supabase queries with timeouts"
git push origin main

# Or deploy directly
vercel --prod --force
```

---

## 🧪 Testing After Deployment

### Test 1: Admin User Profiles

1. **Hard refresh:** `Ctrl + Shift + R` (clear cache)
2. Navigate to: `https://www.thelyceum.io/admin/users/USER-3/profile`
3. **Expected logs in console:**
   ```
   🔑 Detected user key format, resolving via API call: USER-3
   🔐 Getting auth token from localStorage...
   🔐 Token found in localStorage: true length: 208
   ✅ Access token ready, making API call
   📞 Calling API to resolve user key with auth header...
   📡 API response status: 200  ← Should be 200 now!
   ✅ API response data: {...}
   ✅ Resolved user ID: [uuid]
   ```

4. **If it still fails:**
   - Check if log shows "🔐 No auth data in localStorage"
   - Check if log shows "🔐 Falling back to getSession()..."
   - Check if "getSession timeout" error appears

### Test 2: Dashboard Onboarding Sessions

1. Navigate to: `https://www.thelyceum.io/dashboard`
2. **Expected logs in console:**
   ```
   Fetching onboarding sessions directly from Supabase...
   Querying onboarding_sessions table with 5s timeout...
   Query result: { success: true, count: X, error: null }
   Sessions loaded: X
   Setting loadingSessions to false
   ```

3. **If query times out:**
   ```
   Error fetching onboarding sessions: Query timeout after 5 seconds
   ⚠️ Query timed out - Supabase might be slow or RLS policies might be blocking
   ```
   - This indicates an RLS policy issue or Supabase performance problem
   - The dashboard will still load, just without sessions

---

## 🔍 Troubleshooting

### If Admin Profiles Still Don't Work

**Check localStorage:**
1. Open DevTools (F12)
2. Go to: **Application** tab → **Local Storage**
3. Find: `sb-kffiaqsihldgqdwagook-auth-token`
4. Check if `access_token` exists in the value
5. If missing → **Re-login** to your account

**Check backend logs:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on **Functions** tab
3. Filter for: `/api/admin/users/resolve-key`
4. Should see:
   ```
   🔑 Authorization header present: true
   🔑 Authorization header preview: Bearer eyJ...
   🔐 authenticateRequest - authHeader: Bearer eyJ...
   🔐 Validating token: ... length: 208
   ```

### If Onboarding Sessions Still Don't Load

**Likely causes:**
1. **RLS Policy Blocking Query**
   - Check Supabase Dashboard → Authentication → Policies
   - Ensure `onboarding_sessions` table has SELECT policy for authenticated users
   
2. **Table Doesn't Exist**
   - Check Supabase Dashboard → Table Editor
   - Verify `onboarding_sessions` table exists
   
3. **Network Issue**
   - Check browser Network tab for failed requests
   - Look for CORS errors

**Fix RLS Policy:**
```sql
-- Run in Supabase SQL Editor
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
ON onboarding_sessions
FOR SELECT
USING (auth.uid() = user_id);
```

---

## 📊 What Changed vs. Original

### Before:
- ❌ `getSession()` called directly → **hung indefinitely**
- ❌ No timeout on Supabase queries → **queries could hang forever**
- ❌ No fallback when auth fails → **page stuck loading**

### After:
- ✅ Try localStorage first → **instant, synchronous**
- ✅ `getSession()` has 3s timeout → **fails fast**
- ✅ Supabase queries have 5s timeout → **graceful degradation**
- ✅ Clear error messages → **users know what's wrong**
- ✅ Extensive logging → **easy to debug**

---

## 🎯 Success Criteria

**Admin Profiles Working:**
- ✅ No 401 errors
- ✅ User profile loads within 2 seconds
- ✅ All tabs (Profile, Licenses, Clusters, Sessions) show data

**Dashboard Working:**
- ✅ Onboarding sessions appear (if any exist)
- ✅ No infinite loading spinners
- ✅ Dashboard loads even if sessions query fails

---

## 📝 Files Modified

1. `src/app/admin/users/[userId]/profile/page.tsx`
   - Added localStorage token reading
   - Added timeout to getSession()
   - Improved error handling and logging

2. `src/app/dashboard/page.tsx`
   - Added 5s timeout to onboarding sessions query
   - Added timeout warning logs
   - Graceful failure handling

3. `src/app/api/admin/users/resolve-key/[userKey]/route.ts`
   - Added debug logging for authorization header

4. `src/lib/auth-utils.ts`
   - Added debug logging for token validation

---

**Deploy now and the issues should be resolved!** 🚀

