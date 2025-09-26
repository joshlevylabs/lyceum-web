import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { UsageTrackingService } from '@/lib/billing-service';
import { calculateFlexiblePricing } from '@/lib/flexible-pricing';

/**
 * Get current usage data for a user
 * GET /api/billing/usage?user_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Get usage data - Starting request');
    
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || user.id;
    const includeEstimate = searchParams.get('include_estimate') !== 'false';

    // Admin check for cross-user access
    if (userId !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access to other user usage data' },
        { status: 403 }
      );
    }

    console.log('📊 Getting usage data for user:', userId);

    // Get current usage
    const usage = await UsageTrackingService.getCurrentUsage(userId);

    let estimatedCost = null;
    if (includeEstimate) {
      // Calculate estimated monthly cost
      const { lineItems, totalAmount, summary } = calculateFlexiblePricing({
        licenses: usage.licenses,
        clusters: usage.clusters,
        additionalUsers: usage.additionalUsers,
        storageOverageGB: usage.storageOverageGB
      });

      estimatedCost = {
        total_cents: totalAmount,
        total_dollars: totalAmount / 100,
        line_items: lineItems.map(item => ({
          ...item,
          unit_price_dollars: item.unitPrice / 100,
          total_price_dollars: item.totalPrice / 100
        })),
        summary
      };
    }

    console.log('✅ Usage data retrieved for user:', userId);

    return NextResponse.json({
      success: true,
      data: {
        user_id: userId,
        usage,
        estimated_monthly_cost: estimatedCost,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('📊 Get usage data - Error:', error);
    return NextResponse.json(
      { error: 'Failed to get usage data', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Create a usage snapshot (admin only)
 * POST /api/billing/usage
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📸 Create usage snapshot - Starting request');
    
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response;
    }

    // Admin only for manual snapshots
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_id, billing_period_id } = body;

    if (!user_id || !billing_period_id) {
      return NextResponse.json(
        { error: 'user_id and billing_period_id are required' },
        { status: 400 }
      );
    }

    console.log('📸 Creating usage snapshot for user:', user_id, 'period:', billing_period_id);

    // Create usage snapshot
    const snapshot = await UsageTrackingService.createUsageSnapshot(user_id, billing_period_id);

    console.log('✅ Usage snapshot created');

    return NextResponse.json({
      success: true,
      message: 'Usage snapshot created successfully',
      data: { snapshot }
    });

  } catch (error: any) {
    console.error('📸 Create usage snapshot - Error:', error);
    return NextResponse.json(
      { error: 'Failed to create usage snapshot', details: error.message },
      { status: 500 }
    );
  }
}