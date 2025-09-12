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
      .from('projects')
      .select(`
        *,
        user_profiles!projects_created_by_fkey(full_name, username)
      `)
      .order('updated_at', { ascending: false })

    // Apply filters
    switch (filterType) {
      case 'shared':
        query = query.eq('is_public', true)
        break
      case 'flagged':
        query = query.gt('flagged_count', 0)
        break
    }

    // Apply search
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,project_key.ilike.%${search}%`)
    }

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: projects, error, count } = await query

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json({ error: 'Failed to fetch projects', details: error }, { status: 500 })
    }

    return NextResponse.json({
      projects: projects || [],
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

    const body = await request.json()
    const {
      name,
      description,
      project_key,
      groups = [],
      tags = [],
      data_types = [],
      test_configurations = {},
      is_public = false
    } = body

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    if (!project_key || project_key.trim() === '') {
      return NextResponse.json({ error: 'Project key is required' }, { status: 400 })
    }

    // For now, use a default user ID - in production this would come from auth
    const defaultUserId = '123e4567-e89b-12d3-a456-426614174000'

    // Create project
    const projectData = {
      name: name.trim(),
      description: description?.trim() || null,
      project_key: project_key.trim().toUpperCase(),
      created_by: defaultUserId,
      groups,
      tags,
      data_types,
      test_configurations,
      is_public,
      measurement_count: 0,
      flagged_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select(`
        *,
        user_profiles!projects_created_by_fkey(full_name, username)
      `)
      .single()

    if (error) {
      console.error('Error creating project:', error)
      return NextResponse.json({ error: 'Failed to create project', details: error }, { status: 500 })
    }

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
} 