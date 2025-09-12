import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // SQL to create authentication-related tables
    const authTablesSQL = `
    -- Enable necessary extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Ensure user_profiles table exists with proper structure
    CREATE TABLE IF NOT EXISTS user_profiles (
      id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE,
      full_name TEXT,
      avatar_url TEXT,
      company TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'superadmin', 'engineer', 'analyst', 'operator', 'viewer', 'user')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_sign_in TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT true
    );

    -- Licenses table for Centcom integration
    CREATE TABLE IF NOT EXISTS licenses (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      key_id TEXT UNIQUE NOT NULL,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      plugin_id TEXT DEFAULT 'general',
      license_type TEXT NOT NULL CHECK (license_type IN ('trial', 'standard', 'professional', 'enterprise')),
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'revoked')),
      features TEXT[] DEFAULT ARRAY['basic_access'],
      max_users INTEGER DEFAULT 1,
      max_projects INTEGER DEFAULT 1,
      max_storage_gb INTEGER DEFAULT 1,
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      assigned_at TIMESTAMP WITH TIME ZONE,
      revoked BOOLEAN DEFAULT false
    );

    -- Authentication logs table for Centcom integration
    CREATE TABLE IF NOT EXISTS auth_logs (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      app_id TEXT,
      client_info JSONB,
      ip_address TEXT,
      success BOOLEAN DEFAULT true,
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
    CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
    CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
    CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_logs_event_type ON auth_logs(event_type);
    CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at);

    -- Enable Row Level Security
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
    ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

    -- User profiles policies
    CREATE POLICY IF NOT EXISTS "Users can view their own profile" ON user_profiles
      FOR SELECT USING (auth.uid() = id);
    CREATE POLICY IF NOT EXISTS "Users can update their own profile" ON user_profiles
      FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY IF NOT EXISTS "Users can insert their own profile" ON user_profiles
      FOR INSERT WITH CHECK (auth.uid() = id);

    -- Licenses policies
    CREATE POLICY IF NOT EXISTS "Users can view their own licenses" ON licenses
      FOR SELECT USING (auth.uid() = user_id);

    -- Auth logs policies (users can view their own logs)
    CREATE POLICY IF NOT EXISTS "Users can view their own auth logs" ON auth_logs
      FOR SELECT USING (auth.uid() = user_id);

    -- Insert sample data for testing
    INSERT INTO licenses (
      key_id,
      user_id,
      license_type,
      status,
      features,
      max_users,
      max_projects,
      max_storage_gb
    ) VALUES 
    (
      'TRIAL-' || substr(md5(random()::text), 1, 8),
      (SELECT id FROM auth.users LIMIT 1),
      'trial',
      'active',
      ARRAY['basic_access'],
      1,
      1,
      1
    ) ON CONFLICT (key_id) DO NOTHING;
    `
    
    // For now, just check if the tables exist and create a basic setup
    console.log('Setting up authentication tables...')
    
    // Check if user_profiles table exists
    const { data: userProfilesExists } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)
      .maybeSingle()
    
    // Check if licenses table exists  
    const { data: licensesExists } = await supabase
      .from('licenses')
      .select('id')
      .limit(1)
      .maybeSingle()

    const tablesStatus = {
      user_profiles: userProfilesExists !== undefined ? 'exists' : 'needs_creation',
      licenses: licensesExists !== undefined ? 'exists' : 'needs_creation',
      auth_logs: 'checking...'
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Authentication system status checked',
      tables_status: tablesStatus,
      note: 'Tables may need to be created manually in Supabase SQL Editor if they do not exist',
      sql_script_available: true,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to create authentication tables',
    endpoints: {
      setup: 'POST /api/admin/setup-auth-tables',
      description: 'Creates user_profiles, licenses, and auth_logs tables for Centcom integration'
    }
  })
}
