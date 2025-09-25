import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { createFlexibleCheckoutSession, FlexibleBillingParams } from '@/lib/flexible-pricing';
import * as dbOperations from '@/lib/supabase-direct';

export async function POST(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      licenses = [],
      clusters = [],
      additionalUsers = 0,
      storageOverageGB = 0,
      metadata = {}
    } = body;

    // Get user key for cancel URL (same logic as setup-intent)
    let userKey = user.id; // Fallback to UUID
    try {
      const { data: allUsers } = await dbOperations.supabaseAdmin
        .from('user_profiles')
        .select('id, created_at')
        .order('created_at', { ascending: true });
      
      if (allUsers) {
        const userIndex = allUsers.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
          userKey = `USER-${userIndex + 1}`;
        }
      }
    } catch (error) {
      console.error('Error resolving user key:', error);
    }

    const billingParams: FlexibleBillingParams = {
      userId: user.id,
      licenses,
      clusters,
      additionalUsers,
      storageOverageGB,
      metadata: {
        ...metadata,
        userEmail: user.email,
        userKey,
      },
    };

    const origin = request.headers.get('origin') || 'http://localhost:3594';
    const session = await createFlexibleCheckoutSession({
      billingParams,
      customerEmail: user.email,
      successUrl: `${origin}/admin/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/admin/users/${userKey}/profile?tab=payment`,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });

  } catch (error: any) {
    console.error('Flexible checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create flexible checkout session', details: error.message },
      { status: 500 }
    );
  }
}
