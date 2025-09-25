import { NextRequest, NextResponse } from 'next/server';
import * as dbOperations from '@/lib/supabase-direct';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Schema check - Starting')

    // Check the user_profiles table structure
    const { data: profiles, error: profilesError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (profilesError) {
      console.error('🔍 Schema check - Error fetching profiles:', profilesError);
      return NextResponse.json({ 
        error: 'Failed to fetch profiles',
        details: profilesError.message 
      }, { status: 500 });
    }

    const profileSample = profiles?.[0] || {};
    const profileColumns = Object.keys(profileSample);

    console.log('🔍 Schema check - Profile columns:', profileColumns);

    // Check if stripe_customer_id column exists
    const hasStripeCustomerId = profileColumns.includes('stripe_customer_id');
    const hasSubscriptionStatus = profileColumns.includes('subscription_status');
    const hasSubscriptionId = profileColumns.includes('subscription_id');

    return NextResponse.json({
      success: true,
      profileColumns,
      columnChecks: {
        hasStripeCustomerId,
        hasSubscriptionStatus,
        hasSubscriptionId
      },
      profileSample: profileSample,
      supabaseAdminAvailable: !!dbOperations.supabaseAdmin
    });

  } catch (error: any) {
    console.error('🔍 Schema check - Error:', error);
    return NextResponse.json(
      { error: 'Schema check failed', details: error.message },
      { status: 500 }
    );
  }
}
