import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-direct'

// GET /api/plugins/[slug]/reviews - Get reviews for a plugin
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    // Get plugin ID from slug
    const { data: plugin, error: pluginError } = await supabaseAdmin
      .from('plugins')
      .select('id')
      .eq('slug', slug)
      .eq('is_published', true)
      .single()

    if (pluginError || !plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 })
    }

    // Get published reviews for this plugin
    const { data: reviews, error: reviewsError } = await supabaseAdmin
      .from('plugin_reviews')
      .select(`
        id,
        rating,
        title,
        review_text,
        is_verified_purchase,
        helpful_count,
        not_helpful_count,
        created_at,
        updated_at,
        user_id
      `)
      .eq('plugin_id', plugin.id)
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError)
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }

    // Get user profiles for reviewers (to show names/emails)
    const userIds = [...new Set(reviews?.map(r => r.user_id) || [])]
    const { data: userProfiles } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', userIds)

    // Create a map of user profiles
    const userProfileMap = new Map(
      userProfiles?.map(profile => [profile.id, profile]) || []
    )

    // Enhance reviews with user info
    const enhancedReviews = reviews?.map(review => ({
      ...review,
      user: userProfileMap.get(review.user_id) || { full_name: 'Anonymous User' }
    }))

    return NextResponse.json({
      success: true,
      reviews: enhancedReviews || []
    })

  } catch (error: any) {
    console.error('Reviews API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/plugins/[slug]/reviews - Submit a new review
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { success, user, response } = await requireAuth(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { slug } = params
    const body = await request.json()
    const { rating, title, review_text } = body

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Review title is required' }, { status: 400 })
    }

    if (!review_text || review_text.trim().length === 0) {
      return NextResponse.json({ error: 'Review text is required' }, { status: 400 })
    }

    // Get plugin ID from slug
    const { data: plugin, error: pluginError } = await supabaseAdmin
      .from('plugins')
      .select('id, display_name')
      .eq('slug', slug)
      .eq('is_published', true)
      .single()

    if (pluginError || !plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 })
    }

    // Check if user has already reviewed this plugin
    const { data: existingReview } = await supabaseAdmin
      .from('plugin_reviews')
      .select('id')
      .eq('plugin_id', plugin.id)
      .eq('user_id', user.id)
      .single()

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this plugin' },
        { status: 400 }
      )
    }

    // Check if user has an active license (for verified purchase badge)
    const { data: userLicense } = await supabaseAdmin
      .from('plugin_licenses')
      .select('id')
      .eq('plugin_id', plugin.id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    const isVerifiedPurchase = !!userLicense

    // Insert the review
    const { data: newReview, error: insertError } = await supabaseAdmin
      .from('plugin_reviews')
      .insert({
        plugin_id: plugin.id,
        user_id: user.id,
        rating,
        title: title.trim(),
        review_text: review_text.trim(),
        is_verified_purchase: isVerifiedPurchase,
        is_published: true // Auto-publish for now, could add moderation later
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting review:', insertError)
      return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      review: newReview,
      message: 'Review submitted successfully'
    })

  } catch (error: any) {
    console.error('Submit review error:', error)
    return NextResponse.json(
      { error: 'Failed to submit review', details: error.message },
      { status: 500 }
    )
  }
}
