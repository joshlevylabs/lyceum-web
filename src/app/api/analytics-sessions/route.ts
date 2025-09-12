import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use direct client creation for consistency
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const filterType = searchParams.get('filterType') || 'all'
    const search = searchParams.get('search')

    let query = supabase
      .from('analytics_sessions')
      .select(`
        *,
        user_profiles!analytics_sessions_created_by_fkey(full_name, username),
        analytics_session_collaborators(count)
      `)
      .order('updated_at', { ascending: false })

    // Apply filters
    switch (filterType) {
      case 'shared':
        query = query.eq('is_public', true)
        break
      case 'recent':
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('updated_at', weekAgo.toISOString())
        break
    }

    // Apply search
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: sessions, error, count } = await query

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions', details: error }, { status: 500 })
    }

    return NextResponse.json({
      sessions: sessions || [],
      total: count || 0,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if we have any user profiles
    const { data: existingUser, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)
      .single()

    let userId = existingUser?.id

    // If no user profiles exist, create a default one for development
    if (!userId) {
      console.log('No user profiles found, creating default user profile...')
      
      const defaultProfile = {
        id: crypto.randomUUID(),
        email: 'developer@lyceum.app',
        username: 'developer',
        full_name: 'Development User',
        company: 'Lyceum Development',
        role: 'analyst'
      }

      const { data: newUser, error: createError } = await supabase
        .from('user_profiles')
        .insert([defaultProfile])
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating default user:', createError)
        return NextResponse.json({ 
          error: 'Could not create user profile. Please try signing up again.',
          details: createError.message 
        }, { status: 500 })
      }

      userId = newUser.id
      console.log('Created default user profile with ID:', userId)
    }

    const body = await request.json()
    const {
      name,
      description,
      session_type = 'exploratory',
      config = {},
      is_public = false,
      data_bindings = {},
      analytics_state = {},
      collaboration = {}
    } = body

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Session name is required' }, { status: 400 })
    }

    // Create session
    const sessionData = {
      name: name.trim(),
      description: description?.trim() || null,
      session_type,
      status: 'active',
      created_by: userId,
      config: {
        auto_refresh: config.auto_refresh ?? true,
        refresh_interval: config.refresh_interval ?? 30,
        allow_collaboration: config.allow_collaboration ?? false,
        is_public: is_public,
        max_collaborators: config.max_collaborators ?? 10,
        data_retention_days: config.data_retention_days ?? 90,
        ...config
      },
      data_bindings,
      analytics_state,
      collaboration,
      is_public,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: session, error } = await supabase
      .from('analytics_sessions')
      .insert([sessionData])
      .select('*')
      .single()

    if (error) {
      console.error('Error creating session:', error)
      return NextResponse.json({ error: 'Failed to create session', details: error }, { status: 500 })
    }

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const body = await request.json()
    const { sessionId } = body
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('analytics_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      console.error('Error deleting session:', error)
      return NextResponse.json({ error: 'Failed to delete session', details: error }, { status: 500 })
    }

    return NextResponse.json({ message: 'Session deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
} 