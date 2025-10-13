# Debug Onboarding Sessions Loading Issue

Since your tables already exist, let's find out what's actually failing.

## Step 1: Check the Actual Error

### In your browser (on the deployed site):

1. Open **Developer Tools** (F12)
2. Go to the **Network** tab
3. Refresh the page
4. Look for the request to `/api/user/onboarding/sessions`
5. Click on it and check:
   - **Status code** (should be 200, might be 401, 403, or 500)
   - **Response** tab - what error message do you see?
   - **Preview** tab - what data is returned?

**Take a screenshot or copy the response here!**

---

## Step 2: Check Supabase Logs

Go to: https://supabase.com/dashboard/project/kffiaqsihldgqdwagook/logs

Look for errors in:
- **API Logs** (for any query errors)
- **Auth Logs** (if it's an authentication issue)

**Copy any error messages you see!**

---

## Step 3: Check Your Table Structure

Run this in Supabase SQL Editor to see what columns you have:

```sql
-- Check onboarding_sessions table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'onboarding_sessions'
ORDER BY ordinal_position;

-- Check onboarding_progress table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'onboarding_progress'
ORDER BY ordinal_position;
```

**Copy the results here!**

---

## Step 4: Check RLS Policies

Run this to see what RLS policies exist:

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('onboarding_sessions', 'onboarding_progress');

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('onboarding_sessions', 'onboarding_progress');
```

**Copy the results here!**

---

## Common Issues & Quick Fixes

### Issue 1: RLS Blocking Queries (Most Common)

If RLS is enabled but there are no policies allowing SELECT, the query will return empty/fail.

**Quick Fix:**
```sql
-- Allow users to view their own onboarding sessions
CREATE POLICY "Users can view own sessions" 
  ON public.onboarding_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own progress" 
  ON public.onboarding_progress 
  FOR SELECT 
  USING (auth.uid() = user_id);
```

### Issue 2: Missing Columns

The API expects these columns to exist:
- `onboarding_sessions`: id, user_id, license_key_id, title, description, plugin_id, session_type, status, scheduled_at, duration_minutes, is_mandatory, meeting_link, session_notes, created_at, updated_at
- `onboarding_progress`: id, user_id, plugin_id, progress_percentage, completed_steps, created_at, updated_at

### Issue 3: Wrong Service Role Key

Check that your `SUPABASE_SERVICE_ROLE_KEY` in Vercel matches your Supabase project.

---

## Let's Start with Step 1

**Can you check the Network tab and tell me:**
1. What status code does `/api/user/onboarding/sessions` return?
2. What does the response say?

That will tell us exactly what's wrong! 🔍


