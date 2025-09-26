import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { BillingService } from '@/lib/billing-service';

/**
 * Process monthly billing for a user
 * POST /api/billing/process-monthly
 */
export async function POST(request: NextRequest) {
  try {
    console.log('💰 Monthly billing process - Starting request');
    
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response;
    }

    // Get request body
    const body = await request.json();
    const { user_id, force = false } = body;

    // Determine target user ID (admin can process for other users)
    let targetUserId = user.id;
    if (user_id && user.role === 'admin') {
      targetUserId = user_id;
      console.log('🔑 Admin processing billing for user:', user_id);
    }

    console.log('💰 Processing monthly billing for user:', targetUserId);

    // Process monthly billing
    const result = await BillingService.processMonthlyBilling(targetUserId);

    // Log billing event
    await logBillingEvent({
      event_type: 'invoice_generated',
      event_status: 'success',
      user_id: targetUserId,
      billing_period_id: result.billingPeriod.id,
      invoice_id: result.invoice.id,
      trigger_type: 'api_request',
      processor: `user_${user.id}`,
      event_data: {
        invoice_number: result.invoice.invoice_number,
        total_cents: result.invoice.total_cents,
        period_label: result.billingPeriod.period_label
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Monthly billing processed successfully',
      data: {
        billing_period: result.billingPeriod,
        invoice: result.invoice
      }
    });

  } catch (error: any) {
    console.error('💰 Monthly billing process - Error:', error);
    
    // Log error event
    const body = await request.json().catch(() => ({}));
    const targetUserId = body.user_id || 'unknown';
    
    await logBillingEvent({
      event_type: 'invoice_generated',
      event_status: 'error',
      user_id: targetUserId,
      trigger_type: 'api_request',
      processor: 'api_error',
      error_message: error.message,
      event_data: { error: error.message }
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process monthly billing', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Get billing processing status for a user
 * GET /api/billing/process-monthly?user_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || user.id;

    // Admin check for cross-user access
    if (userId !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access to other user data' },
        { status: 403 }
      );
    }

    // Get billing summary
    const summary = await BillingService.getBillingSummary(userId);

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error: any) {
    console.error('💰 Billing summary - Error:', error);
    return NextResponse.json(
      { error: 'Failed to get billing summary', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to log billing events
async function logBillingEvent(event: {
  event_type: string;
  event_status: 'success' | 'error' | 'warning';
  user_id: string;
  billing_period_id?: string;
  invoice_id?: string;
  trigger_type: string;
  processor: string;
  error_message?: string;
  event_data?: any;
}) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    await supabase
      .from('billing_automation_log')
      .insert(event);
      
  } catch (error) {
    console.error('❌ Failed to log billing event:', error);
  }
}


