import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Check what admin tables exist
    const adminTables = [
      'admin_users',
      'license_keys', 
      'database_clusters',
      'user_onboarding',
      'admin_activity_log',
      'platform_metrics'
    ]
    
    const existingTables = []
    const tableDetails = {}
    
    for (const tableName of adminTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('count', { count: 'exact', head: true })
        
        if (!error) {
          existingTables.push(tableName)
          tableDetails[tableName] = {
            exists: true,
            rowCount: data || 0
          }
        } else {
          tableDetails[tableName] = {
            exists: false,
            error: error.message
          }
        }
      } catch (err) {
        tableDetails[tableName] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      }
    }
    
    // Also check for any tables with admin/license/cluster in the name
    try {
      const { data: allTables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .or('table_name.ilike.%admin%,table_name.ilike.%license%,table_name.ilike.%cluster%')
      
      const relatedTables = allTables?.map(t => t.table_name) || []
      
      return NextResponse.json({
        adminTables: existingTables,
        tableDetails,
        relatedTables,
        summary: {
          totalAdminTables: adminTables.length,
          existingAdminTables: existingTables.length,
          missingTables: adminTables.filter(table => !existingTables.includes(table))
        }
      })
      
    } catch (error) {
      return NextResponse.json({
        adminTables: existingTables,
        tableDetails,
        relatedTables: [],
        summary: {
          totalAdminTables: adminTables.length,
          existingAdminTables: existingTables.length,
          missingTables: adminTables.filter(table => !existingTables.includes(table))
        },
        warning: 'Could not fetch related tables'
      })
    }
    
  } catch (error) {
    console.error('Schema check error:', error)
    return NextResponse.json({ 
      error: 'Failed to check schema', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

