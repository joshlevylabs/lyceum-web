import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { dbOperations } from '@/lib/supabase-direct';

// Simple encryption for demo purposes - in production use proper encryption
function encryptCredentials(data: string): string {
  // This is a simple base64 encoding for demo purposes
  // In production, use proper encryption with a secret key
  return Buffer.from(data).toString('base64');
}

function decryptCredentials(encryptedData: string): string {
  try {
    return Buffer.from(encryptedData, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

export async function GET(request: NextRequest) {
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

    // Get user's BYOD connections
    const { data: connections, error } = await dbOperations.supabaseAdmin
      .from('byod_connections')
      .select(`
        id,
        connection_name,
        database_type,
        host,
        port,
        database_name,
        username,
        ssl_enabled,
        status,
        last_tested_at,
        last_error,
        monthly_fee,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(connections || [], {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error fetching BYOD connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
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

    // Check if connection name already exists for this user
    const { data: existingConnection } = await dbOperations.supabaseAdmin
      .from('byod_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('connection_name', config.connectionName)
      .single();

    if (existingConnection) {
      return NextResponse.json(
        { error: 'A connection with this name already exists' },
        { status: 400 }
      );
    }

    // Create encrypted password and connection string
    const encryptedPassword = config.password ? encryptCredentials(config.password) : '';
    const encryptedConnectionString = config.connectionString ? encryptCredentials(config.connectionString) : '';

    // Create the connection record
    const { data: connection, error } = await dbOperations.supabaseAdmin
      .from('byod_connections')
      .insert({
        user_id: user.id,
        cluster_id: config.clusterId || null,
        connection_name: config.connectionName,
        database_type: config.databaseType,
        host: config.host || '',
        port: config.port || 0,
        database_name: config.databaseName || '',
        username: config.username || '',
        password_encrypted: encryptedPassword,
        ssl_enabled: config.sslEnabled || false,
        connection_string_encrypted: encryptedConnectionString,
        status: 'active',
        last_tested_at: new Date().toISOString(),
        monthly_fee: 10.00,
      })
      .select(`
        id,
        connection_name,
        database_type,
        host,
        port,
        database_name,
        username,
        ssl_enabled,
        status,
        monthly_fee,
        created_at
      `)
      .single();

    if (error) {
      throw error;
    }

    // TODO: In production, this would:
    // 1. Create a Stripe subscription for the BYOD connection
    // 2. Set up monitoring for the connection
    // 3. Schedule health checks
    // 4. Send confirmation email to user

    return NextResponse.json(connection, {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error creating BYOD connection:', error);
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
