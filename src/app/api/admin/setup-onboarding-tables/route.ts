import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // SQL to create onboarding tables
    const onboardingTablesSQL = `
    -- Enable necessary extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- 1. Onboarding Session Requirements
    CREATE TABLE IF NOT EXISTS public.onboarding_requirements (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      license_type TEXT NOT NULL CHECK (license_type IN ('trial', 'standard', 'professional', 'enterprise')),
      plugin_id TEXT NOT NULL DEFAULT 'centcom',
      required_sessions INTEGER NOT NULL DEFAULT 3,
      session_duration_minutes INTEGER NOT NULL DEFAULT 30,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(license_type, plugin_id)
    );

    -- 2. User Onboarding Sessions
    CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE,
      license_key_id UUID REFERENCES public.license_keys(id) ON DELETE CASCADE,
      plugin_id TEXT NOT NULL DEFAULT 'centcom',
      
      session_type TEXT NOT NULL DEFAULT 'standard' CHECK (session_type IN ('initial', 'standard', 'plugin_specific', 'followup')),
      session_number INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER DEFAULT 30,
      
      scheduled_at TIMESTAMP WITH TIME ZONE,
      assigned_admin_id UUID REFERENCES public.user_profiles(id),
      
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
      completion_status TEXT CHECK (completion_status IN ('passed', 'failed', 'needs_followup')),
      
      started_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      notes TEXT,
      user_feedback TEXT,
      
      reminder_sent_at TIMESTAMP WITH TIME ZONE,
      reminder_count INTEGER DEFAULT 0,
      
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 3. User Onboarding Progress
    CREATE TABLE IF NOT EXISTS public.onboarding_progress (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE,
      license_key_id UUID REFERENCES public.license_keys(id) ON DELETE CASCADE,
      
      total_sessions_required INTEGER NOT NULL DEFAULT 3,
      plugin_sessions_required JSONB DEFAULT '{}',
      
      sessions_completed INTEGER DEFAULT 0,
      plugin_sessions_completed JSONB DEFAULT '{}',
      
      overall_status TEXT NOT NULL DEFAULT 'pending' CHECK (overall_status IN ('pending', 'in_progress', 'completed', 'overdue', 'suspended')),
      onboarding_deadline TIMESTAMP WITH TIME ZONE,
      
      license_active_status BOOLEAN DEFAULT true,
      license_suspended_at TIMESTAMP WITH TIME ZONE,
      license_suspension_reason TEXT,
      
      started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      last_session_at TIMESTAMP WITH TIME ZONE,
      next_session_due TIMESTAMP WITH TIME ZONE,
      
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      UNIQUE(user_id, license_id),
      UNIQUE(user_id, license_key_id)
    );

    -- 4. Onboarding Reminders
    CREATE TABLE IF NOT EXISTS public.onboarding_reminders (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      session_id UUID REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
      progress_id UUID REFERENCES public.onboarding_progress(id) ON DELETE CASCADE,
      
      reminder_type TEXT NOT NULL CHECK (reminder_type IN ('session_scheduled', 'session_due', 'session_overdue', 'license_at_risk', 'license_suspended')),
      reminder_method TEXT NOT NULL DEFAULT 'email' CHECK (reminder_method IN ('email', 'sms', 'in_app', 'webhook')),
      
      scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
      sent_at TIMESTAMP WITH TIME ZONE,
      
      subject TEXT,
      message TEXT,
      
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')),
      
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user_id ON public.onboarding_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status ON public.onboarding_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_scheduled_at ON public.onboarding_sessions(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_assigned_admin ON public.onboarding_sessions(assigned_admin_id);

    CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON public.onboarding_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_onboarding_progress_status ON public.onboarding_progress(overall_status);
    CREATE INDEX IF NOT EXISTS idx_onboarding_progress_deadline ON public.onboarding_progress(onboarding_deadline);

    CREATE INDEX IF NOT EXISTS idx_onboarding_reminders_scheduled ON public.onboarding_reminders(scheduled_for);
    CREATE INDEX IF NOT EXISTS idx_onboarding_reminders_status ON public.onboarding_reminders(status);

    -- Insert default onboarding requirements
    INSERT INTO public.onboarding_requirements (license_type, plugin_id, required_sessions, session_duration_minutes, description) VALUES
      ('trial', 'centcom', 3, 30, 'Base onboarding sessions required for Centcom trial license'),
      ('trial', 'analytics', 1, 30, 'Additional session required for Analytics plugin'),
      ('trial', 'reporting', 1, 30, 'Additional session required for Reporting plugin'),
      ('trial', 'dashboard', 1, 30, 'Additional session required for Dashboard plugin'),
      ('trial', 'integrations', 1, 30, 'Additional session required for Integrations plugin')
    ON CONFLICT (license_type, plugin_id) DO NOTHING;

    -- Enable Row Level Security
    ALTER TABLE public.onboarding_requirements ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.onboarding_reminders ENABLE ROW LEVEL SECURITY;

    -- RLS Policies

    -- Onboarding Requirements (readable by all authenticated users, manageable by admins)
    DROP POLICY IF EXISTS "Everyone can view onboarding requirements" ON public.onboarding_requirements;
    CREATE POLICY "Everyone can view onboarding requirements" ON public.onboarding_requirements
      FOR SELECT USING (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Admin users can manage onboarding requirements" ON public.onboarding_requirements;
    CREATE POLICY "Admin users can manage onboarding requirements" ON public.onboarding_requirements
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up 
          WHERE up.id = auth.uid() 
          AND up.role IN ('admin', 'superadmin')
        )
      );

    -- Onboarding Sessions (users can view their own, admins can manage all)
    DROP POLICY IF EXISTS "Users can view their own onboarding sessions" ON public.onboarding_sessions;
    CREATE POLICY "Users can view their own onboarding sessions" ON public.onboarding_sessions
      FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = assigned_admin_id OR
        EXISTS (
          SELECT 1 FROM public.user_profiles up 
          WHERE up.id = auth.uid() 
          AND up.role IN ('admin', 'superadmin')
        )
      );

    DROP POLICY IF EXISTS "Admin users can manage onboarding sessions" ON public.onboarding_sessions;
    CREATE POLICY "Admin users can manage onboarding sessions" ON public.onboarding_sessions
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up 
          WHERE up.id = auth.uid() 
          AND up.role IN ('admin', 'superadmin')
        )
      );

    -- Onboarding Progress (users can view their own, admins can manage all)
    DROP POLICY IF EXISTS "Users can view their own onboarding progress" ON public.onboarding_progress;
    CREATE POLICY "Users can view their own onboarding progress" ON public.onboarding_progress
      FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
          SELECT 1 FROM public.user_profiles up 
          WHERE up.id = auth.uid() 
          AND up.role IN ('admin', 'superadmin')
        )
      );

    DROP POLICY IF EXISTS "Admin users can manage onboarding progress" ON public.onboarding_progress;
    CREATE POLICY "Admin users can manage onboarding progress" ON public.onboarding_progress
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up 
          WHERE up.id = auth.uid() 
          AND up.role IN ('admin', 'superadmin')
        )
      );

    -- Onboarding Reminders (users can view their own, admins can manage all)  
    DROP POLICY IF EXISTS "Users can view their own onboarding reminders" ON public.onboarding_reminders;
    CREATE POLICY "Users can view their own onboarding reminders" ON public.onboarding_reminders
      FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
          SELECT 1 FROM public.user_profiles up 
          WHERE up.id = auth.uid() 
          AND up.role IN ('admin', 'superadmin')
        )
      );

    DROP POLICY IF EXISTS "Admin users can manage onboarding reminders" ON public.onboarding_reminders;
    CREATE POLICY "Admin users can manage onboarding reminders" ON public.onboarding_reminders
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up 
          WHERE up.id = auth.uid() 
          AND up.role IN ('admin', 'superadmin')
        )
      );
    `
    
    // Execute the SQL using RPC since Supabase client doesn't support direct SQL execution
    const { data, error } = await supabase.rpc('exec', { query: onboardingTablesSQL })
    
    if (error) {
      console.error('Error creating onboarding tables:', error)
      // If RPC doesn't work, try creating tables individually
      try {
        // Create onboarding_requirements table
        await supabase.from('onboarding_requirements').select('id').limit(1)
      } catch (tableError) {
        console.log('Tables do not exist, they need to be created manually via SQL editor')
        return NextResponse.json({ 
          success: false,
          error: 'Database tables need to be created manually',
          message: 'Please run the SQL script in your Supabase SQL editor',
          sql_script: onboardingTablesSQL
        })
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Onboarding tables setup completed successfully',
      tables_created: [
        'onboarding_requirements',
        'onboarding_sessions', 
        'onboarding_progress',
        'onboarding_reminders'
      ]
    })

  } catch (error) {
    console.error('Error in onboarding tables setup:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
