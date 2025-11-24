import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PaymentHistoryItem {
  id: string
  date: string
  description: string
  amount_cents: number
  currency: string
  type: 'subscription' | 'plugin_subscription'
  status: string
  payment_method?: string
  stripe_session_id?: string
}

/**
 * GET /api/billing/payment-history
 * Fetch all payment transactions for a user (main app + plugin subscriptions)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token or user not found' },
        { status: 401 }
      )
    }

    const userId = request.nextUrl.searchParams.get('user_id')

    if (!userId || userId !== user.id) {
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      )
    }

    // Fetch payment transactions (primary source)
    const { data: transactions, error: transError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (transError) {
      console.error('Error fetching payment transactions:', transError)
    }

    // Fetch main app subscriptions with payments (fallback)
    const { data: mainSubscriptions, error: mainError } = await supabase
      .from('user_subscriptions_native_app')
      .select('*')
      .eq('user_id', userId)
      .eq('subscription_type', 'paid')
      .order('created_at', { ascending: false })

    if (mainError) {
      console.error('Error fetching main subscriptions:', mainError)
    }

    // Fetch plugin subscriptions
    const { data: pluginSubscriptions, error: pluginError } = await supabase
      .from('plugin_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (pluginError) {
      console.error('Error fetching plugin subscriptions:', pluginError)
    }

    // Build payment history array
    const paymentHistory: PaymentHistoryItem[] = []

    // Add payment transactions (most accurate)
    if (transactions) {
      transactions.forEach(trans => {
        paymentHistory.push({
          id: trans.id,
          date: trans.created_at,
          description: trans.subscription_type === 'trial'
            ? 'Lyceum Native App - Trial'
            : 'Lyceum Native App - Monthly Subscription',
          amount_cents: Math.round(trans.amount * 100), // Convert dollars to cents
          currency: trans.currency.toLowerCase(),
          type: 'subscription',
          status: trans.status,
          payment_method: trans.card_last_four ? `${trans.card_brand} ****${trans.card_last_four}` : undefined,
          stripe_session_id: trans.transaction_id
        })
      })
    }

    // Add main app paid subscriptions (if not already in transactions)
    if (mainSubscriptions) {
      mainSubscriptions.forEach(sub => {
        // Check if already added from transactions
        const alreadyAdded = paymentHistory.some(p => p.stripe_session_id === sub.stripe_session_id)
        if (!alreadyAdded && sub.amount_paid_cents > 0) {
          paymentHistory.push({
            id: sub.id,
            date: sub.created_at,
            description: 'Lyceum Native App - Monthly Subscription',
            amount_cents: sub.amount_paid_cents,
            currency: sub.currency || 'usd',
            type: 'subscription',
            status: sub.status,
            stripe_session_id: sub.stripe_session_id
          })
        }
      })
    }

    // Add plugin subscriptions (paid only)
    if (pluginSubscriptions) {
      pluginSubscriptions.forEach(sub => {
        if (sub.subscription_type === 'paid' && sub.amount_paid_cents > 0) {
          const pluginName = sub.plugin_type === 'klippel_qc' ? 'Klippel QC Plugin' : 'APx500 Plugin'
          paymentHistory.push({
            id: sub.id,
            date: sub.created_at,
            description: `${pluginName} - Monthly Subscription`,
            amount_cents: sub.amount_paid_cents,
            currency: sub.currency || 'usd',
            type: 'plugin_subscription',
            status: sub.status,
            stripe_session_id: sub.stripe_session_id
          })
        }
      })
    }

    // Sort by date (most recent first)
    paymentHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      success: true,
      payments: paymentHistory,
      total: paymentHistory.length
    })

  } catch (error) {
    console.error('Error fetching payment history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
