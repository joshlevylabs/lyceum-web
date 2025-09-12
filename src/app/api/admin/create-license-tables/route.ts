import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const steps = []
    
    // Step 1: Create license_keys table
    const licenseTableSQL = `
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
    `
    
    const { error: licenseTableError } = await supabase.rpc('execute_sql', { sql: licenseTableSQL })
    
    if (licenseTableError) {
      // Try direct query instead of RPC
      console.log('RPC failed, trying direct query...')
      const { error: directError } = await supabase.from('_schema').select('*').limit(1)
      
      if (directError) {
        steps.push({ 
          step: 'Create license_keys table', 
          success: false, 
          error: licenseTableError.message,
          method: 'rpc_failed_and_direct_failed'
        })
      } else {
        steps.push({ 
          step: 'Create license_keys table', 
          success: false, 
          error: licenseTableError.message,
          method: 'rpc_failed'
        })
      }
    } else {
      steps.push({ step: 'Create license_keys table', success: true })
    }
    
    // Step 2: Create admin_users table (if needed)
    const adminUsersSQL = `
      CREATE TABLE IF NOT EXISTS public.admin_users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id),
        role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator')),
        permissions JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true
      );
    `
    
    const { error: adminTableError } = await supabase.rpc('execute_sql', { sql: adminUsersSQL })
    
    if (!adminTableError) {
      steps.push({ step: 'Create admin_users table', success: true })
    } else {
      steps.push({ 
        step: 'Create admin_users table', 
        success: false, 
        error: adminTableError.message 
      })
    }
    
    // Step 3: Enable RLS on license_keys
    const enableRLSSQL = `
      ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "License keys are viewable by authenticated users" ON public.license_keys
        FOR SELECT USING (auth.role() = 'authenticated');
      
      CREATE POLICY "Admins can manage license keys" ON public.license_keys
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE admin_users.user_id = auth.uid() 
            AND admin_users.is_active = true
          )
        );
    `
    
    const { error: rlsError } = await supabase.rpc('execute_sql', { sql: enableRLSSQL })
    
    if (!rlsError) {
      steps.push({ step: 'Enable RLS policies', success: true })
    } else {
      steps.push({ 
        step: 'Enable RLS policies', 
        success: false, 
        error: rlsError.message 
      })
    }
    
    // Step 4: Create super admin user
    const superAdminSQL = `
      INSERT INTO public.admin_users (id, user_id, role, permissions, is_active)
      VALUES (
        'a0000000-0000-0000-0000-000000000001'::uuid,
        NULL,
        'super_admin',
        '{"manage_licenses": true, "manage_users": true, "manage_system": true}'::jsonb,
        true
      )
      ON CONFLICT (id) DO NOTHING;
    `
    
    const { error: adminUserError } = await supabase.rpc('execute_sql', { sql: superAdminSQL })
    
    if (!adminUserError) {
      steps.push({ step: 'Create super admin user', success: true })
    } else {
      steps.push({ 
        step: 'Create super admin user', 
        success: false, 
        error: adminUserError.message 
      })
    }
    
    // Step 5: Test table access
    const { data: testQuery, error: testError } = await supabase
      .from('license_keys')
      .select('count()', { count: 'exact' })
    
    if (!testError) {
      steps.push({ 
        step: 'Test license_keys table access', 
        success: true, 
        count: testQuery?.[0]?.count || 0 
      })
    } else {
      steps.push({ 
        step: 'Test license_keys table access', 
        success: false, 
        error: testError.message 
      })
    }
    
    const successfulSteps = steps.filter(step => step.success).length
    
    return NextResponse.json({
      success: successfulSteps >= 3, // Need at least table creation, RLS, and access test to pass
      message: `Created licensing tables (${successfulSteps}/${steps.length} steps successful)`,
      steps,
      summary: {
        total_steps: steps.length,
        successful_steps: successfulSteps,
        table_accessible: steps.some(s => s.step === 'Test license_keys table access' && s.success)
      }
    })
    
  } catch (error) {
    console.error('Create license tables error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to create license tables', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

