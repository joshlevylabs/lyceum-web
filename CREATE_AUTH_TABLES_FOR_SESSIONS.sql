-- Create authentication and activity tracking tables for session monitoring
-- Run this script in Supabase SQL Editor to support user session tracking

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enhanced auth_logs table for authentication tracking
CREATE TABLE IF NOT EXISTS public.auth_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'login', 'logout', 'authentication', 'token_refresh'
  app_id TEXT, -- 'centcom', 'lyceum-web', etc.
  client_info JSONB, -- User agent, browser info, etc.
  ip_address TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  session_type TEXT, -- 'web', 'native', 'centcom'
  application_type TEXT, -- 'Web Lyceum', 'CentCom Native', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User activity logs for detailed session tracking
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'login', 'logout', 'session_start', 'session_end', 'page_view', etc.
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB, -- Additional context data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON public.auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON public.auth_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_event_type ON public.auth_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_logs_app_id ON public.auth_logs(app_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON public.user_activity_logs(activity_type);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies

-- Auth logs policies - users can see their own logs, admins can see all
DROP POLICY IF EXISTS "Users can view their own auth logs" ON public.auth_logs;
CREATE POLICY "Users can view their own auth logs" ON public.auth_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all auth logs" ON public.auth_logs;
CREATE POLICY "Admins can view all auth logs" ON public.auth_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'superadmin')
    )
  );

-- Activity logs policies - users can see their own logs, admins can see all  
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.user_activity_logs;
CREATE POLICY "Users can view their own activity logs" ON public.user_activity_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.user_activity_logs;
CREATE POLICY "Admins can view all activity logs" ON public.user_activity_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'superadmin')
    )
  );

-- 6. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.auth_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_activity_logs TO authenticated;
GRANT ALL ON public.auth_logs TO service_role;
GRANT ALL ON public.user_activity_logs TO service_role;

RAISE NOTICE 'Auth and activity tracking tables created successfully!';
RAISE NOTICE 'Tables: auth_logs, user_activity_logs';
RAISE NOTICE 'Indexes and RLS policies have been applied.';





