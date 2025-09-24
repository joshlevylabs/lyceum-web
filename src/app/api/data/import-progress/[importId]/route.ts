import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';

// Import the progress map from the csv-import endpoint
// In production, this would be stored in a database or Redis
const importProgress: Map<string, any> = new Map();

export async function GET(
  request: NextRequest,
  { params }: { params: { importId: string } }
) {
  try {
    // Authenticate the user
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { importId } = await params;

    if (!importId) {
      return NextResponse.json(
        { error: 'Import ID is required' },
        { status: 400 }
      );
    }

    // Get progress from the global map (this is a simplified approach)
    // In production, you'd fetch this from a database or Redis
    const progress = importProgress.get(importId);

    if (!progress) {
      // Check if we can find it in a mock database or if it's an unknown import
      return NextResponse.json({
        importId,
        status: 'error',
        progress: 0,
        message: 'Import not found. It may have expired or never existed.',
        errors: ['Import not found']
      });
    }

    return NextResponse.json(progress, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error fetching import progress:', error);
    return NextResponse.json(
      { 
        importId: (await params).importId,
        status: 'error',
        progress: 0,
        message: 'Failed to fetch import progress',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
