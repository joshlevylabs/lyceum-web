import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

// Check if user has payment method on file
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

    // Check for stored payment methods
    console.log('Checking stored_payment_methods table for user:', user.id)
    const { data: paymentMethods, error: pmError } = await supabase
      .from('stored_payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (pmError) {
      console.error('Error checking payment methods:', {
        message: pmError.message,
        details: pmError.details,
        hint: pmError.hint,
        code: pmError.code
      })
      // Return empty result instead of error to allow flow to continue
      return NextResponse.json({
        hasPaymentMethod: false,
        paymentMethod: null,
        error: pmError.message
      })
    }

    console.log('Found payment methods in stored_payment_methods table:', paymentMethods?.length || 0)

    // If no payment methods in stored_payment_methods, check Stripe
    let stripePaymentMethods: any[] = []
    if (!paymentMethods || paymentMethods.length === 0) {
      console.log('No stored payment methods, checking Stripe...')

      // Get user profile to find Stripe customer ID
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single()

      let stripeCustomerId = profile?.stripe_customer_id

      if (!stripeCustomerId) {
        // No customer ID in profile, search by email
        console.log('No Stripe customer ID in profile, searching by email:', user.email)
        try {
          const customers = await stripe.customers.list({
            email: user.email,
            limit: 1
          })
          if (customers.data.length > 0) {
            stripeCustomerId = customers.data[0].id
            console.log('Found Stripe customer by email:', stripeCustomerId)

            // Store the customer ID in user profile for future lookups
            console.log('Storing Stripe customer ID in user profile...')
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({ stripe_customer_id: stripeCustomerId })
              .eq('id', user.id)

            if (updateError) {
              console.error('Failed to store Stripe customer ID:', updateError)
              // Don't fail the request, just log the error
            } else {
              console.log('Successfully stored Stripe customer ID in profile')
            }
          } else {
            console.log('No Stripe customer found for email:', user.email)
          }
        } catch (searchError) {
          console.error('Error searching Stripe customers by email:', searchError)
        }
      } else {
        console.log('Found Stripe customer ID in profile:', stripeCustomerId)
      }

      if (stripeCustomerId) {
        try {
          const pmList = await stripe.paymentMethods.list({
            customer: stripeCustomerId,
            type: 'card'
          })
          stripePaymentMethods = pmList.data
          console.log('Found payment methods in Stripe:', stripePaymentMethods.length)
        } catch (stripeError) {
          console.error('Error fetching Stripe payment methods:', stripeError)
        }
      }
    }

    const hasStoredPaymentMethod = paymentMethods && paymentMethods.length > 0
    const hasStripePaymentMethod = stripePaymentMethods.length > 0
    const hasPaymentMethod = hasStoredPaymentMethod || hasStripePaymentMethod

    const defaultPaymentMethod = hasStoredPaymentMethod
      ? paymentMethods.find(pm => pm.is_default) || paymentMethods[0]
      : hasStripePaymentMethod
      ? stripePaymentMethods[0]
      : null

    console.log('Final payment check result:', {
      hasStoredPaymentMethod,
      hasStripePaymentMethod,
      hasPaymentMethod,
      defaultPaymentMethod: defaultPaymentMethod ? 'found' : 'none'
    })

    return NextResponse.json({
      hasPaymentMethod,
      paymentMethod: defaultPaymentMethod ? (
        hasStoredPaymentMethod ? {
          id: defaultPaymentMethod.id,
          card_last_four: defaultPaymentMethod.card_last_four,
          card_brand: defaultPaymentMethod.card_brand,
          card_exp_month: defaultPaymentMethod.card_exp_month,
          card_exp_year: defaultPaymentMethod.card_exp_year,
          is_default: defaultPaymentMethod.is_default
        } : {
          id: defaultPaymentMethod.id,
          card_last_four: defaultPaymentMethod.card?.last4,
          card_brand: defaultPaymentMethod.card?.brand,
          card_exp_month: defaultPaymentMethod.card?.exp_month,
          card_exp_year: defaultPaymentMethod.card?.exp_year,
          is_default: false
        }
      ) : null
    })

  } catch (error) {
    console.error('Error in payment check:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
