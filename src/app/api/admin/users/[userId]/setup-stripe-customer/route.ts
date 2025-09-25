import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import * as dbOperations from '@/lib/supabase-direct';
import { createCustomer } from '@/lib/stripe';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ 
        error: 'User not found',
        details: profileError.message 
      }, { status: 404 });
    }

    // Check if customer already exists
    if (userProfile.stripe_customer_id) {
      return NextResponse.json({
        success: true,
        message: 'Stripe customer already exists',
        customer_id: userProfile.stripe_customer_id
      });
    }

    // Create Stripe customer
    const customer = await createCustomer({
      email: userProfile.email,
      name: userProfile.full_name || userProfile.email,
      userId: userProfile.id
    });

    // Update user profile with Stripe customer ID
    const { error: updateError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .update({
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user profile with Stripe customer ID:', updateError);
      return NextResponse.json({ 
        error: 'Failed to save Stripe customer ID',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Stripe customer created successfully',
      customer_id: customer.id
    });

  } catch (error: any) {
    console.error('Error setting up Stripe customer:', error);
    return NextResponse.json(
      { error: 'Failed to setup Stripe customer', details: error.message },
      { status: 500 }
    );
  }
}
