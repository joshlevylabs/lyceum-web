import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { license_id } = body

    if (!license_id) {
      return NextResponse.json({ success: false, error: 'license_id is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get current license data to log the unassignment
    const { data: currentLicense, error: fetchError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('id', license_id)
      .single()

    if (fetchError) {
      return NextResponse.json({ 
        success: false, 
        error: `License not found: ${fetchError.message}` 
      }, { status: 404 })
    }

    // Update the license to remove assignment
    const { data: unassignedLicense, error: unassignError } = await supabase
      .from('license_keys')
      .update({ 
        assigned_to: null,
        assigned_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', license_id)
      .select('*')
      .single()

    if (unassignError) {
      return NextResponse.json({ 
        success: false, 
        error: `License unassignment failed: ${unassignError.message}` 
      }, { status: 400 })
    }

    // Create activity log for the previously assigned user
    if (currentLicense.assigned_to) {
      try {
        await supabase
          .from('user_activity_log')
          .insert([{
            user_id: currentLicense.assigned_to,
            activity_type: 'license_unassigned',
            description: `License ${currentLicense.key_code || license_id} unassigned by admin`,
            metadata: { 
              license_id,
              license_type: currentLicense.license_type,
              unassigned_at: new Date().toISOString(),
              previous_user: currentLicense.assigned_to
            }
          }])
      } catch (logError) {
        console.warn('Failed to create activity log:', logError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      license: unassignedLicense,
      message: 'License unassigned successfully'
    })

  } catch (error: any) {
    console.error('License unassignment error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    }, { status: 500 })
  }
}