import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';

// Mock database connection testing
// In production, this would use actual database drivers
async function testDatabaseConnection(config: any): Promise<any> {
  // Simulate connection test with different outcomes based on config
  const { databaseType, host, port, username, password, connectionString } = config;
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Mock success/failure based on some criteria
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  const hasValidCredentials = username && password && username !== 'invalid';
  
  if (!hasValidCredentials) {
    return {
      success: false,
      message: 'Invalid credentials. Please check your username and password.'
    };
  }
  
  if (isLocalhost) {
    return {
      success: false,
      message: 'Cannot connect to localhost. Please use a publicly accessible database host.'
    };
  }
  
  // Mock successful connection
  return {
    success: true,
    message: 'Connection established successfully! Database is accessible and ready for analytics.',
    details: {
      latency: Math.floor(50 + Math.random() * 200), // 50-250ms
      version: getVersionForDatabaseType(databaseType),
      tables_count: Math.floor(10 + Math.random() * 100),
      estimated_monthly_cost: calculateEstimatedCost(databaseType)
    }
  };
}

function getVersionForDatabaseType(databaseType: string): string {
  const versions: Record<string, string> = {
    postgresql: 'PostgreSQL 15.3',
    mysql: 'MySQL 8.0.34',
    clickhouse: 'ClickHouse 23.7.1',
    sqlserver: 'SQL Server 2022'
  };
  return versions[databaseType] || 'Unknown';
}

function calculateEstimatedCost(databaseType: string): number {
  // Base cost is $10/month for connection, plus estimated usage
  const baseCost = 10;
  const usageCosts: Record<string, number> = {
    postgresql: 5, // Lower usage cost for transactional databases
    mysql: 5,
    clickhouse: 15, // Higher cost for analytics workloads
    sqlserver: 8
  };
  
  return baseCost + (usageCosts[databaseType] || 5);
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const config = await request.json();

    // Validate required fields
    const requiredFields = ['connectionName', 'databaseType'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate connection parameters
    if (!config.useConnectionString) {
      const requiredConnFields = ['host', 'username', 'password'];
      const missingConnFields = requiredConnFields.filter(field => !config[field]);
      
      if (missingConnFields.length > 0) {
        return NextResponse.json(
          { error: `Missing connection fields: ${missingConnFields.join(', ')}` },
          { status: 400 }
        );
      }
    } else if (!config.connectionString) {
      return NextResponse.json(
        { error: 'Connection string is required when using connection string mode' },
        { status: 400 }
      );
    }

    // Test the database connection
    const testResult = await testDatabaseConnection(config);

    return NextResponse.json(testResult, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error testing database connection:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to test database connection',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
