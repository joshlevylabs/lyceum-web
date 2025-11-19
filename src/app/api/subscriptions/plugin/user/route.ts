import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/subscriptions/plugin/user
 * Fetch current user's plugin subscriptions
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

    // Fetch user's plugin subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from('plugin_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching plugin subscriptions:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch plugin subscriptions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subscriptions: subscriptions || [],
      total: subscriptions?.length || 0
    })

  } catch (error) {
    console.error('Error in plugin subscriptions fetch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
