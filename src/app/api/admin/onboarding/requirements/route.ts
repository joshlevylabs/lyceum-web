import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force explicit values to avoid environment variable loading issues
const supabaseUrl = 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET /api/admin/onboarding/requirements - Get onboarding requirements
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const licenseType = searchParams.get('license_type')
    const pluginId = searchParams.get('plugin_id')

    let query = supabase
      .from('onboarding_requirements')
      .select('*')
      .eq('is_active', true)

    if (licenseType) {
      query = query.eq('license_type', licenseType)
    }

    if (pluginId) {
      query = query.eq('plugin_id', pluginId)
    }

    const { data, error } = await query.order('license_type', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ requirements: data })

  } catch (error) {
    console.error('Error fetching onboarding requirements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/onboarding/requirements - Create new requirement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      license_type,
      plugin_id = 'centcom',
      required_sessions = 1,
      session_duration_minutes = 30,
      description
    } = body

    if (!license_type || !plugin_id) {
      return NextResponse.json(
        { error: 'license_type and plugin_id are required' },
        { status: 400 }
      )
    }

    const requirementData = {
      license_type,
      plugin_id,
      required_sessions,
      session_duration_minutes,
      description: description || `${required_sessions} session(s) required for ${plugin_id} ${license_type} license`,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('onboarding_requirements')
      .insert([requirementData])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ requirement: data })

  } catch (error) {
    console.error('Error creating onboarding requirement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/onboarding/requirements - Update existing requirement
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('onboarding_requirements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ requirement: data })

  } catch (error) {
    console.error('Error updating onboarding requirement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/onboarding/requirements - Deactivate requirement
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    // Soft delete by setting is_active to false
    const { data, error } = await supabase
      .from('onboarding_requirements')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ requirement: data })

  } catch (error) {
    console.error('Error deleting onboarding requirement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
