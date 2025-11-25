import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-direct';

/**
 * GET /api/admin/subscriptions
 * Get all subscriptions (unified native app and plugin subscriptions)
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const subscription_type = searchParams.get('subscription_type');
    const subscription_category = searchParams.get('subscription_category');
    const plugin_type = searchParams.get('plugin_type');
    const search = searchParams.get('search');

    // Build query - get subscriptions first
    let query = supabaseAdmin
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (subscription_type && subscription_type !== 'all') {
      query = query.eq('subscription_type', subscription_type);
    }

    if (subscription_category && subscription_category !== 'all') {
      query = query.eq('subscription_category', subscription_category);
    }

    if (plugin_type && plugin_type !== 'all') {
      query = query.eq('plugin_type', plugin_type);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Error fetching subscriptions:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { success: false, error: 'Failed to fetch subscriptions', details: error.message },
        { status: 500 }
      );
    }

    // Get unique user IDs
    const userIds = [...new Set(subscriptions?.map(sub => sub.user_id) || [])];

    // Fetch user emails from auth.users (service role can access this)
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
    }

    // Create a map of user_id -> email
    const userEmailMap: Record<string, string> = {};
    authUsers?.users.forEach(user => {
      if (user.id && user.email) {
        userEmailMap[user.id] = user.email;
      }
    });

    // Get user profiles for names
    const { data: profiles } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name')
      .in('id', userIds);

    const userNameMap: Record<string, string> = {};
    profiles?.forEach(profile => {
      if (profile.id && profile.full_name) {
        userNameMap[profile.id] = profile.full_name;
      }
    });

    // Format response with user email and name
    const formattedSubscriptions = (subscriptions || []).map(sub => ({
      ...sub,
      user_email: userEmailMap[sub.user_id] || 'Unknown',
      user_name: userNameMap[sub.user_id] || 'Unknown'
    }));

    // Apply search filter (client-side since it's across multiple fields)
    let filteredSubscriptions = formattedSubscriptions;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSubscriptions = formattedSubscriptions.filter(sub =>
        sub.subscription_key?.toLowerCase().includes(searchLower) ||
        sub.user_email?.toLowerCase().includes(searchLower) ||
        sub.user_name?.toLowerCase().includes(searchLower) ||
        sub.plugin_type?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      subscriptions: filteredSubscriptions,
      count: filteredSubscriptions.length
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/subscriptions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/subscriptions
 * Delete a subscription
 */
export async function DELETE(request: NextRequest) {
  try {
    const { subscription_id } = await request.json();

    if (!subscription_id) {
      return NextResponse.json(
        { success: false, error: 'subscription_id is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('id', subscription_id);

    if (error) {
      console.error('Error deleting subscription:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/subscriptions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
