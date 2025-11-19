import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// List all test data projects (metadata only - fast!)
// This powers the Test Data page project list
export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const cookieStore = await cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          headers: {
            cookie: cookieStore.toString()
          }
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const clusterId = searchParams.get('cluster_id');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const sourceType = searchParams.get('source_type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('Fetching projects for user:', user.id);
    console.log('Filters:', { clusterId, search, tags, sourceType, limit, offset });

    // Call database function
    const { data: projects, error } = await supabase.rpc('get_user_projects_metadata', {
      p_user_id: user.id,
      p_cluster_id: clusterId,
      p_search: search,
      p_tags: tags,
      p_source_type: sourceType,
      p_limit: limit,
      p_offset: offset
    });

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get total count (for pagination)
    let query = supabase
      .from('cluster_projects_metadata')
      .select('*', { count: 'exact', head: true });

    // Apply same filters for count
    if (clusterId) {
      query = query.eq('cluster_id', clusterId);
    }

    const { count } = await query;

    // Get aggregate stats
    const { data: stats } = await supabase
      .from('cluster_projects_metadata')
      .select('measurement_count, storage_bytes, quality_score_avg')
      .eq('cluster_id', clusterId || undefined);

    const aggregateStats = {
      total_projects: count || 0,
      total_measurements: stats?.reduce((sum, p) => sum + (p.measurement_count || 0), 0) || 0,
      total_storage_bytes: stats?.reduce((sum, p) => sum + (p.storage_bytes || 0), 0) || 0,
      avg_quality_score: stats && stats.length > 0
        ? stats.reduce((sum, p) => sum + (p.quality_score_avg || 0), 0) / stats.length
        : null
    };

    console.log(`Found ${projects?.length || 0} projects`);

    return NextResponse.json({
      projects: projects || [],
      total: count || 0,
      limit,
      offset,
      stats: aggregateStats
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
