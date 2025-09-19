import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Create a minimal license table by inserting a dummy record
    // This will force Supabase to infer the table structure
    
    try {
      // Try to insert a complete license record
      // If the table doesn't exist, this might create it or at least tell us what's missing
      
      const testLicense = {
        id: '00000000-0000-0000-0000-000000000001',
        key_code: 'TEST-INIT-2024-SETUP',
        license_type: 'test',
        status: 'active',
        max_users: 1,
        max_projects: 1,
        max_storage_gb: 1,
        features: [],
        time_limit_type: 'unlimited',
        enabled_plugins: [],
        allowed_user_types: ['engineer'],
        access_level: 'basic',
        created_by: null,
        restrictions: {},
        license_config: { setup: true },
        usage_stats: {}
      }
      
      const { data, error } = await supabase
        .from('license_keys')
        .upsert([testLicense], { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
      
      if (error) {
        return NextResponse.json({
          success: false,
          message: 'Table creation through upsert failed',
          error: error.message,
          error_code: error.code,
          suggestion: {
            message: 'The license_keys table needs to be created manually',
            method: 'Use Supabase dashboard SQL editor',
            sql: `
CREATE TABLE public.license_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_code TEXT NOT NULL UNIQUE,
  license_type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  max_users INTEGER DEFAULT 10,
  max_projects INTEGER DEFAULT 50,
  max_storage_gb INTEGER DEFAULT 25,
  features JSONB DEFAULT '[]'::jsonb,
  time_limit_type TEXT DEFAULT 'unlimited',
  enabled_plugins JSONB DEFAULT '[]'::jsonb,
  allowed_user_types JSONB DEFAULT '["engineer"]'::jsonb,
  access_level TEXT DEFAULT 'standard',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  restrictions JSONB DEFAULT '{}'::jsonb,
  license_config JSONB DEFAULT '{}'::jsonb,
  usage_stats JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read licenses" ON public.license_keys FOR SELECT USING (true);
CREATE POLICY "Service role can manage licenses" ON public.license_keys FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
            `.trim()
          }
        })
      }
      
      // If successful, clean up the test record and return success
      if (data) {
        // Remove the test record
        await supabase
          .from('license_keys')
          .delete()
          .eq('id', '00000000-0000-0000-0000-000000000001')
        
        return NextResponse.json({
          success: true,
          message: 'License table is ready!',
          method: 'upsert_successful',
          next_step: 'You can now create real license keys'
        })
      }
      
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Unexpected error during table creation',
        error: error instanceof Error ? error.message : 'Unknown error',
        recommendation: 'Try manual table creation in Supabase dashboard'
      })
    }
    
  } catch (error) {
    console.error('Simple table creation error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to create simple tables', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}





