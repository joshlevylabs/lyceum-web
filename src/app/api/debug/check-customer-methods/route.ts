import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId') || 'cus_T7ZjWDtzZA3IG6'
    
    console.log('🔍 Check customer methods - Starting for customer:', customerId)

    // Get customer details
    const customer = await stripe.customers.retrieve(customerId)
    console.log('🔍 Customer details:', {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      default_payment_method: customer.invoice_settings?.default_payment_method
    })

    // Get payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })

    console.log('🔍 Payment methods:', paymentMethods.data.length)

    // Get subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
    })

    console.log('🔍 Subscriptions:', subscriptions.data.length)

    return NextResponse.json({
      success: true,
      customerId: customerId,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        default_payment_method: customer.invoice_settings?.default_payment_method
      },
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        last4: pm.card?.last4,
        brand: pm.card?.brand,
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year,
        is_default: customer.invoice_settings?.default_payment_method === pm.id
      })),
      paymentMethodsCount: paymentMethods.data.length,
      subscriptions: subscriptions.data.map(sub => ({
        id: sub.id,
        status: sub.status,
        current_period_end: sub.current_period_end
      })),
      subscriptionsCount: subscriptions.data.length
    })

  } catch (error: any) {
    console.error('🔍 Check customer methods - Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: `Error checking customer: ${error.message}` 
    }, { status: 500 })
  }
}
