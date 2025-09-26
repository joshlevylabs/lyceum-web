import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import * as dbOperations from '@/lib/supabase-direct';

/**
 * Get invoices for a user
 * GET /api/billing/invoices?user_id=xxx&limit=10&status=paid
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧾 Get invoices - Starting request');
    
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || user.id;
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const includeLineItems = searchParams.get('include_line_items') === 'true';

    // Admin check for cross-user access
    if (userId !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access to other user invoices' },
        { status: 403 }
      );
    }

    console.log('🧾 Getting invoices for user:', userId, { limit, status, includeLineItems });

    // Build query
    let query = dbOperations.supabaseAdmin
      .from('invoices')
      .select(`
        *,
        billing_periods (
          period_label,
          period_start,
          period_end
        )
        ${includeLineItems ? ', invoice_line_items (*)' : ''}
      `)
      .eq('user_id', userId)
      .order('invoice_date', { ascending: false })
      .limit(limit);

    // Add status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error('❌ Error fetching invoices:', error);
      throw error;
    }

    // Format response
    const formattedInvoices = invoices?.map(invoice => ({
      ...invoice,
      // Convert cents to dollars for display
      subtotal_dollars: invoice.subtotal_cents / 100,
      tax_dollars: invoice.tax_cents / 100,
      total_dollars: invoice.total_cents / 100,
      // Format line items if included
      line_items: includeLineItems ? invoice.invoice_line_items?.map((item: any) => ({
        ...item,
        unit_price_dollars: item.unit_price_cents / 100,
        total_price_dollars: item.total_price_cents / 100
      })) : undefined
    }));

    console.log('✅ Found invoices:', formattedInvoices?.length);

    return NextResponse.json({
      success: true,
      data: {
        invoices: formattedInvoices,
        count: formattedInvoices?.length || 0
      }
    });

  } catch (error: any) {
    console.error('🧾 Get invoices - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Create a new invoice (admin only)
 * POST /api/billing/invoices
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧾 Create invoice - Starting request');
    
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response;
    }

    // Admin only
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { billing_period_id } = body;

    if (!billing_period_id) {
      return NextResponse.json(
        { error: 'billing_period_id is required' },
        { status: 400 }
      );
    }

    // Generate invoice using the service
    const { InvoiceService } = await import('@/lib/billing-service');
    const invoice = await InvoiceService.generateInvoice(billing_period_id);

    console.log('✅ Invoice created:', invoice.id);

    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully',
      data: { invoice }
    });

  } catch (error: any) {
    console.error('🧾 Create invoice - Error:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice', details: error.message },
      { status: 500 }
    );
  }
}


