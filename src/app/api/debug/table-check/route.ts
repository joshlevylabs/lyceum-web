import { NextRequest, NextResponse } from 'next/server';
import { dbOperations } from '@/lib/supabase-direct';

export async function GET(request: NextRequest) {
  try {
    // Debug endpoint - no authentication required

    const results = {
      cluster_user_assignments_table: false,
      cluster_user_assignments_count: 0,
      sample_assignment: null,
      table_structure: null,
      error_details: null
    };

    try {
      // Check if table exists by trying to count records
      const { count, error: countError } = await dbOperations.supabaseAdmin
        .from('cluster_user_assignments')
        .select('*', { count: 'exact', head: true });

      if (!countError) {
        results.cluster_user_assignments_table = true;
        results.cluster_user_assignments_count = count || 0;

        // Get sample assignment if any exist
        const { data: sampleData } = await dbOperations.supabaseAdmin
          .from('cluster_user_assignments')
          .select('*')
          .limit(1);
        
        results.sample_assignment = sampleData?.[0] || null;
        results.table_structure = 'Table exists and accessible';
      } else {
        results.error_details = countError;
      }
    } catch (error) {
      results.error_details = error;
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error in table check endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to check table status' },
      { status: 500 }
    );
  }
}
