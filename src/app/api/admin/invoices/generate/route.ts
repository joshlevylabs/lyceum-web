import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, billing_period_start, billing_period_end } = body

    if (!user_id) {
      return NextResponse.json({ success: false, error: 'user_id is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get user subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active subscription found for user' 
      }, { status: 400 })
    }

    // Calculate billing period
    const periodStart = billing_period_start ? new Date(billing_period_start) : new Date(subscription.current_period_start)
    const periodEnd = billing_period_end ? new Date(billing_period_end) : new Date(subscription.current_period_end)

    // Generate invoice number
    const { data: invoiceNumberResult, error: invoiceNumberError } = await supabase
      .rpc('generate_invoice_number')

    if (invoiceNumberError) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed to generate invoice number: ${invoiceNumberError.message}` 
      }, { status: 400 })
    }

    const invoiceNumber = invoiceNumberResult

    // Calculate amounts
    const subtotal = subscription.monthly_amount
    const taxRate = 0.0875 // 8.75% tax rate (configurable)
    const taxAmount = subtotal * taxRate
    const totalAmount = subtotal + taxAmount

    // Create invoice
    const invoiceData = {
      user_id,
      subscription_id: subscription.id,
      invoice_number: invoiceNumber,
      status: 'pending',
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      currency: subscription.currency || 'USD',
      billing_period_start: periodStart.toISOString(),
      billing_period_end: periodEnd.toISOString(),
      issue_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      notes: `Invoice for ${subscription.custom_plan_name} subscription`
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([invoiceData])
      .select('*')
      .single()

    if (invoiceError) {
      return NextResponse.json({ 
        success: false, 
        error: `Invoice creation failed: ${invoiceError.message}` 
      }, { status: 400 })
    }

    // Add line items
    const lineItems = [
      {
        invoice_id: invoice.id,
        item_type: 'subscription',
        description: `${subscription.custom_plan_name} subscription (${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()})`,
        quantity: 1,
        unit_price: subtotal,
        total_price: subtotal,
        metadata: {
          subscription_id: subscription.id,
          billing_cycle: subscription.billing_cycle
        }
      },
      {
        invoice_id: invoice.id,
        item_type: 'tax',
        description: 'Sales Tax',
        quantity: 1,
        unit_price: taxAmount,
        total_price: taxAmount,
        metadata: {
          tax_rate: taxRate
        }
      }
    ]

    // Get usage overages if any
    const { data: usageBilling } = await supabase
      .from('usage_billing')
      .select('*')
      .eq('user_id', user_id)
      .gte('billing_period_start', periodStart.toISOString())
      .lte('billing_period_end', periodEnd.toISOString())

    if (usageBilling && usageBilling.length > 0) {
      usageBilling.forEach(usage => {
        if (usage.overage_charge > 0) {
          lineItems.push({
            invoice_id: invoice.id,
            item_type: 'overage',
            description: `${usage.usage_type} overage (${usage.overage_amount} units)`,
            quantity: usage.overage_amount,
            unit_price: usage.overage_rate,
            total_price: usage.overage_charge,
            metadata: {
              usage_type: usage.usage_type,
              included_amount: usage.included_amount,
              used_amount: usage.used_amount
            }
          })
        }
      })
    }

    const { error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .insert(lineItems)

    if (lineItemsError) {
      console.warn('Failed to create line items:', lineItemsError)
    }

    // Create activity log
    try {
      await supabase
        .from('user_activity_logs')
        .insert([{
          user_id,
          activity_type: 'invoice_generated',
          description: `Invoice ${invoiceNumber} generated by admin`,
          metadata: { 
            invoice_id: invoice.id,
            invoice_number: invoiceNumber,
            amount: totalAmount
          }
        }])
    } catch (logError) {
      console.warn('Failed to create activity log:', logError)
    }

    return NextResponse.json({ 
      success: true, 
      invoice,
      line_items: lineItems,
      message: `Invoice ${invoiceNumber} generated successfully`
    })

  } catch (error: any) {
    console.error('Invoice generation error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    }, { status: 500 })
  }
}
