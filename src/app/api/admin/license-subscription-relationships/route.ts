import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-direct';

/**
 * GET /api/admin/license-subscription-relationships
 * Get all license-subscription relationships with full details
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch all relationships
    const { data: relationships, error: relError } = await supabaseAdmin
      .from('license_subscription_relationships')
      .select('*')
      .order('created_at', { ascending: false });

    if (relError) {
      console.error('Error fetching relationships:', relError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch relationships' },
        { status: 500 }
      );
    }

    if (!relationships || relationships.length === 0) {
      return NextResponse.json({
        success: true,
        relationships: [],
        count: 0
      });
    }

    // Get all license IDs and subscription IDs
    const licenseIds = [...new Set(relationships.map(r => r.license_id))];
    const subscriptionIds = [...new Set(relationships.map(r => r.subscription_id))];

    // Fetch licenses
    const { data: licenses } = await supabaseAdmin
      .from('license_keys')
      .select('id, license_key, key_code, license_type, status, user_id')
      .in('id', licenseIds);

    // Fetch subscriptions
    const { data: subscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('id, subscription_key, subscription_category, subscription_type, plugin_type, status, user_id')
      .in('id', subscriptionIds);

    // Get all unique user IDs from licenses and subscriptions
    const userIds = [...new Set([
      ...(licenses?.map(l => l.user_id).filter(Boolean) || []),
      ...(subscriptions?.map(s => s.user_id).filter(Boolean) || [])
    ])];

    // Fetch user emails
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userEmailMap: Record<string, string> = {};
    authUsers?.users.forEach(user => {
      if (user.id && user.email) {
        userEmailMap[user.id] = user.email;
      }
    });

    // Create lookup maps
    const licenseMap = new Map(licenses?.map(l => [l.id, l]) || []);
    const subscriptionMap = new Map(subscriptions?.map(s => [s.id, s]) || []);

    // Combine all data
    const enrichedRelationships = relationships.map(rel => {
      const license = licenseMap.get(rel.license_id);
      const subscription = subscriptionMap.get(rel.subscription_id);

      return {
        ...rel,
        license: license ? {
          ...license,
          user_email: license.user_id ? userEmailMap[license.user_id] : null
        } : null,
        subscription: subscription ? {
          ...subscription,
          user_email: subscription.user_id ? userEmailMap[subscription.user_id] : null
        } : null
      };
    });

    return NextResponse.json({
      success: true,
      relationships: enrichedRelationships,
      count: enrichedRelationships.length
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/license-subscription-relationships:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/license-subscription-relationships
 * Create a new license-subscription relationship
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_id, subscription_id, relationship_type, notes } = body;

    if (!license_id || !subscription_id) {
      return NextResponse.json(
        { success: false, error: 'license_id and subscription_id are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('license_subscription_relationships')
      .insert({
        license_id,
        subscription_id,
        relationship_type: relationship_type || 'standard',
        notes
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating relationship:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create relationship' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      relationship: data
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/admin/license-subscription-relationships:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/license-subscription-relationships
 * Update a license-subscription relationship
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { relationship_id, relationship_type, notes } = body;

    if (!relationship_id) {
      return NextResponse.json(
        { success: false, error: 'relationship_id is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (relationship_type) updateData.relationship_type = relationship_type;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabaseAdmin
      .from('license_subscription_relationships')
      .update(updateData)
      .eq('id', relationship_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating relationship:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update relationship' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      relationship: data
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/admin/license-subscription-relationships:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/license-subscription-relationships
 * Delete a license-subscription relationship
 */
export async function DELETE(request: NextRequest) {
  try {
    const { relationship_id } = await request.json();

    if (!relationship_id) {
      return NextResponse.json(
        { success: false, error: 'relationship_id is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('license_subscription_relationships')
      .delete()
      .eq('id', relationship_id);

    if (error) {
      console.error('Error deleting relationship:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete relationship' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Relationship deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/license-subscription-relationships:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
