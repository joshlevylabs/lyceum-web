import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/lib/billing-service';
import * as dbOperations from '@/lib/supabase-direct';

/**
 * Automated billing cron job endpoint
 * POST /api/billing/automated-billing
 * 
 * This should be called by a cron service (Vercel Cron, GitHub Actions, etc.)
 * to process monthly billing for all users with active billing periods.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🤖 Automated billing - Starting batch process');

  // Basic authentication for cron jobs
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'your-secret-here';
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('❌ Unauthorized cron job request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    processed: 0,
    errors: 0,
    skipped: 0,
    invoices_generated: 0,
    total_amount_cents: 0,
    processing_time_ms: 0
  };

  try {
    // Get all users with active billing periods that are ready for billing
    const { data: readyPeriods, error: periodError } = await dbOperations.supabaseAdmin
      .from('billing_periods')
      .select(`
        *,
        user_profiles (
          email,
          full_name
        )
      `)
      .eq('status', 'active')
      .lt('period_end', new Date().toISOString()); // Past end date

    if (periodError) {
      throw new Error(`Failed to get billing periods: ${periodError.message}`);
    }

    console.log(`📋 Found ${readyPeriods?.length || 0} billing periods ready for processing`);

    if (!readyPeriods || readyPeriods.length === 0) {
      console.log('✅ No billing periods ready for processing');
      return NextResponse.json({
        success: true,
        message: 'No billing periods ready for processing',
        results
      });
    }

    // Process each billing period
    for (const period of readyPeriods) {
      try {
        console.log(`💰 Processing billing for user: ${period.user_profiles?.email} (${period.user_id})`);
        
        const result = await BillingService.processMonthlyBilling(period.user_id);
        
        results.processed++;
        results.invoices_generated++;
        results.total_amount_cents += result.invoice.total_cents;

        // Log successful processing
        await logAutomationEvent({
          event_type: 'automated_billing_success',
          event_status: 'success',
          user_id: period.user_id,
          billing_period_id: result.billingPeriod.id,
          invoice_id: result.invoice.id,
          trigger_type: 'scheduled',
          processor: 'automated_billing_cron',
          event_data: {
            period_label: period.period_label,
            invoice_number: result.invoice.invoice_number,
            total_cents: result.invoice.total_cents
          }
        });

        console.log(`✅ Billing processed for ${period.user_profiles?.email}`);

      } catch (error: any) {
        console.error(`❌ Error processing billing for user ${period.user_id}:`, error);
        
        results.errors++;

        // Log error
        await logAutomationEvent({
          event_type: 'automated_billing_error',
          event_status: 'error',
          user_id: period.user_id,
          billing_period_id: period.id,
          trigger_type: 'scheduled',
          processor: 'automated_billing_cron',
          error_message: error.message,
          event_data: {
            period_label: period.period_label,
            error: error.message
          }
        });

        // Continue processing other users
        continue;
      }
    }

    // Also check for overdue invoices that need follow-up
    await processOverdueInvoices();

    results.processing_time_ms = Date.now() - startTime;

    console.log('🎉 Automated billing batch complete:', results);

    return NextResponse.json({
      success: true,
      message: 'Automated billing batch completed',
      results
    });

  } catch (error: any) {
    console.error('🤖 Automated billing - Fatal error:', error);
    
    results.processing_time_ms = Date.now() - startTime;

    // Log fatal error
    await logAutomationEvent({
      event_type: 'automated_billing_fatal',
      event_status: 'error',
      trigger_type: 'scheduled',
      processor: 'automated_billing_cron',
      error_message: error.message,
      event_data: {
        results,
        error: error.message
      }
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Automated billing failed', 
        details: error.message,
        results 
      },
      { status: 500 }
    );
  }
}

/**
 * Process overdue invoices for follow-up actions
 */
async function processOverdueInvoices() {
  console.log('📋 Processing overdue invoices...');

  try {
    // Get invoices that are overdue (past due date and not paid)
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 7); // 7 days past due

    const { data: overdueInvoices, error } = await dbOperations.supabaseAdmin
      .from('invoices')
      .select(`
        *,
        user_profiles (
          email,
          full_name
        )
      `)
      .in('status', ['sent', 'overdue'])
      .lt('due_date', overdueDate.toISOString());

    if (error) {
      console.error('❌ Error fetching overdue invoices:', error);
      return;
    }

    if (!overdueInvoices || overdueInvoices.length === 0) {
      console.log('✅ No overdue invoices found');
      return;
    }

    console.log(`📋 Found ${overdueInvoices.length} overdue invoices`);

    for (const invoice of overdueInvoices) {
      try {
        // Update status to overdue if not already
        if (invoice.status !== 'overdue') {
          await dbOperations.supabaseAdmin
            .from('invoices')
            .update({ status: 'overdue' })
            .eq('id', invoice.id);
        }

        // Log overdue status
        await logAutomationEvent({
          event_type: 'invoice_overdue',
          event_status: 'warning',
          user_id: invoice.user_id,
          invoice_id: invoice.id,
          trigger_type: 'scheduled',
          processor: 'automated_billing_cron',
          event_data: {
            invoice_number: invoice.invoice_number,
            days_overdue: Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)),
            total_cents: invoice.total_cents
          }
        });

        // TODO: Send overdue notification email
        // TODO: Implement account suspension logic if needed

      } catch (error) {
        console.error(`❌ Error processing overdue invoice ${invoice.id}:`, error);
      }
    }

  } catch (error) {
    console.error('❌ Error in processOverdueInvoices:', error);
  }
}

/**
 * Get billing automation status and logs
 * GET /api/billing/automated-billing?limit=100&status=error
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Get automation status - Starting request');

    // Basic authentication for monitoring
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-here';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized monitoring request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const eventType = searchParams.get('event_type');

    // Build query
    let query = dbOperations.supabaseAdmin
      .from('billing_automation_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('event_status', status);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: logs, error } = await query;

    if (error) {
      throw error;
    }

    // Get summary statistics
    const { data: summary, error: summaryError } = await dbOperations.supabaseAdmin
      .from('billing_automation_log')
      .select('event_status, event_type')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    const stats = {
      last_24h_total: summary?.length || 0,
      last_24h_errors: summary?.filter(s => s.event_status === 'error').length || 0,
      last_24h_success: summary?.filter(s => s.event_status === 'success').length || 0
    };

    return NextResponse.json({
      success: true,
      data: {
        logs,
        stats,
        count: logs?.length || 0
      }
    });

  } catch (error: any) {
    console.error('📊 Get automation status - Error:', error);
    return NextResponse.json(
      { error: 'Failed to get automation status', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to log automation events
async function logAutomationEvent(event: {
  event_type: string;
  event_status: 'success' | 'error' | 'warning';
  user_id?: string;
  billing_period_id?: string;
  invoice_id?: string;
  trigger_type: string;
  processor: string;
  error_message?: string;
  event_data?: any;
  processing_time_ms?: number;
}) {
  try {
    await dbOperations.supabaseAdmin
      .from('billing_automation_log')
      .insert({
        ...event,
        processing_time_ms: event.processing_time_ms || null
      });
  } catch (error) {
    console.error('❌ Failed to log automation event:', error);
  }
}


