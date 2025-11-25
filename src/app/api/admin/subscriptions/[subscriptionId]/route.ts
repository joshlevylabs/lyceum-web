import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-direct';

/**
 * GET /api/admin/subscriptions/[subscriptionId]
 * Get details for a specific subscription
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const { subscriptionId } = params;

    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    // Fetch subscription
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (error) {
      console.error('Error fetching subscription:', error);
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Fetch user email from auth.users
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userEmailMap: Record<string, string> = {};
    authUsers?.users.forEach(user => {
      if (user.id && user.email) {
        userEmailMap[user.id] = user.email;
      }
    });

    // Fetch user profile for name
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', subscription.user_id)
      .single();

    // Enrich subscription data
    const enrichedSubscription = {
      ...subscription,
      user_email: userEmailMap[subscription.user_id] || 'Unknown',
      user_name: profile?.full_name || 'Unknown'
    };

    return NextResponse.json({
      success: true,
      subscription: enrichedSubscription
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/subscriptions/[subscriptionId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
