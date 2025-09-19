import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force explicit values to avoid environment variable loading issues
const supabaseUrl = 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET /api/admin/onboarding/templates - Get session templates
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/admin/onboarding/templates - Starting request...')

    const { searchParams } = new URL(request.url)
    const pluginId = searchParams.get('plugin_id')
    const isActive = searchParams.get('is_active')
    const autoCreate = searchParams.get('auto_create') === 'true'

    console.log('Checking if onboarding_session_templates table exists...')

    // Check if onboarding_session_templates table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('onboarding_session_templates')
      .select('id')
      .limit(1)

    console.log('Templates table check result:', { tableCheck, tableError })

    if (tableError) {
      console.log('Templates table error detected:', tableError)
      if (tableError.code === '42P01') {
        // Table doesn't exist, return helpful message
        return NextResponse.json({
          templates: [],
          error: 'Session templates table not set up yet',
          message: 'Please run the MINIMAL_SESSION_TEMPLATES.sql script in your Supabase console first',
          setup_required: true
        })
      } else {
        // Other database error
        console.error('Templates database error:', tableError)
        return NextResponse.json({
          templates: [],
          error: `Database error: ${tableError.message}`,
          details: tableError,
          setup_required: false
        }, { status: 500 })
      }
    }

    console.log('Templates table exists, building query...')

    // Start with a simple query to get all templates
    let query = supabase
      .from('onboarding_session_templates')
      .select('*')

    if (pluginId) {
      query = query.eq('plugin_id', pluginId)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    if (autoCreate) {
      query = query.eq('auto_create_on_license', true)
    }

    console.log('Executing templates query...')
    const { data, error } = await query.order('priority_order', { ascending: true })

    console.log('Templates query result:', { data: data?.length || 0, error })

    if (error) {
      console.error('Templates query error:', error)
      return NextResponse.json({
        error: `Query error: ${error.message}`,
        details: error
      }, { status: 500 })
    }

    // Process templates and add computed fields
    const enrichedTemplates = data?.map(template => {
      return {
        ...template,
        objectives_count: template.objectives?.length || 0,
        prerequisites_count: template.prerequisites?.length || 0,
        agenda_items_count: template.agenda?.length || 0,
        materials_count: template.preparation_materials?.length || 0,
        formatted_duration: `${template.duration_minutes} minutes`,
        license_types_display: template.license_types?.join(', ') || 'N/A'
      }
    })

    console.log('Returning enriched templates data:', { count: enrichedTemplates?.length || 0 })
    return NextResponse.json({ templates: enrichedTemplates || [] })

  } catch (error) {
    console.error('Unexpected error in templates API:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}

// POST /api/admin/onboarding/templates - Create new template
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/admin/onboarding/templates - Starting request...')
    
    const body = await request.json()
    console.log('Creating template with data:', body)

    const { data, error } = await supabase
      .from('onboarding_session_templates')
      .insert([body])
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json({
        error: `Failed to create template: ${error.message}`,
        details: error
      }, { status: 500 })
    }

    console.log('Template created successfully:', data)
    return NextResponse.json({ template: data, message: 'Template created successfully' })

  } catch (error) {
    console.error('Unexpected error creating template:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}

// PUT /api/admin/onboarding/templates - Update template
export async function PUT(request: NextRequest) {
  try {
    console.log('PUT /api/admin/onboarding/templates - Starting request...')
    
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({
        error: 'Template ID is required for updates'
      }, { status: 400 })
    }

    console.log('Updating template:', id, 'with data:', updateData)

    const { data, error } = await supabase
      .from('onboarding_session_templates')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating template:', error)
      return NextResponse.json({
        error: `Failed to update template: ${error.message}`,
        details: error
      }, { status: 500 })
    }

    console.log('Template updated successfully:', data)
    return NextResponse.json({ template: data, message: 'Template updated successfully' })

  } catch (error) {
    console.error('Unexpected error updating template:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}

// DELETE /api/admin/onboarding/templates - Delete template
export async function DELETE(request: NextRequest) {
  try {
    console.log('DELETE /api/admin/onboarding/templates - Starting request...')
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({
        error: 'Template ID is required for deletion'
      }, { status: 400 })
    }

    console.log('Deleting template:', id)

    const { error } = await supabase
      .from('onboarding_session_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting template:', error)
      return NextResponse.json({
        error: `Failed to delete template: ${error.message}`,
        details: error
      }, { status: 500 })
    }

    console.log('Template deleted successfully')
    return NextResponse.json({ message: 'Template deleted successfully' })

  } catch (error) {
    console.error('Unexpected error deleting template:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}