# 🛠️ Final Fix Instructions

## 📊 Issues Found & Fixed

### ✅ Issue 1: Admin User Profiles - Database Column Mismatch

**Error:** `column user_profiles.company does not exist`

**Fixed:** Removed the `company` column from the SQL query in:
- `src/app/api/admin/users/resolve-key/[userKey]/route.ts`

**Auth was working correctly!** The token is being sent properly (`length: 906`).

---

### ⚠️ Issue 2: Onboarding Sessions Timeout

**Error:** `Query timeout after 5 seconds` + `RLS policies might be blocking`

**Cause:** Row Level Security (RLS) policy is either missing or blocking the query

**Fix Required:** Run SQL script in Supabase (see below)

---

## 🚀 Step 1: Deploy Code Fix

```powershell
cd C:\Users\joshual\Documents\Cursor\lyceum

git add .
git commit -m "Fix: Remove non-existent company column from user query"
git push origin main
```

Or:
```powershell
vercel --prod --force
```

**Wait 2-3 minutes for deployment to complete.**

---

## 🗄️ Step 2: Fix Database RLS Policies

### Option A: Quick Fix (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **lyceum** project
3. Click **SQL Editor** (left sidebar)
4. Click **"New query"**
5. Copy and paste this:

```sql
-- Enable RLS and create policy for onboarding_sessions
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their own onboarding sessions" ON onboarding_sessions;

-- Create new policy
CREATE POLICY "Users can view their own onboarding sessions"
ON onboarding_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON onboarding_sessions TO authenticated;
GRANT SELECT ON license_keys TO authenticated;

-- Verify
SELECT 
    tablename, 
    policyname, 
    cmd
FROM pg_policies 
WHERE tablename = 'onboarding_sessions';
```

6. Click **"Run"**
7. You should see a result showing the new policy

### Option B: Use the SQL Script

Run the file `FIX_ONBOARDING_SESSIONS_RLS.sql` that I created in your project root.

---

## ✅ Step 3: Test the Fixes

### Test 1: Admin User Profiles

1. Hard refresh: `Ctrl + Shift + R`
2. Go to: `https://www.thelyceum.io/admin/users/USER-3/profile`
3. **Expected Console Logs:**
   ```
   🔐 Token found in localStorage: true length: 906
   ✅ Access token ready, making API call
   📞 Calling API to resolve user key with auth header...
   📡 API response status: 200  ← Should be 200!
   ✅ API response data: {...}
   ✅ Resolved user ID: [uuid]
   ```

4. **Page should show:**
   - User's profile information
   - All tabs working (Profile, Licenses, Clusters, Sessions, Payment)

### Test 2: Dashboard Onboarding Sessions

1. Go to: `https://www.thelyceum.io/dashboard`
2. **Expected Console Logs:**
   ```
   Fetching onboarding sessions directly from Supabase...
   Querying onboarding_sessions table with 5s timeout...
   Query result: { success: true, count: X, error: null }
   Sessions loaded: X
   Setting loadingSessions to false
   ```

3. **Dashboard should show:**
   - Onboarding sessions (if any exist)
   - No timeout errors
   - Dashboard loads completely

---

## 🔍 If Still Not Working

### Admin Profiles Still Failing?

**Check Vercel logs:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click your **lyceum** project
3. Go to **Functions** tab
4. Look for `/api/admin/users/resolve-key/USER-3`
5. Check for error messages

**Common issues:**
- Other columns might be missing from `user_profiles` table
- Token might have expired (re-login)

### Onboarding Sessions Still Timing Out?

**Check if table exists:**

```sql
-- Run in Supabase SQL Editor
SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'onboarding_sessions'
);
```

**If false:** You need to create the table first

**Check RLS policies:**

```sql
-- Run in Supabase SQL Editor
SELECT * FROM pg_policies 
WHERE tablename = 'onboarding_sessions';
```

**If empty:** The policy wasn't created, run the SQL from Step 2 again

**Check if you have data:**

```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) FROM onboarding_sessions;
```

**If 0:** That's fine! The dashboard will just show "No sessions"

---

## 📋 Summary of Changes

### Files Modified:
1. ✅ `src/app/api/admin/users/resolve-key/[userKey]/route.ts`
   - Removed `company` column from SELECT query

### Database Changes Needed:
1. ⚠️ Run RLS policy SQL script in Supabase
   - Adds SELECT policy for authenticated users
   - Grants necessary permissions

### Expected Results:
1. ✅ Admin user profiles load successfully
2. ✅ Onboarding sessions query completes (may show 0 sessions, that's OK)
3. ✅ No more 500 errors
4. ✅ No more timeout errors (unless Supabase is genuinely slow)

---

## 🎯 Quick Checklist

- [ ] Deploy code changes (git push or vercel --prod)
- [ ] Run RLS SQL script in Supabase SQL Editor
- [ ] Hard refresh browser (`Ctrl + Shift + R`)
- [ ] Test admin user profile (USER-3)
- [ ] Test dashboard onboarding sessions
- [ ] Check console logs for success messages

---

## 🆘 Still Having Issues?

Share:
1. **Console logs** after Step 3 testing
2. **Supabase SQL query results** (from the policy verification queries)
3. **Vercel function logs** for the resolve-key endpoint

This will help identify any remaining issues!

---

**You're very close! Just need to:**
1. Deploy the code fix (removes `company` column)
2. Run the SQL script (fixes RLS policy)
3. Test!

Let me know the results! 🚀

