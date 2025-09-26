import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { calculateFlexiblePricing, getCurrentUsage } from '@/lib/flexible-pricing';

export async function GET(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Allow custom parameters or use current usage
    const customLicenses = searchParams.get('licenses');
    const customClusters = searchParams.get('clusters');
    const customUsers = searchParams.get('additionalUsers');
    const customStorage = searchParams.get('storageOverageGB');

    let billingParams;

    if (customLicenses || customClusters || customUsers || customStorage) {
      // Use custom parameters
      billingParams = {
        userId: user.id,
        licenses: customLicenses ? JSON.parse(customLicenses) : [],
        clusters: customClusters ? JSON.parse(customClusters) : [],
        additionalUsers: customUsers ? parseInt(customUsers) : 0,
        storageOverageGB: customStorage ? parseFloat(customStorage) : 0,
      };
    } else {
      // Use current usage
      const currentUsage = await getCurrentUsage(user.id);
      billingParams = {
        userId: user.id,
        ...currentUsage,
      };
    }

    const billing = calculateFlexiblePricing(billingParams);

    return NextResponse.json({
      success: true,
      preview: {
        lineItems: billing.lineItems,
        totalAmount: billing.totalAmount,
        monthlyTotal: `$${(billing.totalAmount / 100).toFixed(2)}`,
        summary: billing.summary,
      },
      usage: billingParams,
    });

  } catch (error: any) {
    console.error('Billing preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate billing preview', details: error.message },
      { status: 500 }
    );
  }
}

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
      storageOverageGB = 0
    } = body;

    const billingParams = {
      userId: user.id,
      licenses,
      clusters,
      additionalUsers,
      storageOverageGB,
    };

    const billing = calculateFlexiblePricing(billingParams);

    return NextResponse.json({
      success: true,
      preview: {
        lineItems: billing.lineItems,
        totalAmount: billing.totalAmount,
        monthlyTotal: `$${(billing.totalAmount / 100).toFixed(2)}`,
        summary: billing.summary,
      },
      usage: billingParams,
    });

  } catch (error: any) {
    console.error('Billing preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate billing preview', details: error.message },
      { status: 500 }
    );
  }
}


