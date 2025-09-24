import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { clusterAdminOperations } from '@/lib/cluster-admin-operations';

export async function GET(request: NextRequest) {
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

    try {
      console.log('Attempting to get clusters with assignments...');
      
      // Get all clusters with assignments
      const clustersWithAssignments = await clusterAdminOperations.getAllClustersWithAssignments();
      
      console.log('Successfully retrieved clusters:', clustersWithAssignments.length);
      
      return NextResponse.json(clustersWithAssignments, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } catch (dbError) {
      // If enhanced cluster management tables don't exist, return empty array
      console.error('Enhanced cluster management features not available:', dbError);
      console.log('Returning empty array as fallback');
      
      return NextResponse.json([], {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

  } catch (error) {
    console.error('Error in cluster assignments endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cluster assignments' },
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
    const { clusterId, userEmail, accessLevel, expiresAt, accessNotes } = body;

    // Validate required fields
    if (!clusterId || !userEmail) {
      return NextResponse.json(
        { error: 'clusterId and userEmail are required' },
        { status: 400 }
      );
    }

    // Assign user to cluster
    const assignment = await clusterAdminOperations.assignUserToCluster({
      clusterId,
      userEmail,
      assignedBy: user.id,
      accessLevel: accessLevel || 'viewer',
      expiresAt,
      accessNotes
    });

    return NextResponse.json(assignment, {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error assigning user to cluster:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to assign user to cluster' 
      },
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
