import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const steps = []

    // Since RPC doesn't work, let's try creating tables using INSERT operations
    // This is a workaround approach

    // Step 1: Try to create a simple test record to see if we can create the table structure
    try {
      // This will fail but might give us information
      const { error: testError } = await supabase
        .from('license_keys')
        .select('*')
        .limit(1)
      
      if (testError && testError.message.includes('does not exist')) {
        steps.push({
          step: 'Check license_keys table',
          success: false,
          error: 'Table does not exist - needs manual creation',
          recommendation: 'Create table manually in Supabase dashboard'
        })
      } else {
        steps.push({
          step: 'Check license_keys table',
          success: true,
          message: 'Table already exists'
        })
      }
    } catch (error) {
      steps.push({
        step: 'Check license_keys table',
        success: false,
        error: 'Unable to check table existence'
      })
    }

    // Step 2: Check admin_users table
    try {
      const { error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .limit(1)
      
      if (adminError && adminError.message.includes('does not exist')) {
        steps.push({
          step: 'Check admin_users table',
          success: false,
          error: 'Table does not exist - needs manual creation'
        })
      } else {
        steps.push({
          step: 'Check admin_users table',
          success: true,
          message: 'Table already exists'
        })
      }
    } catch (error) {
      steps.push({
        step: 'Check admin_users table',
        success: false,
        error: 'Unable to check table existence'
      })
    }

    // Generate SQL commands that can be copy-pasted into Supabase dashboard
    const sqlCommands = {
      license_keys: `
-- Create license_keys table
CREATE TABLE IF NOT EXISTS public.license_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_code TEXT NOT NULL UNIQUE,
  license_type TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  max_users INTEGER DEFAULT 10,
  max_projects INTEGER DEFAULT 50,
  max_storage_gb INTEGER DEFAULT 25,
  features JSONB DEFAULT '[]'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID,
  assigned_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Enhanced licensing fields
  time_limit_type TEXT DEFAULT 'unlimited' CHECK (time_limit_type IN ('trial_30', 'trial_custom', 'unlimited')),
  custom_trial_days INTEGER,
  trial_extension_reason TEXT,
  enabled_plugins JSONB DEFAULT '[]'::jsonb,
  plugin_permissions JSONB DEFAULT '{}'::jsonb,
  allowed_user_types JSONB DEFAULT '["engineer", "operator"]'::jsonb,
  access_level TEXT DEFAULT 'standard' CHECK (access_level IN ('basic', 'standard', 'advanced', 'full')),
  restrictions JSONB DEFAULT '{}'::jsonb,
  license_config JSONB DEFAULT '{}'::jsonb,
  usage_stats JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "License keys are viewable by authenticated users" ON public.license_keys
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage all license keys" ON public.license_keys
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
      `.trim(),

      admin_users: `
-- Create admin_users table  
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator')),
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Service role can manage admin users" ON public.admin_users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Insert super admin user
INSERT INTO public.admin_users (id, user_id, role, permissions, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  NULL,
  'super_admin',
  '{"manage_licenses": true, "manage_users": true, "manage_system": true}'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;
      `.trim()
    }

    return NextResponse.json({
      success: false,
      message: 'Cannot create tables automatically - manual creation required',
      steps,
      solution: {
        method: 'manual_creation',
        instructions: [
          '1. Go to your Supabase dashboard: https://supabase.com/dashboard',
          '2. Navigate to your project: kffiaqsihldgqdwagook',
          '3. Go to SQL Editor',
          '4. Copy and paste the SQL commands below',
          '5. Run each SQL block separately',
          '6. Return to this debug tool and test license creation'
        ],
        sql_commands: sqlCommands
      },
      alternative: {
        message: 'Or try the simplified table creation method below',
        action: 'Use the "Create Simple Tables" button instead'
      }
    })
    
  } catch (error) {
    console.error('Manual table creation check error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to check table creation requirements', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}





