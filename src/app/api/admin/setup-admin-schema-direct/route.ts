import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const errors = []
    const successes = []
    
    try {
      // Method 1: Try to insert admin user directly into user_profiles table (which should exist)
      // This will test if we can at least insert data
      
      const testInsert = {
        id: 'a0000000-0000-0000-0000-000000000001',
        email: 'admin@lyceum.app',
        username: 'superadmin',
        full_name: 'Super Administrator',
        role: 'admin', // Use existing role from user_profiles
        company: 'Lyceum Admin',
        is_active: true
      }
      
      const { data: insertData, error: insertError } = await supabase
        .from('user_profiles')
        .upsert([testInsert])
        .select()
      
      if (insertError) {
        errors.push({
          step: 'Insert admin into user_profiles',
          error: insertError.message,
          details: insertError
        })
      } else {
        successes.push({
          step: 'Insert admin into user_profiles',
          data: insertData
        })
      }
      
    } catch (err) {
      errors.push({
        step: 'Insert admin into user_profiles',
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
    
    // Method 2: Try to use SQL directly with a simpler approach
    try {
      // Create a simple table first to test SQL execution
      const createTestTable = `
        CREATE TABLE IF NOT EXISTS admin_test_table (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `
      
      const { error: testTableError } = await supabase.rpc('exec_sql', { 
        sql: createTestTable 
      })
      
      if (testTableError) {
        errors.push({
          step: 'Create test table with RPC',
          error: testTableError.message,
          details: testTableError
        })
      } else {
        successes.push({
          step: 'Create test table with RPC',
          message: 'RPC function is working'
        })
        
        // If RPC works, try creating admin tables one by one
        const adminTables = [
          {
            name: 'admin_users_simple',
            sql: `
              CREATE TABLE IF NOT EXISTS admin_users_simple (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'admin',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
              );
            `
          }
        ]
        
        for (const table of adminTables) {
          try {
            const { error } = await supabase.rpc('exec_sql', { sql: table.sql })
            
            if (error) {
              errors.push({
                step: `Create ${table.name}`,
                error: error.message,
                details: error
              })
            } else {
              successes.push({
                step: `Create ${table.name}`,
                message: 'Table created successfully'
              })
            }
          } catch (err) {
            errors.push({
              step: `Create ${table.name}`,
              error: err instanceof Error ? err.message : 'Unknown error'
            })
          }
        }
      }
      
    } catch (err) {
      errors.push({
        step: 'RPC function test',
        error: 'RPC function not available or accessible',
        details: err instanceof Error ? err.message : 'Unknown error'
      })
    }
    
    // Method 3: Check current database state
    try {
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(10)
      
      if (tablesError) {
        errors.push({
          step: 'Check database tables',
          error: tablesError.message
        })
      } else {
        successes.push({
          step: 'Check database tables',
          tables: tables?.map(t => t.table_name) || []
        })
      }
    } catch (err) {
      errors.push({
        step: 'Check database tables',
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
    
    // Method 4: Check Supabase configuration
    const configInfo = {
      supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyLength: supabaseServiceKey?.length || 0,
      environment: process.env.NODE_ENV || 'unknown'
    }
    
    successes.push({
      step: 'Configuration check',
      config: configInfo
    })
    
    const hasErrors = errors.length > 0
    const hasSuccesses = successes.length > 0
    
    return NextResponse.json({
      success: !hasErrors && hasSuccesses,
      message: hasErrors 
        ? 'Schema creation encountered issues - see diagnostics' 
        : 'Direct schema creation completed',
      errors,
      successes,
      summary: {
        totalErrors: errors.length,
        totalSuccesses: successes.length,
        rpcAvailable: !errors.some(e => e.step === 'RPC function test'),
        canInsertData: successes.some(s => s.step === 'Insert admin into user_profiles'),
        canQueryTables: successes.some(s => s.step === 'Check database tables')
      },
      recommendations: hasErrors ? [
        'Check Supabase dashboard logs for detailed error messages',
        'Verify service role key has sufficient permissions',
        'Try creating tables manually in Supabase SQL editor',
        'Consider using the step-by-step creation method',
        'Check if RLS policies are blocking table creation'
      ] : []
    }, { 
      status: hasErrors ? 500 : 200 
    })
    
  } catch (error) {
    console.error('Direct schema setup error:', error)
    return NextResponse.json({ 
      error: 'Direct schema setup failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      type: 'unexpected_error'
    }, { status: 500 })
  }
}

