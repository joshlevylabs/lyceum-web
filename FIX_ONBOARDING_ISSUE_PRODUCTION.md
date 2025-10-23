# 🔧 Fix Onboarding Sessions Infinite Loading (Production)

## 🐛 The Problem

Your dashboard is stuck in an infinite loop trying to fetch onboarding sessions. The query never completes because:
1. The `onboarding_sessions` table might not exist
2. RLS policies might be blocking the query
3. The join with `license_keys` table might be failing

## 🔍 Step 1: Check if Tables Exist

### Go to Supabase SQL Editor:
**https://supabase.com/dashboard → Your Project → SQL Editor**

### Run this query:
```sql
-- Check if onboarding_sessions table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'onboarding_sessions'
) as onboarding_sessions_exists,
EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'license_keys'
) as license_keys_exists,
EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'user_profiles'
) as user_profiles_exists;
```

**Copy the results here!**

---

## 🔧 Solution A: If Tables Don't Exist

### Run the Complete Database Setup

If the query above shows `false` for any tables, you need to set up your database.

#### Option 1: Run COMPLETE_DATABASE_SETUP.sql

1. Find the file `COMPLETE_DATABASE_SETUP.sql` in your project
2. Open Supabase SQL Editor
3. Copy the entire file contents
4. Paste into SQL Editor
5. Click **Run**
6. Wait for completion (may take 10-20 seconds)

#### Option 2: Run Basic Schema from README

If you don't have COMPLETE_DATABASE_SETUP.sql, run this minimal schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table (if not exists)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  company TEXT,
  role TEXT NOT NULL DEFAULT 'analyst' CHECK (role IN ('admin', 'engineer', 'analyst', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sign_in TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- License keys table (required for onboarding sessions)
CREATE TABLE IF NOT EXISTS license_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key_code TEXT UNIQUE NOT NULL,
  license_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  features JSONB DEFAULT '{}',
  enabled_plugins TEXT[] DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding sessions table
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  license_key_id UUID REFERENCES license_keys(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  plugin_id TEXT,
  session_type TEXT DEFAULT 'onboarding',
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 60,
  is_mandatory BOOLEAN DEFAULT false,
  meeting_link TEXT,
  session_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding progress table
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  plugin_id TEXT NOT NULL,
  progress_percentage INTEGER DEFAULT 0,
  completed_steps JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, plugin_id)
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for license_keys
DROP POLICY IF EXISTS "Users can view all license keys" ON license_keys;
CREATE POLICY "Users can view all license keys" ON license_keys
  FOR SELECT USING (true);

-- RLS Policies for onboarding_sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON onboarding_sessions;
CREATE POLICY "Users can view own sessions" ON onboarding_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON onboarding_sessions;
CREATE POLICY "Users can insert own sessions" ON onboarding_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON onboarding_sessions;
CREATE POLICY "Users can update own sessions" ON onboarding_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for onboarding_progress
DROP POLICY IF EXISTS "Users can view own progress" ON onboarding_progress;
CREATE POLICY "Users can view own progress" ON onboarding_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON onboarding_progress;
CREATE POLICY "Users can insert own progress" ON onboarding_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON onboarding_progress;
CREATE POLICY "Users can update own progress" ON onboarding_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user_id ON onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status ON onboarding_sessions(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
```

---

## 🔧 Solution B: If Tables Exist But Query Hangs

### Check RLS Policies

Run this to see existing policies:

```sql
-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('onboarding_sessions', 'onboarding_progress', 'license_keys')
ORDER BY tablename, policyname;
```

If no policies exist for SELECT, add them:

```sql
-- Allow users to view their own onboarding sessions
CREATE POLICY "Users can view own sessions" 
  ON public.onboarding_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow users to view license keys
CREATE POLICY "Users can view license keys" 
  ON public.license_keys 
  FOR SELECT 
  USING (true);  -- Or more restrictive if needed
```

---

## 🔧 Solution C: Emergency Fix - Disable the Query

If you need the site to work RIGHT NOW while debugging:

### Temporarily comment out the onboarding fetch

Edit `src/app/dashboard/page.tsx` around line 191-242 and add a return statement:

```typescript
const fetchOnboardingSessions = async () => {
  if (!user) {
    console.log('No user, skipping fetch')
    return
  }

  // TEMPORARY FIX: Skip onboarding sessions query
  console.log('Skipping onboarding sessions fetch (temporarily disabled)')
  setOnboardingSessions([])
  setLoadingSessions(false)
  return
  
  // ... rest of the function
}
```

This will make the dashboard load, but the onboarding sessions tab will be empty.

---

## ✅ After Running SQL

1. **Refresh your browser** at https://www.thelyceum.io
2. **Hard refresh** if needed: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
3. **Check console logs** - you should see "Query result: { success: true, count: 0 }"
4. The onboarding sessions tab should load (showing empty state)

---

## 🎯 Quick Action Plan

**Do this NOW:**

1. **Go to Supabase SQL Editor**
2. **Run the "Check if Tables Exist" query** from Step 1 above
3. **Copy the results** and tell me what you see
4. I'll tell you which solution to use

---

## 🐛 Still Not Working?

If the issue persists after running the SQL:

### Check Network Tab

1. Open **Developer Tools** (F12)
2. Go to **Network** tab
3. Refresh the page
4. Look for requests that are pending/hanging
5. Take a screenshot and share it

### Check Supabase Logs

Go to: **Supabase Dashboard → Logs → API Logs**

Look for any error messages when you load the dashboard.

---

**Let's start with checking if the tables exist - run that first query and tell me the results!** 🔍






