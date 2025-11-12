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
    const { success, user, error: authError, response: authResponse } = await requireAuth(request)
    if (!success || !user) {
      return authResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id') || user.id

    // Check if user can access this information
    if (userId !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    // Get user from auth.users for email
    const { data: { user: authUser }, error: authUserError } = await dbOperations.supabaseAdmin.auth.admin.getUserById(userId)

    if (authUserError || !authUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Try to get user profile (optional - don't fail if missing)
    const { data: userProfile } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, stripe_customer_id')
      .eq('id', userId)
      .single()

    // Fetch stored payment methods from new payment system
    const { data: storedPaymentMethods, error: spmError } = await dbOperations.supabaseAdmin
      .from('stored_payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (spmError) {
      console.error('Error fetching stored payment methods:', spmError)
    }

    // Format stored payment methods for display
    const paymentMethods = storedPaymentMethods?.map(pm => ({
      id: pm.id,
      card: {
        brand: pm.card_brand,
        last4: pm.card_last_four,
        exp_month: pm.card_exp_month,
        exp_year: pm.card_exp_year
      },
      is_default: pm.is_default
    })) || []

    // If there's a Stripe customer ID, fetch Stripe payment methods too
    let stripeCustomer
    let stripePaymentMethods: any[] = []
    if (userProfile?.stripe_customer_id) {
      try {
        stripeCustomer = await stripe.customers.retrieve(userProfile.stripe_customer_id)

        // Fetch payment methods from Stripe
        const paymentMethodsList = await stripe.paymentMethods.list({
          customer: userProfile.stripe_customer_id,
          type: 'card'
        })

        stripePaymentMethods = paymentMethodsList.data.map(pm => ({
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
        // Continue without Stripe data
      }
    }

    // Combine payment methods from both sources
    const allPaymentMethods = [...paymentMethods, ...stripePaymentMethods]

    // Fetch recent transactions from payment_transactions table instead of invoices
    const { data: transactions, error: transactionsError } = await dbOperations.supabaseAdmin
      .from('payment_transactions')
      .select('id, transaction_id, amount, currency, status, subscription_type, card_last_four, card_brand, processed_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (transactionsError) {
      console.error('Error fetching payment transactions:', transactionsError)
    }

    // Format transactions as "invoices" for backwards compatibility with settings page
    const recentInvoices = transactions?.map(txn => ({
      id: txn.id,
      invoice_number: txn.transaction_id,
      total_cents: Math.round(txn.amount * 100), // Convert to cents
      status: txn.status === 'completed' ? 'paid' : txn.status,
      created_at: txn.created_at,
      due_date: null,
      subscription_type: txn.subscription_type,
      card_last_four: txn.card_last_four,
      card_brand: txn.card_brand
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        user_id: userId,
        email: authUser.email,
        stripe_customer_id: userProfile?.stripe_customer_id || null,
        has_payment_method: allPaymentMethods.length > 0,
        payment_methods: allPaymentMethods,
        recent_invoices: recentInvoices,
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



