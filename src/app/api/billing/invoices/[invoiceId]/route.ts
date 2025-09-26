import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import * as dbOperations from '@/lib/supabase-direct';

/**
 * Get a specific invoice by ID
 * GET /api/billing/invoices/[invoiceId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
    console.log('🧾 Get invoice details - Starting for:', invoiceId);
    
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response;
    }

    // Get invoice with line items (avoiding user_profiles JOIN due to missing FK)
    const { data: invoice, error } = await dbOperations.supabaseAdmin
      .from('invoices')
      .select(`
        *,
        billing_periods (
          period_label,
          period_start,
          period_end,
          status
        ),
        invoice_line_items (
          *
        )
      `)
      .eq('id', invoiceId)
      .single();

    // Get user profile separately if needed
    let userProfile = null;
    if (invoice && invoice.user_id) {
      const { data: profile } = await dbOperations.supabaseAdmin
        .from('user_profiles')
        .select('email, full_name, company')
        .eq('id', invoice.user_id)
        .single();
      userProfile = profile;
    }

    if (error) {
      console.error('❌ Error fetching invoice:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Check access permissions
    if (invoice.user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access to this invoice' },
        { status: 403 }
      );
    }

    // Format response with dollar amounts
    const formattedInvoice = {
      ...invoice,
      subtotal_dollars: invoice.subtotal_cents / 100,
      tax_dollars: invoice.tax_cents / 100,
      total_dollars: invoice.total_cents / 100,
      user_profile: userProfile,
      line_items: invoice.invoice_line_items?.map((item: any) => ({
        ...item,
        unit_price_dollars: item.unit_price_cents / 100,
        total_price_dollars: item.total_price_cents / 100
      })) || []
    };

    console.log('✅ Invoice details retrieved:', invoiceId);

    return NextResponse.json({
      success: true,
      data: { invoice: formattedInvoice }
    });

  } catch (error: any) {
    console.error('🧾 Get invoice details - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice details', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Update invoice status
 * PATCH /api/billing/invoices/[invoiceId]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
    console.log('🧾 Update invoice - Starting for:', invoiceId);
    
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response;
    }

    const body = await request.json();
    const { status, payment_date, stripe_payment_intent_id, payment_method_last4, payment_method_brand } = body;

    // Get current invoice to check permissions
    const { data: currentInvoice, error: getError } = await dbOperations.supabaseAdmin
      .from('invoices')
      .select('user_id')
      .eq('id', invoiceId)
      .single();

    if (getError) {
      if (getError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      throw getError;
    }

    // Check permissions (admin or invoice owner)
    if (currentInvoice.user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access to this invoice' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (status) updateData.status = status;
    if (payment_date) updateData.paid_date = payment_date;
    if (stripe_payment_intent_id) updateData.stripe_payment_intent_id = stripe_payment_intent_id;
    if (payment_method_last4) updateData.payment_method_last4 = payment_method_last4;
    if (payment_method_brand) updateData.payment_method_brand = payment_method_brand;

    // Update invoice
    const { data: updatedInvoice, error: updateError } = await dbOperations.supabaseAdmin
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating invoice:', updateError);
      throw updateError;
    }

    console.log('✅ Invoice updated:', invoiceId, 'New status:', status);

    return NextResponse.json({
      success: true,
      message: 'Invoice updated successfully',
      data: { invoice: updatedInvoice }
    });

  } catch (error: any) {
    console.error('🧾 Update invoice - Error:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice', details: error.message },
      { status: 500 }
    );
  }
}


