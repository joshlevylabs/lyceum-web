# 🔧 Fix Schema Mismatch Error

## 🐛 The Problem

You have existing tables in Supabase with a different schema than the setup script expects.

The error: `column "user_id" does not exist` means your existing `license_keys` table has different columns.

---

## ✅ Solution: Check and Fix Existing Schema

### Step 1: Check Your Current Schema

Run this in Supabase SQL Editor:

```sql
-- Check what columns exist in license_keys table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'license_keys'
ORDER BY ordinal_position;
```

**Copy the results here so we can see what you have!**

---

## 🔧 Quick Fix Options

### Option A: Drop and Recreate All Tables (Clean Slate)

**⚠️ WARNING: This will DELETE ALL DATA in these tables!**

Only do this if you're okay losing any test data you have.

```sql
-- Drop all existing tables (in correct order to avoid foreign key issues)
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.billing_info CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.onboarding_progress CASCADE;
DROP TABLE IF EXISTS public.onboarding_sessions CASCADE;
DROP TABLE IF EXISTS public.group_memberships CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.clusters CASCADE;
DROP TABLE IF EXISTS public.license_keys CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Now run the COMPLETE_DATABASE_SETUP.sql again
```

After running this, copy and paste the ENTIRE `COMPLETE_DATABASE_SETUP.sql` file and run it again.

---

### Option B: Fix Just the License Keys Table

If you want to keep other data:

```sql
-- Check if license_keys table exists and what it looks like
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'license_keys' AND table_schema = 'public';

-- Drop just the license_keys table
DROP TABLE IF EXISTS public.license_keys CASCADE;

-- Recreate it with correct schema
CREATE TABLE public.license_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_code TEXT UNIQUE NOT NULL,
  license_type TEXT NOT NULL DEFAULT 'trial',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  features JSONB DEFAULT '{}'::jsonb,
  enabled_plugins TEXT[] DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX license_keys_key_code_idx ON public.license_keys(key_code);
CREATE INDEX license_keys_user_id_idx ON public.license_keys(user_id);
CREATE INDEX license_keys_status_idx ON public.license_keys(status);

-- Enable RLS
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can view own licenses" ON public.license_keys FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = assigned_to_user_id);

-- Grant permissions
GRANT ALL ON public.license_keys TO authenticated;
```

Then try running `COMPLETE_DATABASE_SETUP.sql` again (it will skip the tables that already exist correctly).

---

### Option C: Skip License Keys and Fix Onboarding Tables Only

If you don't need license keys right now, just create the onboarding tables:

```sql
-- Drop existing onboarding tables
DROP TABLE IF EXISTS public.onboarding_progress CASCADE;
DROP TABLE IF EXISTS public.onboarding_sessions CASCADE;

-- Create onboarding sessions
CREATE TABLE public.onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  license_key_id UUID,  -- Remove the foreign key constraint for now
  title TEXT NOT NULL,
  description TEXT,
  plugin_id TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'training',
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  is_mandatory BOOLEAN DEFAULT FALSE,
  meeting_link TEXT,
  session_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create onboarding progress
CREATE TABLE public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL,
  progress_percentage INTEGER DEFAULT 0,
  completed_steps JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, plugin_id)
);

-- Create indexes
CREATE INDEX onboarding_sessions_user_id_idx ON public.onboarding_sessions(user_id);
CREATE INDEX onboarding_sessions_status_idx ON public.onboarding_sessions(status);
CREATE INDEX onboarding_progress_user_id_idx ON public.onboarding_progress(user_id);

-- Enable RLS
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own onboarding sessions" ON public.onboarding_sessions 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding sessions" ON public.onboarding_sessions 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own onboarding progress" ON public.onboarding_progress 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding progress" ON public.onboarding_progress 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own onboarding progress" ON public.onboarding_progress 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.onboarding_sessions TO authenticated;
GRANT ALL ON public.onboarding_progress TO authenticated;

-- Add update triggers
CREATE TRIGGER update_onboarding_sessions_updated_at 
  BEFORE UPDATE ON public.onboarding_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_progress_updated_at 
  BEFORE UPDATE ON public.onboarding_progress 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 🎯 My Recommendation

**Go with Option A** (drop and recreate) if:
- ✅ You're just testing and don't have important data
- ✅ You want a clean, correct schema
- ✅ This is a new deployment

**Go with Option C** (skip license keys) if:
- ✅ You just want to fix the infinite loading ASAP
- ✅ You don't use license keys feature yet
- ✅ You want to keep existing data

---

## 📋 Quick Action

**Do this RIGHT NOW:**

1. **First, check your current schema:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```
   
   Tell me what tables you already have!

2. **Then run Option A (clean slate) or Option C (onboarding only)**

3. **Refresh your website** and the infinite loading should be fixed!

---

Which option do you want to go with? Let me know and I'll guide you through it! 🚀








