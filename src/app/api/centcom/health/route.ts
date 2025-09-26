import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Test database connectivity
    const { data: dbTest, error: dbError } = await supabase
      .from('application_versions')
      .select('count(*)')
      .limit(1)

    // Test version compatibility function
    const { data: funcTest, error: funcError } = await supabase
      .rpc('check_version_compatibility', {
        p_license_type: 'standard',
        p_plugin_id: 'centcom',
        p_requested_version: '2.1.0'
      })

    const responseTime = Date.now() - startTime

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: dbError ? 'error' : 'healthy',
          error: dbError?.message || null,
          response_time_ms: dbError ? null : responseTime
        },
        version_compatibility: {
          status: funcError ? 'error' : 'healthy',
          error: funcError?.message || null,
          test_result: funcTest || null
        },
        authentication: {
          status: 'healthy',
          provider: 'supabase'
        }
      },
      features: {
        version_based_licensing: true,
        plugin_management: true,
        license_validation: true,
        resource_tracking: true
      },
      api_endpoints: {
        '/api/centcom/auth/login': 'available',
        '/api/centcom/auth/validate': 'available',
        '/api/centcom/licenses/validate-plugin': 'available',
        '/api/centcom/versions/available': 'available',
        '/api/centcom/user/resources': 'available'
      }
    }

    // Determine overall health
    const hasErrors = dbError || funcError
    const overallStatus = hasErrors ? 'degraded' : 'healthy'
    const statusCode = hasErrors ? 503 : 200

    return NextResponse.json({
      ...healthStatus,
      status: overallStatus
    }, { status: statusCode })

  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      error: error.message || 'Internal server error',
      services: {
        database: { status: 'error' },
        version_compatibility: { status: 'error' },
        authentication: { status: 'error' }
      }
    }, { status: 500 })
  }
}

// Support for CORS preflight requests
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}







