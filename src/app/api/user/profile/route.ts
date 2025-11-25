import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * GET /api/user/profile
 * Get the current user's profile information
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    return NextResponse.json({ profile }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in GET /api/user/profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/user/profile
 * Update the current user's profile information
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();
    const { full_name, company } = body;

    // Validate input
    if (!full_name && !company) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Build the update object with only provided fields
    const updateData: any = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (company !== undefined) updateData.company = company;

    // Update the user profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({
      profile: updatedProfile,
      message: 'Profile updated successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in PATCH /api/user/profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
