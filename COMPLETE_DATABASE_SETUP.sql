-- Lyceum Complete Database Setup
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kffiaqsihldgqdwagook/editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  username TEXT UNIQUE,
  role TEXT DEFAULT 'user',
  company TEXT,
  onboarding_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LICENSE KEYS TABLE  
CREATE TABLE IF NOT EXISTS public.license_keys (
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

-- 3. CLUSTERS TABLE
CREATE TABLE IF NOT EXISTS public.clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_key TEXT UNIQUE NOT NULL,
  cluster_name TEXT NOT NULL,
  classification TEXT DEFAULT 'trial',
  created_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_name TEXT NOT NULL,
  group_key TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. GROUP MEMBERSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.group_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 6. ONBOARDING SESSIONS TABLE
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

-- 7. ONBOARDING PROGRESS TABLE
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

-- 8. TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_key TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  ticket_type TEXT NOT NULL DEFAULT 'support',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  application_section TEXT DEFAULT 'lyceum',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. BILLING INFO TABLE
CREATE TABLE IF NOT EXISTS public.billing_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  plan_name TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'inactive',
  payment_method_last4 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  amount_due INTEGER DEFAULT 0,
  amount_paid INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  invoice_pdf TEXT,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREATE INDEXES FOR BETTER PERFORMANCE
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

CREATE INDEX IF NOT EXISTS license_keys_key_code_idx ON public.license_keys(key_code);
CREATE INDEX IF NOT EXISTS license_keys_user_id_idx ON public.license_keys(user_id);
CREATE INDEX IF NOT EXISTS license_keys_status_idx ON public.license_keys(status);

CREATE INDEX IF NOT EXISTS clusters_cluster_key_idx ON public.clusters(cluster_key);
CREATE INDEX IF NOT EXISTS clusters_created_by_idx ON public.clusters(created_by);

CREATE INDEX IF NOT EXISTS groups_group_key_idx ON public.groups(group_key);
CREATE INDEX IF NOT EXISTS groups_owner_id_idx ON public.groups(owner_id);

CREATE INDEX IF NOT EXISTS group_memberships_group_id_idx ON public.group_memberships(group_id);
CREATE INDEX IF NOT EXISTS group_memberships_user_id_idx ON public.group_memberships(user_id);

CREATE INDEX IF NOT EXISTS onboarding_sessions_user_id_idx ON public.onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS onboarding_sessions_status_idx ON public.onboarding_sessions(status);

CREATE INDEX IF NOT EXISTS onboarding_progress_user_id_idx ON public.onboarding_progress(user_id);

CREATE INDEX IF NOT EXISTS tickets_user_id_idx ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON public.tickets(status);
CREATE INDEX IF NOT EXISTS tickets_ticket_key_idx ON public.tickets(ticket_key);

CREATE INDEX IF NOT EXISTS billing_info_user_id_idx ON public.billing_info(user_id);
CREATE INDEX IF NOT EXISTS billing_info_stripe_customer_id_idx ON public.billing_info(stripe_customer_id);

CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON public.invoices(status);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- License Keys: Users can view their own licenses
CREATE POLICY "Users can view own licenses" ON public.license_keys FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = assigned_to_user_id);

-- Clusters: Users can view clusters they created
CREATE POLICY "Users can view own clusters" ON public.clusters FOR SELECT 
  USING (auth.uid() = created_by);

-- Groups: Users can view groups they own or are members of
CREATE POLICY "Users can view own groups" ON public.groups FOR SELECT 
  USING (
    auth.uid() = owner_id OR 
    EXISTS (SELECT 1 FROM public.group_memberships WHERE group_id = groups.id AND user_id = auth.uid())
  );

-- Group Memberships: Users can view memberships of their groups
CREATE POLICY "Users can view group memberships" ON public.group_memberships FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.groups WHERE id = group_memberships.group_id AND owner_id = auth.uid())
  );

-- Onboarding Sessions: Users can view and update their own sessions
CREATE POLICY "Users can view own onboarding sessions" ON public.onboarding_sessions FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding sessions" ON public.onboarding_sessions FOR UPDATE 
  USING (auth.uid() = user_id);

-- Onboarding Progress: Users can view and update their own progress
CREATE POLICY "Users can view own onboarding progress" ON public.onboarding_progress FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding progress" ON public.onboarding_progress FOR UPDATE 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own onboarding progress" ON public.onboarding_progress FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Tickets: Users can view and create their own tickets
CREATE POLICY "Users can view own tickets" ON public.tickets FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tickets" ON public.tickets FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tickets" ON public.tickets FOR UPDATE 
  USING (auth.uid() = user_id);

-- Billing Info: Users can view their own billing info
CREATE POLICY "Users can view own billing info" ON public.billing_info FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own billing info" ON public.billing_info FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own billing info" ON public.billing_info FOR UPDATE 
  USING (auth.uid() = user_id);

-- Invoices: Users can view their own invoices
CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT 
  USING (auth.uid() = user_id);

-- GRANT PERMISSIONS
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.license_keys TO authenticated;
GRANT ALL ON public.clusters TO authenticated;
GRANT ALL ON public.groups TO authenticated;
GRANT ALL ON public.group_memberships TO authenticated;
GRANT ALL ON public.onboarding_sessions TO authenticated;
GRANT ALL ON public.onboarding_progress TO authenticated;
GRANT ALL ON public.tickets TO authenticated;
GRANT ALL ON public.billing_info TO authenticated;
GRANT ALL ON public.invoices TO authenticated;

-- CREATE FUNCTION TO AUTO-UPDATE updated_at TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ADD TRIGGERS TO AUTO-UPDATE updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_license_keys_updated_at BEFORE UPDATE ON public.license_keys 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clusters_updated_at BEFORE UPDATE ON public.clusters 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_sessions_updated_at BEFORE UPDATE ON public.onboarding_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_progress_updated_at BEFORE UPDATE ON public.onboarding_progress 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_info_updated_at BEFORE UPDATE ON public.billing_info 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SUCCESS MESSAGE
DO $$
BEGIN
  RAISE NOTICE 'Database setup complete! All tables, indexes, RLS policies, and triggers have been created.';
END $$;


