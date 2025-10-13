# Fix: Onboarding Sessions Infinite Loading

## The Problem

Your dashboard is stuck loading because it's trying to fetch data from database tables that may not exist yet:
- `onboarding_sessions`
- `onboarding_progress`

## Quick Fix Option 1: Create the Missing Tables

Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/kffiaqsihldgqdwagook/editor):

```sql
-- Create onboarding_sessions table
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  license_key_id UUID REFERENCES public.license_keys(id) ON DELETE SET NULL,
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

-- Create onboarding_progress table
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
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
CREATE INDEX IF NOT EXISTS onboarding_sessions_user_id_idx ON public.onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS onboarding_sessions_status_idx ON public.onboarding_sessions(status);
CREATE INDEX IF NOT EXISTS onboarding_progress_user_id_idx ON public.onboarding_progress(user_id);

-- Enable RLS
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding_sessions
CREATE POLICY "Users can view own onboarding sessions"
  ON public.onboarding_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding sessions"
  ON public.onboarding_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for onboarding_progress
CREATE POLICY "Users can view own onboarding progress"
  ON public.onboarding_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding progress"
  ON public.onboarding_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.onboarding_sessions TO authenticated;
GRANT ALL ON public.onboarding_progress TO authenticated;
```

After running this SQL, refresh your dashboard and the loading should complete!

---

## Quick Fix Option 2: Update Dashboard to Handle Missing Tables

If you don't want to create these tables right now (maybe you don't need the onboarding feature yet), I can update the dashboard to handle missing data gracefully and just show empty state instead of infinite loading.

Let me know which option you prefer!

---

## About the Other 404 Errors

The 404 errors for `/data-visualizer`, `/assets`, and `/sequencer` are **not critical**. These are just navigation links that don't have pages created yet. They won't affect functionality, but if you want, I can:

1. Remove these links from the navigation temporarily
2. Or create placeholder pages for them

These are separate from the onboarding sessions loading issue.

---

## Recommended Action

**Run the SQL above** in your Supabase dashboard to create the tables. This will:
- ✅ Fix the infinite loading on the Onboarding Sessions tab
- ✅ Allow the dashboard to display properly
- ✅ Enable onboarding features for your users

After that, your dashboard should work perfectly! 🎉


