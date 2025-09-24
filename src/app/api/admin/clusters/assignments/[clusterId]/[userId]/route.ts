import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { clusterAdminOperations } from '@/lib/cluster-admin-operations';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string; userId: string }> }
) {
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

    const { clusterId, userId } = await params;

    if (!clusterId || !userId) {
      return NextResponse.json(
        { error: 'clusterId and userId are required' },
        { status: 400 }
      );
    }

    // Remove user from cluster
    await clusterAdminOperations.removeUserFromCluster(clusterId, userId);

    return NextResponse.json(
      { message: 'User removed from cluster successfully' },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );

  } catch (error) {
    console.error('Error removing user from cluster:', error);
    return NextResponse.json(
      { error: 'Failed to remove user from cluster' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
