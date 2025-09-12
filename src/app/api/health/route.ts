import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Use consistent configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing environment variables',
        checks: {
          environment: false,
          database: false
        }
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Test database connection by checking if we can query a table
    const { error: dbError } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true })
    
    const dbConnected = !dbError
    
    return NextResponse.json({
      status: 'ok',
      message: 'Health check passed',
      timestamp: new Date().toISOString(),
      checks: {
        environment: true,
        database: dbConnected,
        supabase_url: !!supabaseUrl,
        service_key: !!supabaseServiceKey
      },
      error: dbError ? dbError.message : null
    }, { status: dbConnected ? 200 : 500 })
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        environment: false,
        database: false
      }
    }, { status: 500 })
  }
} 