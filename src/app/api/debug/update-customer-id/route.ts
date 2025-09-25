import { NextRequest, NextResponse } from 'next/server';
import * as dbOperations from '@/lib/supabase-direct';

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Update customer ID - Starting request')
    
    let body;
    try {
      body = await request.json();
      console.log('📝 Update customer ID - Parsed body:', body);
    } catch (jsonError) {
      console.error('📝 Update customer ID - JSON parse error:', jsonError);
      return NextResponse.json({ 
        error: 'Invalid JSON body',
        details: jsonError.message 
      }, { status: 400 });
    }
    
    const { userEmail, stripeCustomerId } = body;
    
    if (!userEmail || !stripeCustomerId) {
      return NextResponse.json({ 
        error: 'userEmail and stripeCustomerId are required',
        received: { userEmail: !!userEmail, stripeCustomerId: !!stripeCustomerId }
      }, { status: 400 });
    }

    console.log('📝 Update customer ID - Request:', { userEmail, stripeCustomerId })

    // Update the user profile directly
    console.log('📝 Update customer ID - About to update database...')
    let updatedProfile, updateError;
    
    try {
      const result = await dbOperations.supabaseAdmin
        .from('user_profiles')
        .update({
          stripe_customer_id: stripeCustomerId,
          subscription_status: 'setup_complete',
          updated_at: new Date().toISOString(),
        })
        .eq('email', userEmail)
        .select('id, email, full_name, stripe_customer_id, subscription_status')
        .single();
      
      updatedProfile = result.data;
      updateError = result.error;
      
      console.log('📝 Update customer ID - Database result:', { 
        data: !!updatedProfile, 
        error: updateError?.message 
      });
    } catch (dbError) {
      console.error('📝 Update customer ID - Database exception:', dbError);
      return NextResponse.json({ 
        error: 'Database operation failed',
        details: dbError.message 
      }, { status: 500 });
    }

    if (updateError) {
      console.error('📝 Update customer ID - Update failed:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update user profile',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('📝 Update customer ID - Successfully updated:', updatedProfile);

    return NextResponse.json({
      success: true,
      message: 'Customer ID updated successfully',
      userProfile: updatedProfile
    });

  } catch (error: any) {
    console.error('📝 Update customer ID - Error:', error);
    return NextResponse.json(
      { error: 'Failed to update customer ID', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint for quick testing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail') || 'josh@thelyceum.io';
    const stripeCustomerId = searchParams.get('stripeCustomerId') || 'cus_T7ZjWDtzZA3IG6';
    
    console.log('📝 Update customer ID - GET request:', { userEmail, stripeCustomerId });
    
    const result = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .update({
        stripe_customer_id: stripeCustomerId,
        subscription_status: 'setup_complete',
        updated_at: new Date().toISOString(),
      })
      .eq('email', userEmail)
      .select('id, email, full_name, stripe_customer_id, subscription_status')
      .single();
    
    return NextResponse.json({
      success: true,
      message: 'Customer ID updated successfully (via GET)',
      userProfile: result.data,
      error: result.error?.message
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Update failed',
      details: error.message
    }, { status: 500 });
  }
}
