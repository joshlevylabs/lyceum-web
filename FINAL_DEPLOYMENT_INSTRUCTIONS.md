# 🚀 Final Deployment Instructions

## ✅ Issues Fixed

### 1. Admin User Profile - Column Mismatch
**Fixed:** Removed non-existent `company` column from:
- ✅ `src/app/api/admin/users/resolve-key/[userKey]/route.ts`
- ✅ `src/app/api/user-profiles/enhanced/route.ts`

### 2. Onboarding Sessions - RLS Configured
**Fixed:** Cleaned up duplicate RLS policies in Supabase

---

## 📋 Step 1: Re-enable RLS (In Supabase)

Run this in Supabase SQL Editor:

```sql
-- Re-enable RLS for onboarding_sessions
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- Verify it's enabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'onboarding_sessions';

-- Should return: rowsecurity = true
```

---

## 📦 Step 2: Deploy Code Changes

```powershell
cd C:\Users\joshual\Documents\Cursor\lyceum

git add .
git commit -m "Fix: Remove company column references from user profile queries"
git push origin main
```

**Wait 2-3 minutes** for Vercel to build and deploy.

---

## 🧪 Step 3: Test Everything

### Test 1: Admin User Profile

1. **Hard refresh:** `Ctrl + Shift + R`
2. Navigate to: `https://www.thelyceum.io/admin/users/USER-3/profile`
3. **Expected:**
   - ✅ Page loads completely
   - ✅ Profile information displays
   - ✅ All tabs work (Profile, Licenses, Clusters, Sessions, Payment)
   - ✅ No 404 errors

**Console should show:**
```
✅ Resolved user ID: 2c3d4747-8d67-45af-90f5-b5e9058ec246
Fetching enhanced profile...
Enhanced profile response status: 200
```

### Test 2: Dashboard

1. Navigate to: `https://www.thelyceum.io/dashboard`
2. **Expected:**
   - ✅ Dashboard loads
   - ✅ No timeout errors for onboarding sessions
   - ✅ Shows "No sessions" or displays any existing sessions

**Console should show:**
```
Querying onboarding_sessions table with 5s timeout...
Query result: { success: true, count: 0 }
Sessions loaded: 0
```

*(Count will be 0 since your table is empty, which is fine)*

---

## 📊 Summary of All Fixes

### Database Issues Fixed:
1. ✅ Removed `company` column from SELECT queries (column doesn't exist)
2. ✅ Configured RLS policies for `onboarding_sessions`
3. ✅ Cleaned up duplicate/conflicting RLS policies

### Code Issues Fixed:
1. ✅ Added authentication headers to admin API calls
2. ✅ Added timeouts to prevent hanging queries
3. ✅ Fixed localStorage token reading for faster auth
4. ✅ Removed non-existent column references

---

## 🎯 Current State

### User Profiles (`user_profiles` table)
- USER-1: `josh@joshlevylabs.com`
- USER-2: `farbisimo@gmail.com`
- USER-3: `josh@thelyceum.io` (you) ✅
- USER-4: `test@example.com`
- USER-5: `joshual@sonance.com`

### Onboarding Sessions (`onboarding_sessions` table)
- 0 rows (empty table)
- RLS enabled
- Policy: "Users can view their own onboarding sessions"

---

## ✅ Expected Results After Deployment

1. **Admin user profiles work**
   - No 404 errors
   - Full profile data loads
   - All tabs functional

2. **Dashboard loads**
   - No query timeouts
   - Shows "No onboarding sessions" (since table is empty)
   - All other dashboard components work

3. **No more errors**
   - No 401 (auth fixed)
   - No 404 (user found, company column removed)
   - No 500 (database queries fixed)
   - No timeouts (timeout handlers added)

---

## 🆘 If Still Having Issues

Share:
1. **Browser console logs** after testing
2. **Vercel function logs** (if any errors)
3. **Which specific feature is broken**

---

**Deploy now and everything should work!** 🚀

