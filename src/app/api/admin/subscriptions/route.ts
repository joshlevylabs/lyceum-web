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

    // Build query - use left join for user_profiles so users without profiles still show
    let query = supabaseAdmin
      .from('subscriptions')
      .select(`
        *,
        user:user_id (
          id,
          email,
          user_profiles (
            full_name
          )
        )
      `)
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
      return NextResponse.json(
        { success: false, error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    // Format response with user email
    const formattedSubscriptions = (subscriptions || []).map(sub => ({
      ...sub,
      user_email: sub.user?.email || 'Unknown',
      user_name: sub.user?.user_profiles?.[0]?.full_name || 'Unknown'
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
