import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // SQL to create all necessary tables
    const createTablesSQL = `
    -- Enable necessary extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- User profiles table
    CREATE TABLE IF NOT EXISTS user_profiles (
      id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      avatar_url TEXT,
      company TEXT,
      role TEXT NOT NULL DEFAULT 'analyst' CHECK (role IN ('admin', 'engineer', 'analyst', 'viewer')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_sign_in TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT true
    );

    -- Analytics sessions table
    CREATE TABLE IF NOT EXISTS analytics_sessions (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      session_type TEXT NOT NULL DEFAULT 'exploratory' CHECK (session_type IN ('exploratory', 'monitoring', 'comparison', 'collaborative')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived', 'error')),
      created_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
      config JSONB NOT NULL DEFAULT '{}',
      data_bindings JSONB NOT NULL DEFAULT '{}',
      analytics_state JSONB NOT NULL DEFAULT '{}',
      collaboration JSONB NOT NULL DEFAULT '{}',
      metrics JSONB NOT NULL DEFAULT '{}',
      is_public BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_accessed TIMESTAMP WITH TIME ZONE
    );

    -- Session collaborators table
    CREATE TABLE IF NOT EXISTS analytics_session_collaborators (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      session_id UUID REFERENCES analytics_sessions(id) ON DELETE CASCADE NOT NULL,
      user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
      permissions JSONB NOT NULL DEFAULT '[]',
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_active TIMESTAMP WITH TIME ZONE,
      UNIQUE(session_id, user_id)
    );

    -- Projects table
    CREATE TABLE IF NOT EXISTS projects (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      project_key TEXT UNIQUE NOT NULL,
      created_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
      groups TEXT[] DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      data_types TEXT[] DEFAULT '{}',
      test_configurations JSONB DEFAULT '{}',
      measurement_count INTEGER DEFAULT 0,
      flagged_count INTEGER DEFAULT 0,
      is_public BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Measurement data table
    CREATE TABLE IF NOT EXISTS measurement_data (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
      session_id UUID REFERENCES analytics_sessions(id) ON DELETE SET NULL,
      measurement_id TEXT NOT NULL,
      name TEXT NOT NULL,
      data JSONB NOT NULL,
      metadata JSONB DEFAULT '{}',
      flags TEXT[] DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_analytics_sessions_created_by ON analytics_sessions(created_by);
    CREATE INDEX IF NOT EXISTS idx_analytics_sessions_status ON analytics_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
    CREATE INDEX IF NOT EXISTS idx_measurement_data_project_id ON measurement_data(project_id);
    CREATE INDEX IF NOT EXISTS idx_measurement_data_session_id ON measurement_data(session_id);

    -- Create RLS (Row Level Security) policies
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE analytics_session_collaborators ENABLE ROW LEVEL SECURITY;
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
    ALTER TABLE measurement_data ENABLE ROW LEVEL SECURITY;

    -- User profiles policies
    CREATE POLICY IF NOT EXISTS "Users can view their own profile" ON user_profiles
      FOR SELECT USING (auth.uid() = id);
    CREATE POLICY IF NOT EXISTS "Users can update their own profile" ON user_profiles
      FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY IF NOT EXISTS "Users can insert their own profile" ON user_profiles
      FOR INSERT WITH CHECK (auth.uid() = id);

    -- Analytics sessions policies
    CREATE POLICY IF NOT EXISTS "Users can view their own sessions" ON analytics_sessions
      FOR SELECT USING (auth.uid() = created_by OR is_public = true);
    CREATE POLICY IF NOT EXISTS "Users can create their own sessions" ON analytics_sessions
      FOR INSERT WITH CHECK (auth.uid() = created_by);
    CREATE POLICY IF NOT EXISTS "Users can update their own sessions" ON analytics_sessions
      FOR UPDATE USING (auth.uid() = created_by);
    CREATE POLICY IF NOT EXISTS "Users can delete their own sessions" ON analytics_sessions
      FOR DELETE USING (auth.uid() = created_by);

    -- Projects policies
    CREATE POLICY IF NOT EXISTS "Users can view their own projects" ON projects
      FOR SELECT USING (auth.uid() = created_by OR is_public = true);
    CREATE POLICY IF NOT EXISTS "Users can create their own projects" ON projects
      FOR INSERT WITH CHECK (auth.uid() = created_by);
    CREATE POLICY IF NOT EXISTS "Users can update their own projects" ON projects
      FOR UPDATE USING (auth.uid() = created_by);
    CREATE POLICY IF NOT EXISTS "Users can delete their own projects" ON projects
      FOR DELETE USING (auth.uid() = created_by);
    `
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql: createTablesSQL })
    
    if (error) {
      console.error('Database setup error:', error)
      return NextResponse.json({ 
        error: 'Failed to create database tables', 
        details: error.message 
      }, { status: 500 })
    }
    
    // Test that tables were created successfully
    const { data: tables, error: testError } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true })
    
    if (testError) {
      return NextResponse.json({ 
        error: 'Tables created but verification failed', 
        details: testError.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database tables created successfully!' 
    })
    
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ 
      error: 'Setup failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

