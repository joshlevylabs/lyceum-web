import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserIdFromToken } from '@/lib/auth';

/**
 * GET /api/user/dashboard/stats
 *
 * Retrieve user's dashboard statistics
 * Called by: Centcom Dashboard.tsx on load
 *
 * Returns:
 * {
 *   data_clusters: number,
 *   test_projects: number,
 *   plugin_licenses: number,
 *   total_sessions: number,
 *   active_users: number,
 *   measurements_today: number,
 *   measurements_this_week: number,
 *   storage_used_gb: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Dashboard stats API - Starting request...');

    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('❌ Dashboard stats: Missing or invalid authorization header');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Decode Lyceum JWT token to get user ID
    const userId = getUserIdFromToken(token);
    if (!userId) {
      console.warn('❌ Dashboard stats: Invalid or expired token');
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('✅ Fetching dashboard stats for user:', userId);

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Calculate date boundaries for measurements
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();

    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    const fifteenMinAgoISO = fifteenMinAgo.toISOString();

    // Get user's statistics in parallel
    // Note: 'projects' table uses 'created_by' instead of 'user_id'
    // Note: 'centcom_measurements' renamed to avoid conflicts with existing tables
    const [
      dataClustersResult,
      testProjectsResult,
      pluginLicensesResult,
      totalSessionsResult,
      activeUsersResult,
      measurementsTodayResult,
      measurementsThisWeekResult,
      storageResult
    ] = await Promise.allSettled([
      supabase.from('data_clusters').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('created_by', userId),
      supabase.from('license_keys').select('*', { count: 'exact', head: true }).eq('assigned_to', userId).eq('status', 'active'),
      supabase.from('centcom_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('centcom_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('last_activity', fifteenMinAgoISO),
      supabase.from('centcom_measurements').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', todayISO),
      supabase.from('centcom_measurements').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', weekAgoISO),
      supabase.from('user_storage').select('total_bytes').eq('user_id', userId).single()
    ]);

    // Extract counts safely, defaulting to 0 if table doesn't exist or query fails
    const dataClusters = dataClustersResult.status === 'fulfilled' ? (dataClustersResult.value.count || 0) : 0;
    const testProjects = testProjectsResult.status === 'fulfilled' ? (testProjectsResult.value.count || 0) : 0;
    const pluginLicenses = pluginLicensesResult.status === 'fulfilled' ? (pluginLicensesResult.value.count || 0) : 0;
    const totalSessions = totalSessionsResult.status === 'fulfilled' ? (totalSessionsResult.value.count || 0) : 0;
    const activeUsers = activeUsersResult.status === 'fulfilled' ? (activeUsersResult.value.count || 0) : 0;
    const measurementsToday = measurementsTodayResult.status === 'fulfilled' ? (measurementsTodayResult.value.count || 0) : 0;
    const measurementsThisWeek = measurementsThisWeekResult.status === 'fulfilled' ? (measurementsThisWeekResult.value.count || 0) : 0;

    // Calculate storage used
    const storageData = storageResult.status === 'fulfilled' ? storageResult.value.data : null;
    const storageUsedGb = storageData?.total_bytes
      ? parseFloat((storageData.total_bytes / (1024 * 1024 * 1024)).toFixed(2))
      : 0;

    // Log any failed queries
    const results = [
      dataClustersResult,
      testProjectsResult,
      pluginLicensesResult,
      totalSessionsResult,
      activeUsersResult,
      measurementsTodayResult,
      measurementsThisWeekResult,
      storageResult
    ];
    const failedQueries = results.filter(r => r.status === 'rejected');
    if (failedQueries.length > 0) {
      console.warn(`⚠️ ${failedQueries.length} dashboard stat queries failed (tables may not exist yet)`);
    }

    const stats = {
      data_clusters: dataClusters,
      test_projects: testProjects,
      plugin_licenses: pluginLicenses,
      total_sessions: totalSessions,
      active_users: activeUsers,
      measurements_today: measurementsToday,
      measurements_this_week: measurementsThisWeek,
      storage_used_gb: storageUsedGb
    };

    console.log('✅ Dashboard stats retrieved:', stats);

    return NextResponse.json(stats);

  } catch (error: any) {
    console.error('❌ Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve dashboard stats' },
      { status: 500 }
    );
  }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'http://localhost:3003',
    'http://localhost:3594',
    'tauri://localhost',
    'https://centcom.thelyceum.io'
  ];

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin || '') ? origin! : '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
