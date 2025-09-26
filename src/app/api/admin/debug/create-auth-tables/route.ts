import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    console.log('Creating auth tracking tables...')

    // Check if tables exist first
    const { data: authLogsExists } = await supabase
      .from('auth_logs')
      .select('id')
      .limit(1)
    
    const { data: activityLogsExists } = await supabase
      .from('user_activity_logs')
      .select('id')
      .limit(1)

    const results = {
      auth_logs_exists: !!authLogsExists,
      user_activity_logs_exists: !!activityLogsExists,
      message: ''
    }

    if (!authLogsExists) {
      results.message += 'auth_logs table missing. '
    }
    if (!activityLogsExists) {
      results.message += 'user_activity_logs table missing. '
    }

    if (authLogsExists && activityLogsExists) {
      results.message = 'All required tables exist!'
      
      // Test if we can insert a sample record
      try {
        const testUserId = '00000000-0000-0000-0000-000000000000'
        const { error } = await supabase
          .from('auth_logs')
          .insert({
            user_id: testUserId,
            event_type: 'test',
            app_id: 'test',
            session_type: 'test',
            application_type: 'test'
          })
        
        if (error) {
          results.message += ` But insert test failed: ${error.message}`
        } else {
          results.message += ' And insert test passed!'
          // Clean up test record
          await supabase
            .from('auth_logs')
            .delete()
            .eq('user_id', testUserId)
            .eq('event_type', 'test')
        }
      } catch (insertError) {
        results.message += ` Insert test error: ${insertError}`
      }
    }

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error: any) {
    console.error('Error checking/creating tables:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'Run the CREATE_AUTH_TABLES_FOR_SESSIONS.sql script in Supabase SQL Editor to create the required tables.'
    }, { status: 500 })
  }
}





