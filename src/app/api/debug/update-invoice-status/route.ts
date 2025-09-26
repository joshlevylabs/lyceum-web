import { NextRequest, NextResponse } from 'next/server';
import * as dbOperations from '@/lib/supabase-direct';

/**
 * Debug endpoint to manually update invoice status
 * POST /api/debug/update-invoice-status
 * 
 * For testing payment webhook functionality without requiring actual webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // Basic authentication
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.CRON_SECRET || 'your-secure-random-string-here';
    
    if (apiKey !== expectedApiKey) {
      console.error('❌ Unauthorized invoice status update request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invoice_id, status, payment_method_last4, payment_method_brand } = body;

    if (!invoice_id || !status) {
      return NextResponse.json({ 
        error: 'Missing required fields: invoice_id, status' 
      }, { status: 400 });
    }

    console.log('🧪 Debug: Updating invoice status', { invoice_id, status });

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'paid') {
      updateData.paid_date = new Date().toISOString();
      if (payment_method_last4) updateData.payment_method_last4 = payment_method_last4;
      if (payment_method_brand) updateData.payment_method_brand = payment_method_brand;
      updateData.stripe_payment_intent_id = `pi_test_${Date.now()}`;
    }

    // Update invoice
    const { data: updatedInvoice, error } = await dbOperations.supabaseAdmin
      .from('invoices')
      .update(updateData)
      .eq('id', invoice_id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating invoice status:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      throw error;
    }

    console.log('✅ Invoice status updated:', invoice_id, '→', status);

    return NextResponse.json({
      success: true,
      message: `Invoice status updated to: ${status}`,
      data: {
        invoice_id,
        old_status: 'sent', // assuming previous status
        new_status: status,
        updated_invoice: updatedInvoice
      }
    });

  } catch (error: any) {
    console.error('❌ Debug invoice status update error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update invoice status'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to list available invoices for testing
 */
export async function GET(request: NextRequest) {
  try {
    // Basic authentication
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.CRON_SECRET || 'your-secure-random-string-here';
    
    if (apiKey !== expectedApiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    let query = dbOperations.supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, status, total_cents, stripe_invoice_id, user_id')
      .order('created_at', { ascending: false })
      .limit(10);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: invoices, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        invoices: invoices?.map(inv => ({
          ...inv,
          total_dollars: inv.total_cents / 100
        })) || [],
        message: 'Use POST with invoice_id and status to update'
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching invoices for debug:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
