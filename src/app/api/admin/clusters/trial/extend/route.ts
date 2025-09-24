import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { clusterAdminOperations } from '@/lib/cluster-admin-operations';

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user and check for admin role
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { user } = authResult;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { clusterId, extensionDays, reason } = body;

    // Validate required fields
    if (!clusterId || !extensionDays) {
      return NextResponse.json(
        { error: 'clusterId and extensionDays are required' },
        { status: 400 }
      );
    }

    // Validate extension days
    if (extensionDays <= 0 || extensionDays > 365) {
      return NextResponse.json(
        { error: 'Extension days must be between 1 and 365' },
        { status: 400 }
      );
    }

    // Extend cluster trial
    const newEndDate = await clusterAdminOperations.extendClusterTrial({
      clusterId,
      extendedBy: user.id,
      extensionDays,
      reason
    });

    return NextResponse.json(
      { 
        message: 'Cluster trial extended successfully',
        newEndDate
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );

  } catch (error) {
    console.error('Error extending cluster trial:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to extend cluster trial' 
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
