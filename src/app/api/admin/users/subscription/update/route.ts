import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      user_id, 
      plan_name, 
      status, 
      billing_cycle, 
      monthly_amount, 
      cancel_at_period_end = false,
      trial_end_date,
      notes 
    } = body

    if (!user_id) {
      return NextResponse.json({ success: false, error: 'user_id is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get current subscription to log changes
    const { data: currentSub } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .single()

    // Calculate period end date based on billing cycle
    const currentDate = new Date()
    let periodEnd = new Date(currentDate)
    
    if (billing_cycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    } else if (billing_cycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1) // Default to monthly
    }

    // Prepare subscription data
    const subscriptionData: any = {
      user_id,
      custom_plan_name: plan_name,
      status,
      billing_cycle,
      monthly_amount,
      cancel_at_period_end,
      current_period_start: currentDate.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString()
    }

    if (trial_end_date) {
      subscriptionData.trial_end_date = new Date(trial_end_date).toISOString()
    }

    if (status === 'cancelled' && !subscriptionData.cancelled_at) {
      subscriptionData.cancelled_at = new Date().toISOString()
    }

    // Upsert subscription
    const { data: subscriptionResult, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert([subscriptionData], { onConflict: 'user_id' })
      .select('*')
      .single()

    if (subscriptionError) {
      return NextResponse.json({ 
        success: false, 
        error: `Subscription update failed: ${subscriptionError.message}` 
      }, { status: 400 })
    }

    // Log subscription change
    try {
      const changeType = !currentSub ? 'created' : 
                        currentSub.status !== status ? (status === 'cancelled' ? 'cancelled' : 'updated') :
                        currentSub.monthly_amount !== monthly_amount ? 'updated' : 'updated'

      await supabase
        .from('subscription_change_log')
        .insert([{
          user_id,
          subscription_id: subscriptionResult.id,
          change_type: changeType,
          old_plan: currentSub?.custom_plan_name || null,
          new_plan: plan_name,
          old_amount: currentSub?.monthly_amount || null,
          new_amount: monthly_amount,
          reason: notes || `Subscription ${changeType} by admin`
        }])
    } catch (logError) {
      console.warn('Failed to create subscription change log:', logError)
    }

    // Update payment status based on subscription status
    try {
      const paymentStatus = status === 'active' ? 'active' : 
                           status === 'cancelled' ? 'cancelled' : 
                           status === 'suspended' ? 'suspended' : 'pending'

      await supabase
        .from('user_payment_status')
        .upsert([{
          user_id,
          payment_status: paymentStatus,
          subscription_type: plan_name.toLowerCase(),
          monthly_amount,
          next_billing_date: periodEnd.toISOString(),
          updated_at: new Date().toISOString()
        }], { onConflict: 'user_id' })
    } catch (paymentError) {
      console.warn('Failed to update payment status:', paymentError)
    }

    // Create activity log
    try {
      await supabase
        .from('user_activity_logs')
        .insert([{
          user_id,
          activity_type: 'subscription_updated',
          description: `Subscription updated: ${plan_name} (${status}) by admin`,
          metadata: { 
            plan_name,
            status,
            billing_cycle,
            monthly_amount,
            change_type: !currentSub ? 'created' : 'updated'
          }
        }])
    } catch (logError) {
      console.warn('Failed to create activity log:', logError)
    }

    return NextResponse.json({ 
      success: true, 
      subscription: subscriptionResult,
      message: 'Subscription updated successfully'
    })

  } catch (error: any) {
    console.error('Subscription update error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    }, { status: 500 })
  }
}





