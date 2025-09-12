import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Try to get all licenses from the database
    const { data: licenses, error } = await supabase
      .from('license_keys')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        licenses: [],
        debug: {
          table_exists: false,
          error_code: error.code,
          hint: error.hint
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      licenses: licenses || [],
      count: licenses?.length || 0,
      debug: {
        table_exists: true,
        supabase_url: supabaseUrl,
        has_service_key: !!supabaseServiceKey
      }
    })
    
  } catch (error) {
    console.error('Debug licenses error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to debug licenses', 
      details: error instanceof Error ? error.message : 'Unknown error',
      licenses: []
    }, { status: 500 })
  }
}

