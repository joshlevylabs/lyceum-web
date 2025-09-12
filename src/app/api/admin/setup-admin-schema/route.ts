import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // SQL to create admin-specific tables
    const adminTablesSQL = `
    -- Admin users table (separate from regular users)
    CREATE TABLE IF NOT EXISTS admin_users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support')),
      permissions JSONB DEFAULT '[]',
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_by UUID REFERENCES admin_users(id)
    );

    -- License keys table
    CREATE TABLE IF NOT EXISTS license_keys (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      key_code TEXT UNIQUE NOT NULL,
      license_type TEXT NOT NULL CHECK (license_type IN ('trial', 'standard', 'professional', 'enterprise')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),
      max_users INTEGER DEFAULT 1,
      max_projects INTEGER DEFAULT 10,
      max_storage_gb INTEGER DEFAULT 5,
      features JSONB DEFAULT '[]',
      expires_at TIMESTAMP WITH TIME ZONE,
      assigned_to UUID REFERENCES user_profiles(id),
      assigned_at TIMESTAMP WITH TIME ZONE,
      created_by UUID REFERENCES admin_users(id) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      usage_stats JSONB DEFAULT '{}'
    );

    -- Database clusters table
    CREATE TABLE IF NOT EXISTS database_clusters (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      cluster_type TEXT NOT NULL CHECK (cluster_type IN ('development', 'staging', 'production')),
      status TEXT NOT NULL DEFAULT 'initializing' CHECK (status IN ('initializing', 'active', 'maintenance', 'error', 'archived')),
      connection_string TEXT,
      region TEXT DEFAULT 'us-east-1',
      instance_size TEXT DEFAULT 'small',
      max_connections INTEGER DEFAULT 100,
      storage_gb INTEGER DEFAULT 20,
      backup_enabled BOOLEAN DEFAULT true,
      monitoring_enabled BOOLEAN DEFAULT true,
      assigned_users UUID[] DEFAULT '{}',
      configuration JSONB DEFAULT '{}',
      metrics JSONB DEFAULT '{}',
      created_by UUID REFERENCES admin_users(id) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_health_check TIMESTAMP WITH TIME ZONE
    );

    -- User onboarding table
    CREATE TABLE IF NOT EXISTS user_onboarding (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
      onboarding_stage TEXT NOT NULL DEFAULT 'welcome' CHECK (onboarding_stage IN ('welcome', 'profile_setup', 'license_assignment', 'tutorial', 'completed')),
      assigned_license UUID REFERENCES license_keys(id),
      assigned_cluster UUID REFERENCES database_clusters(id),
      onboarding_data JSONB DEFAULT '{}',
      completed_steps TEXT[] DEFAULT '{}',
      notes TEXT,
      assigned_admin UUID REFERENCES admin_users(id),
      started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Admin activity log
    CREATE TABLE IF NOT EXISTS admin_activity_log (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      admin_id UUID REFERENCES admin_users(id) NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details JSONB DEFAULT '{}',
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Platform metrics table
    CREATE TABLE IF NOT EXISTS platform_metrics (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
      total_users INTEGER DEFAULT 0,
      active_users INTEGER DEFAULT 0,
      new_signups INTEGER DEFAULT 0,
      total_projects INTEGER DEFAULT 0,
      total_sessions INTEGER DEFAULT 0,
      storage_used_gb DECIMAL DEFAULT 0,
      license_utilization JSONB DEFAULT '{}',
      cluster_performance JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(metric_date)
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_license_keys_status ON license_keys(status);
    CREATE INDEX IF NOT EXISTS idx_license_keys_assigned_to ON license_keys(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_database_clusters_status ON database_clusters(status);
    CREATE INDEX IF NOT EXISTS idx_user_onboarding_stage ON user_onboarding(onboarding_stage);
    CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_id ON admin_activity_log(admin_id);
    CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at);

    -- Enable RLS
    ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE license_keys ENABLE ROW LEVEL SECURITY;
    ALTER TABLE database_clusters ENABLE ROW LEVEL SECURITY;
    ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
    ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;

    -- RLS Policies for admin tables (only accessible by admin users)
    
    -- Admin users policies
    CREATE POLICY IF NOT EXISTS "Admin users can view admin users" ON admin_users
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM admin_users au 
          WHERE au.id = (select auth.uid()::uuid) 
          AND au.is_active = true
        )
      );

    -- License keys policies  
    CREATE POLICY IF NOT EXISTS "Admin users can manage license keys" ON license_keys
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM admin_users au 
          WHERE au.id = (select auth.uid()::uuid) 
          AND au.is_active = true
        )
      );

    -- Database clusters policies
    CREATE POLICY IF NOT EXISTS "Admin users can manage clusters" ON database_clusters
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM admin_users au 
          WHERE au.id = (select auth.uid()::uuid) 
          AND au.is_active = true
        )
      );

    -- Create initial super admin user
    INSERT INTO admin_users (
      id,
      email,
      username,
      full_name,
      role,
      permissions
    ) VALUES (
      'a0000000-0000-0000-0000-000000000001',
      'admin@lyceum.app',
      'superadmin',
      'Super Administrator',
      'super_admin',
      '["user_management", "license_management", "cluster_management", "system_admin", "full_access"]'
    ) ON CONFLICT (email) DO NOTHING;
    `
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql: adminTablesSQL })
    
    if (error) {
      console.error('Admin schema setup error:', error)
      return NextResponse.json({ 
        error: 'Failed to create admin schema', 
        details: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Admin schema created successfully!' 
    })
    
  } catch (error) {
    console.error('Admin setup error:', error)
    return NextResponse.json({ 
      error: 'Admin setup failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

