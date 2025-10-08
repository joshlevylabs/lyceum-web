import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { stripe } from '@/lib/stripe'
import * as dbOperations from '@/lib/supabase-direct'

/**
 * Get payment information for a user
 * GET /api/billing/payment-info
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id') || user.id

    // Check if user can access this information
    if (userId !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    // Get user profile with Stripe customer ID
    const { data: userProfile, error: profileError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, stripe_customer_id')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // If no Stripe customer ID, return basic info
    if (!userProfile.stripe_customer_id) {
      return NextResponse.json({
        success: true,
        data: {
          user_id: userId,
          email: userProfile.email,
          stripe_customer_id: null,
          has_payment_method: false,
          payment_methods: [],
          recent_invoices: []
        }
      })
    }

    // Fetch Stripe customer details
    let stripeCustomer
    let paymentMethods: any[] = []
    try {
      stripeCustomer = await stripe.customers.retrieve(userProfile.stripe_customer_id)
      
      // Fetch payment methods
      const paymentMethodsList = await stripe.paymentMethods.list({
        customer: userProfile.stripe_customer_id,
        type: 'card'
      })
      
      paymentMethods = paymentMethodsList.data.map(pm => ({
        id: pm.id,
        card: {
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          exp_month: pm.card?.exp_month,
          exp_year: pm.card?.exp_year
        },
        is_default: (stripeCustomer as any).invoice_settings?.default_payment_method === pm.id
      }))
    } catch (stripeError) {
      console.error('Error fetching Stripe data:', stripeError)
      // Continue with basic info if Stripe fails
    }

    // Fetch recent invoices from our database
    const { data: invoices, error: invoicesError } = await dbOperations.supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, total_amount_cents, status, created_at, due_date')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      data: {
        user_id: userId,
        email: userProfile.email,
        stripe_customer_id: userProfile.stripe_customer_id,
        has_payment_method: paymentMethods.length > 0,
        payment_methods: paymentMethods,
        recent_invoices: invoices || [],
        customer_details: stripeCustomer ? {
          name: (stripeCustomer as any).name,
          email: (stripeCustomer as any).email,
          balance: (stripeCustomer as any).balance,
          currency: (stripeCustomer as any).currency
        } : null
      }
    })

  } catch (error: any) {
    console.error('Error fetching payment info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment information', details: error.message },
      { status: 500 }
    )
  }
}

