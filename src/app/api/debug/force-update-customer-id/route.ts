import { NextRequest, NextResponse } from 'next/server'
import * as dbOperations from '@/lib/supabase-direct'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userEmail = searchParams.get('userEmail') || 'joshual@sonance.com'
    const stripeCustomerId = searchParams.get('stripeCustomerId') || 'cus_T7ZjWDtzZA3IG6'
    
    console.log('💾 Force update - Starting with:', { userEmail, stripeCustomerId })

    // First, get the user profile
    const { data: profile, error: profileError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('email', userEmail)
      .single()

    if (profileError || !profile) {
      console.error('💾 Force update - Profile lookup failed:', profileError)
      return NextResponse.json({ 
        success: false, 
        error: 'User profile not found',
        details: profileError?.message 
      }, { status: 404 })
    }

    console.log('💾 Force update - Found profile:', {
      id: profile.id,
      email: profile.email,
      currentCustomerId: profile.stripe_customer_id
    })

    // Update the stripe_customer_id using direct update
    const { data: updateResult, error: updateError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .update({ 
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)
      .select()

    if (updateError) {
      console.error('💾 Force update - Update failed:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Update failed',
        details: updateError.message 
      }, { status: 500 })
    }

    console.log('💾 Force update - Update result:', updateResult)

    // Verify the update
    const { data: verifyProfile, error: verifyError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('stripe_customer_id, updated_at')
      .eq('id', profile.id)
      .single()

    console.log('💾 Force update - Verification result:', verifyProfile)

    return NextResponse.json({
      success: true,
      message: `Stripe customer ID force updated successfully`,
      userId: profile.id,
      userEmail: profile.email,
      oldCustomerId: profile.stripe_customer_id,
      newCustomerId: stripeCustomerId,
      updateResult: updateResult,
      verification: verifyProfile
    })

  } catch (error: any) {
    console.error('💾 Force update - Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: `Server error: ${error.message}` 
    }, { status: 500 })
  }
}
