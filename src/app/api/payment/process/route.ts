import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Payment processing endpoint
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      subscription_type,
      card_number,
      card_name,
      expiry_date,
      cvv,
      billing_zip
    } = body

    // Validate required fields
    if (!subscription_type || !card_number || !card_name || !expiry_date || !cvv || !billing_zip) {
      return NextResponse.json(
        { error: 'Missing required payment information' },
        { status: 400 }
      )
    }

    // Validate subscription type
    if (!['trial', 'paid'].includes(subscription_type)) {
      return NextResponse.json(
        { error: 'Invalid subscription type' },
        { status: 400 }
      )
    }

    // Basic card validation
    if (card_number.length !== 16) {
      return NextResponse.json(
        { error: 'Invalid card number' },
        { status: 400 }
      )
    }

    // Validate expiry date
    const [expMonth, expYear] = expiry_date.split('/')
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear() % 100 // Get last 2 digits
    const currentMonth = currentDate.getMonth() + 1

    const expMonthNum = parseInt(expMonth, 10)
    const expYearNum = parseInt(expYear, 10)

    if (expYearNum < currentYear || (expYearNum === currentYear && expMonthNum < currentMonth)) {
      return NextResponse.json(
        { error: 'Card has expired' },
        { status: 400 }
      )
    }

    // TODO: In production, integrate with actual payment processor (Stripe, PayPal, etc.)
    // For now, we'll simulate payment processing

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Log payment attempt (in production, store encrypted payment info)
    console.log(`Payment processed for user ${user.id}:`, {
      subscription_type,
      card_last_four: card_number.slice(-4),
      amount: subscription_type === 'paid' ? 49.00 : 0.00
    })

    const [expMonth, expYear] = expiry_date.split('/')

    // Store payment method for reuse
    const { error: pmError } = await supabase
      .from('stored_payment_methods')
      .upsert({
        user_id: user.id,
        card_last_four: card_number.slice(-4),
        card_brand: getCardBrand(card_number),
        card_exp_month: parseInt(expMonth, 10),
        card_exp_year: parseInt(expYear, 10),
        billing_zip,
        is_default: true
      }, {
        onConflict: 'user_id,card_last_four,card_exp_month,card_exp_year'
      })

    if (pmError) {
      console.error('Error storing payment method:', pmError)
      // Don't fail the request if storing payment method fails
    }

    // Create payment record
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        subscription_type,
        amount: subscription_type === 'paid' ? 49.00 : 0.00,
        currency: 'USD',
        card_last_four: card_number.slice(-4),
        card_brand: getCardBrand(card_number),
        billing_zip,
        status: 'completed',
        transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        processed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment record:', paymentError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      transaction_id: paymentRecord?.transaction_id || `txn_${Date.now()}`,
      message: 'Payment processed successfully'
    })

  } catch (error) {
    console.error('Error in payment processing:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to detect card brand
function getCardBrand(cardNumber: string): string {
  const firstDigit = cardNumber.charAt(0)
  const firstTwoDigits = cardNumber.substring(0, 2)

  if (firstDigit === '4') return 'visa'
  if (['51', '52', '53', '54', '55'].includes(firstTwoDigits)) return 'mastercard'
  if (['34', '37'].includes(firstTwoDigits)) return 'amex'
  if (firstTwoDigits === '60' || firstTwoDigits === '65') return 'discover'

  return 'unknown'
}
