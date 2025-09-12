import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const results = []
    
    // Step 1: Enable extensions
    try {
      const { error } = await supabase.rpc('exec_sql', { 
        sql: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' 
      })
      
      results.push({
        step: 'Enable uuid-ossp extension',
        success: !error,
        error: error?.message
      })
    } catch (err) {
      results.push({
        step: 'Enable uuid-ossp extension',
        success: false,
        error: 'RPC function not available, skipping extensions'
      })
    }
    
    // Step 2: Create admin_users table
    try {
      const adminUsersSQL = `
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
          created_by UUID
        );
      `
      
      const { error } = await supabase.rpc('exec_sql', { sql: adminUsersSQL })
      
      results.push({
        step: 'Create admin_users table',
        success: !error,
        error: error?.message
      })
    } catch (err) {
      results.push({
        step: 'Create admin_users table',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
    
    // Step 3: Create license_keys table
    try {
      const licenseKeysSQL = `
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
          assigned_to UUID,
          assigned_at TIMESTAMP WITH TIME ZONE,
          created_by UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          usage_stats JSONB DEFAULT '{}'
        );
      `
      
      const { error } = await supabase.rpc('exec_sql', { sql: licenseKeysSQL })
      
      results.push({
        step: 'Create license_keys table',
        success: !error,
        error: error?.message
      })
    } catch (err) {
      results.push({
        step: 'Create license_keys table',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
    
    // Step 4: Create database_clusters table
    try {
      const clustersSQL = `
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
          created_by UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_health_check TIMESTAMP WITH TIME ZONE
        );
      `
      
      const { error } = await supabase.rpc('exec_sql', { sql: clustersSQL })
      
      results.push({
        step: 'Create database_clusters table',
        success: !error,
        error: error?.message
      })
    } catch (err) {
      results.push({
        step: 'Create database_clusters table',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
    
    // Step 5: Create remaining tables (if previous steps succeeded)
    const successfulSteps = results.filter(r => r.success).length
    
    if (successfulSteps >= 2) {
      // Create remaining tables
      const remainingTables = [
        {
          name: 'user_onboarding',
          sql: `
            CREATE TABLE IF NOT EXISTS user_onboarding (
              id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
              user_id UUID NOT NULL,
              onboarding_stage TEXT NOT NULL DEFAULT 'welcome' CHECK (onboarding_stage IN ('welcome', 'profile_setup', 'license_assignment', 'tutorial', 'completed')),
              assigned_license UUID,
              assigned_cluster UUID,
              onboarding_data JSONB DEFAULT '{}',
              completed_steps TEXT[] DEFAULT '{}',
              notes TEXT,
              assigned_admin UUID,
              started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              completed_at TIMESTAMP WITH TIME ZONE,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        },
        {
          name: 'admin_activity_log',
          sql: `
            CREATE TABLE IF NOT EXISTS admin_activity_log (
              id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
              admin_id UUID NOT NULL,
              action TEXT NOT NULL,
              resource_type TEXT NOT NULL,
              resource_id TEXT,
              details JSONB DEFAULT '{}',
              ip_address INET,
              user_agent TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        },
        {
          name: 'platform_metrics',
          sql: `
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
          `
        }
      ]
      
      for (const table of remainingTables) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: table.sql })
          
          results.push({
            step: `Create ${table.name} table`,
            success: !error,
            error: error?.message
          })
        } catch (err) {
          results.push({
            step: `Create ${table.name} table`,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          })
        }
      }
    }
    
    // Step 6: Create initial super admin user
    try {
      const superAdminSQL = `
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
      
      const { error } = await supabase.rpc('exec_sql', { sql: superAdminSQL })
      
      results.push({
        step: 'Create super admin user',
        success: !error,
        error: error?.message
      })
    } catch (err) {
      results.push({
        step: 'Create super admin user',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
    
    const successCount = results.filter(r => r.success).length
    const totalSteps = results.length
    
    return NextResponse.json({
      success: successCount === totalSteps,
      results,
      summary: {
        successfulSteps: successCount,
        totalSteps,
        completionRate: Math.round((successCount / totalSteps) * 100)
      }
    })
    
  } catch (error) {
    console.error('Step-by-step table creation error:', error)
    return NextResponse.json({ 
      error: 'Failed to create tables step by step', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

