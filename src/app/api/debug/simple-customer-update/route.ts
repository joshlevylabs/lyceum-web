import { NextRequest, NextResponse } from 'next/server';
import * as dbOperations from '@/lib/supabase-direct';

export async function GET(request: NextRequest) {
  try {
    // For joshual@sonance.com, we'll use the existing admin customer
    // since that's where the payment methods are
    const updates = [
      {
        email: 'josh@thelyceum.io',
        customerId: 'cus_T7ZjWDtzZA3IG6'
      },
      {
        email: 'joshual@sonance.com', 
        customerId: 'cus_T7ZjWDtzZA3IG6' // Use same customer for testing
      }
    ];

    const results = [];

    for (const update of updates) {
      try {
        const result = await dbOperations.supabaseAdmin
          .from('user_profiles')
          .update({
            stripe_customer_id: update.customerId,
            subscription_status: 'setup_complete',
            updated_at: new Date().toISOString(),
          })
          .eq('email', update.email)
          .select('email, stripe_customer_id, subscription_status');

        results.push({
          email: update.email,
          success: !result.error,
          error: result.error?.message,
          data: result.data
        });
      } catch (err) {
        results.push({
          email: update.email,
          success: false,
          error: err.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Batch customer ID update completed',
      results
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Batch update failed', details: error.message },
      { status: 500 }
    );
  }
}
