import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/licenses/my-licenses
 * Fetch all licenses for the authenticated user
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

    // Fetch all licenses for this user
    const { data: licenses, error: licensesError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false })

    if (licensesError) {
      console.error('Error fetching licenses:', licensesError)
      return NextResponse.json(
        { error: 'Failed to fetch licenses' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      licenses: licenses || []
    })

  } catch (error) {
    console.error('Error in my-licenses endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
