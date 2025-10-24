import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * DEBUG ENDPOINT: Check license queries for a user
 * GET /api/centcom/auth/debug-licenses?user_id=USER_ID
 *
 * This endpoint tests all the license queries to see why the login endpoint
 * might not be returning license data.
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin')
  const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'null']
  const corsOrigin = allowedOrigins.includes(origin || 'null') ? (origin || '*') : 'http://localhost:3003'

  const headers = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('user_id') || '2c3d4747-8d67-45af-90f5-b5e9058ec246'

    console.log('🔍 DEBUG: Checking licenses for user:', userId)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const serviceSupabase = createClient(supabaseUrl, serviceKey)

    // Test 0: license_keys table query (PRIMARY METHOD)
    console.log('📊 Test 0: Querying license_keys table with assigned_to')
    const { data: licenseKeys, error: licenseKeysError } = await serviceSupabase
      .from('license_keys')
      .select('*')
      .eq('assigned_to', userId)
      .eq('status', 'active')

    const test0Result = {
      success: !licenseKeysError,
      error: licenseKeysError?.message || null,
      count: licenseKeys?.length || 0,
      licenses: licenseKeys || []
    }
    console.log('✅ Test 0 result:', test0Result.count, 'licenses from license_keys')

    // Test 1: Direct licenses table query (ALTERNATIVE TABLE)
    console.log('📊 Test 1: Querying licenses table with user_id')
    const { data: directLicenses, error: directError } = await serviceSupabase
      .from('licenses')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')

    const test1Result = {
      success: !directError,
      error: directError?.message || null,
      count: directLicenses?.length || 0,
      licenses: directLicenses || []
    }
    console.log('✅ Test 1 result:', test1Result.count, 'licenses from licenses table')

    // Test 2: user_license_assignments query
    console.log('📊 Test 2: Querying user_license_assignments table')
    const { data: assignedLicenses, error: assignmentError } = await serviceSupabase
      .from('user_license_assignments')
      .select(`
        *,
        licenses (*)
      `)
      .eq('user_id', userId)
      .is('revoked_at', null)

    const test2Result = {
      success: !assignmentError,
      error: assignmentError?.message || null,
      count: assignedLicenses?.length || 0,
      assignments: assignedLicenses || []
    }
    console.log('✅ Test 2 result:', test2Result.count, 'assignments')

    // Test 3: Check if tables exist
    console.log('📊 Test 3: Checking table existence')
    const { data: tablesData } = await serviceSupabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['licenses', 'user_license_assignments'])

    // Test 4: Get ALL licenses (to see what's in the table)
    console.log('📊 Test 4: Fetching all recent licenses')
    const { data: allLicenses } = await serviceSupabase
      .from('licenses')
      .select('id, key_code, user_id, license_type, status')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10)

    const test4Result = {
      count: allLicenses?.length || 0,
      licenses: allLicenses?.map(l => ({
        key_code: l.key_code,
        user_id: l.user_id,
        matches_target: l.user_id === userId
      })) || []
    }

    // Test 5: Check user exists
    console.log('📊 Test 5: Checking if user exists')
    const { data: userData, error: userError } = await serviceSupabase.auth.admin.getUserById(userId)

    const test5Result = {
      success: !userError,
      error: userError?.message || null,
      user_email: userData?.user?.email || null
    }

    // Summary
    const summary = {
      user_id: userId,
      user_exists: test5Result.success,
      user_email: test5Result.user_email,
      license_keys_count: test0Result.count,
      direct_licenses_count: test1Result.count,
      assigned_licenses_count: test2Result.count,
      total_licenses_found: test0Result.count + test1Result.count + test2Result.count,
      tables_checked: tablesData || [],
      recent_licenses_in_db: test4Result.count
    }

    console.log('📋 SUMMARY:', summary)

    return NextResponse.json({
      success: true,
      summary,
      test_results: {
        test0_license_keys: test0Result,
        test1_direct_licenses: test1Result,
        test2_assigned_licenses: test2Result,
        test3_tables: tablesData,
        test4_all_recent_licenses: test4Result,
        test5_user_exists: test5Result
      },
      diagnosis: {
        likely_issue: summary.total_licenses_found === 0
          ? 'No licenses found for this user in ANY table (license_keys, licenses, or user_license_assignments)'
          : summary.license_keys_count > 0
          ? 'Licenses found in license_keys table - login endpoint should work now'
          : summary.direct_licenses_count > 0
          ? 'Licenses found in licenses table - login endpoint should work'
          : 'Licenses only in assignments table - login endpoint should work after fix',
        next_steps: summary.total_licenses_found === 0
          ? [
              'Check if user needs license assignment in Lyceum admin panel',
              'Verify user_id is correct: ' + userId,
              'Check if licenses exist but with different status (not active)'
            ]
          : [
              'Login endpoint should now return licenses (fix deployed)',
              'Check Vercel deployment logs for errors if still not working',
              'Test login endpoint directly with curl'
            ]
      }
    }, { headers })

  } catch (error: any) {
    console.error('❌ Debug endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500, headers })
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'null']
  const corsOrigin = allowedOrigins.includes(origin || 'null') ? (origin || '*') : 'http://localhost:3003'

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
