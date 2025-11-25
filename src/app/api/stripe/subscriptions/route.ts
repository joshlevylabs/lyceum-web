import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/stripe/subscriptions
 * Fetch all active subscriptions from Stripe for the authenticated user's customer
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

    // Get user profile to find Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.stripe_customer_id) {
      console.log('No Stripe customer ID found for user:', user.id)
      return NextResponse.json({
        success: true,
        subscriptions: [],
        message: 'No Stripe customer found'
      })
    }

    const customerId = profile.stripe_customer_id

    // Fetch subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    })

    // Format subscriptions for frontend
    const formattedSubscriptions = await Promise.all(
      subscriptions.data.map(async (sub) => {
        // Get product name if available
        let productName = 'Subscription'
        if (sub.items.data[0]?.price.product) {
          try {
            const product = await stripe.products.retrieve(sub.items.data[0].price.product as string)
            productName = product.name
          } catch (error) {
            console.error('Error fetching product:', error)
          }
        }

        return {
          id: sub.id,
          status: sub.status,
          created: sub.created,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          cancel_at_period_end: sub.cancel_at_period_end,
          canceled_at: sub.canceled_at,
          product_name: productName,
          description: sub.description || productName,
          amount: sub.items.data[0]?.price.unit_amount || 0,
          currency: sub.items.data[0]?.price.currency || 'usd',
          interval: sub.items.data[0]?.price.recurring?.interval || 'month',
          metadata: sub.metadata,
        }
      })
    )

    return NextResponse.json({
      success: true,
      subscriptions: formattedSubscriptions,
      total: formattedSubscriptions.length,
    })

  } catch (error: any) {
    console.error('Error fetching Stripe subscriptions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}
