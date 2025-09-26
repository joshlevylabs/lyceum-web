import { NextRequest, NextResponse } from 'next/server';
import { BillingService, UsageTrackingService, BillingPeriodService } from '@/lib/billing-service';
import { calculateFlexiblePricing } from '@/lib/flexible-pricing';

// Debug endpoint for testing billing without JWT tokens
// Uses a static API key for easier development testing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = request.headers.get('x-api-key');
    const testUserId = searchParams.get('user_id') || '2c3d4747-8d67-45af-90f5-b5e9058ec246';
    const action = searchParams.get('action') || 'usage';

    // Simple API key check for testing
    const expectedApiKey = process.env.CRON_SECRET || 'debug-key-12345';
    if (apiKey !== expectedApiKey) {
      return NextResponse.json({
        error: 'Invalid API key. Use X-API-Key header with your CRON_SECRET',
        hint: 'Example: -Headers @{"X-API-Key" = "your-cron-secret"}'
      }, { status: 401 });
    }

    switch (action) {
      case 'usage':
        // Get current usage and calculate estimated cost
        const usage = await UsageTrackingService.getCurrentUsage(testUserId);
        const billingParams = {
          licenses: usage.licenses,
          clusters: usage.clusters,
          additionalUsers: usage.additionalUsers,
          storageOverageGB: usage.storageOverageGB
        };
        const estimatedCost = calculateFlexiblePricing(billingParams);
        
        return NextResponse.json({
          success: true,
          action: 'usage',
          data: {
            user_id: testUserId,
            usage,
            estimated_monthly_cost: estimatedCost,
            last_updated: new Date().toISOString()
          }
        });

      case 'invoices':
        const limit = parseInt(searchParams.get('limit') || '5');
        // Get recent invoices using the private method via getBillingSummary
        const billingSummary = await BillingService.getBillingSummary(testUserId);
        return NextResponse.json({
          success: true,
          action: 'invoices', 
          data: { invoices: billingSummary.recentInvoices || [] }
        });

      case 'process':
        try {
          const result = await BillingService.processMonthlyBilling(testUserId);
          return NextResponse.json({
            success: true,
            action: 'process',
            data: result
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            action: 'process',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }, { status: 500 });
        }

      case 'setup':
        // Create or get current billing period
        let billingPeriod = await BillingPeriodService.getActiveBillingPeriod(testUserId);
        if (!billingPeriod) {
          billingPeriod = await BillingPeriodService.createBillingPeriod(testUserId);
        }
        return NextResponse.json({
          success: true,
          action: 'setup',
          data: { billingPeriod }
        });

      default:
        return NextResponse.json({
          success: true,
          available_actions: ['usage', 'invoices', 'process', 'setup'],
          usage: {
            'Get usage': '?action=usage&user_id=USER_ID',
            'List invoices': '?action=invoices&limit=5&user_id=USER_ID',
            'Process billing': '?action=process&user_id=USER_ID',
            'Setup billing': '?action=setup&user_id=USER_ID'
          },
          note: 'Add X-API-Key header with your CRON_SECRET value'
        });
    }
  } catch (error) {
    console.error('❌ Debug billing test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
