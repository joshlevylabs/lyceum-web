import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      user_id, 
      payment_status, 
      subscription_type, 
      monthly_amount, 
      currency = 'USD',
      next_billing_date,
      notes 
    } = body

    if (!user_id) {
      return NextResponse.json({ success: false, error: 'user_id is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Prepare payment data
    const paymentData: any = {
      user_id,
      payment_status,
      subscription_type,
      currency,
      updated_at: new Date().toISOString()
    }

    if (monthly_amount !== undefined) paymentData.monthly_amount = monthly_amount
    if (next_billing_date) paymentData.next_billing_date = new Date(next_billing_date).toISOString()
    if (notes) paymentData.notes = notes

    // Set last payment date if status is active and it wasn't active before
    if (payment_status === 'active') {
      paymentData.last_payment_date = new Date().toISOString()
      paymentData.payment_failures = 0 // Reset failures on successful payment
    }

    // Upsert payment status
    const { data: paymentResult, error: paymentError } = await supabase
      .from('user_payment_status')
      .upsert([paymentData], { onConflict: 'user_id' })
      .select('*')
      .single()

    if (paymentError) {
      return NextResponse.json({ 
        success: false, 
        error: `Payment update failed: ${paymentError.message}` 
      }, { status: 400 })
    }

    // Create activity log
    try {
      await supabase
        .from('user_activity_logs')
        .insert([{
          user_id,
          activity_type: 'payment_updated',
          description: `Payment status updated to ${payment_status} by admin`,
          metadata: { 
            old_status: 'unknown', // Could fetch previous status if needed
            new_status: payment_status,
            subscription_type,
            monthly_amount 
          }
        }])
    } catch (logError) {
      // Don't fail the main operation if logging fails
      console.warn('Failed to create activity log:', logError)
    }

    return NextResponse.json({ 
      success: true, 
      payment_status: paymentResult,
      message: 'Payment information updated successfully'
    })

  } catch (error: any) {
    console.error('Payment update error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    }, { status: 500 })
  }
}







