import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { license_id } = body

    if (!license_id) {
      return NextResponse.json({ success: false, error: 'license_id is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get current license data before deletion for logging
    const { data: currentLicense, error: fetchError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('id', license_id)
      .single()

    if (fetchError) {
      // Try legacy licenses table if license_keys fails
      const { data: legacyLicense, error: legacyFetchError } = await supabase
        .from('licenses')
        .select('*')
        .eq('id', license_id)
        .single()

      if (legacyFetchError) {
        return NextResponse.json({ 
          success: false, 
          error: `License not found: ${legacyFetchError.message}` 
        }, { status: 404 })
      }

      // Delete from legacy table
      const { error: legacyDeleteError } = await supabase
        .from('licenses')
        .delete()
        .eq('id', license_id)

      if (legacyDeleteError) {
        return NextResponse.json({ 
          success: false, 
          error: `License deletion failed: ${legacyDeleteError.message}` 
        }, { status: 400 })
      }

      // Create activity log for the previously assigned user
      if (legacyLicense.user_id) {
        try {
          await supabase
            .from('user_activity_log')
            .insert([{
              user_id: legacyLicense.user_id,
              activity_type: 'license_deleted',
              description: `License ${legacyLicense.key_id || license_id} deleted by admin`,
              metadata: { 
                license_id,
                license_type: legacyLicense.license_type,
                deleted_at: new Date().toISOString(),
                previous_user: legacyLicense.user_id
              }
            }])
        } catch (logError) {
          console.warn('Failed to create activity log:', logError)
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: 'License deleted successfully'
      })
    }

    // Create activity log before deletion (if assigned)
    if (currentLicense.assigned_to) {
      try {
        await supabase
          .from('user_activity_log')
          .insert([{
            user_id: currentLicense.assigned_to,
            activity_type: 'license_deleted',
            description: `License ${currentLicense.key_code || license_id} deleted by admin`,
            metadata: { 
              license_id,
              license_type: currentLicense.license_type,
              deleted_at: new Date().toISOString(),
              previous_user: currentLicense.assigned_to
            }
          }])
      } catch (logError) {
        console.warn('Failed to create activity log:', logError)
      }
    }

    // Delete the license from license_keys table
    const { error: deleteError } = await supabase
      .from('license_keys')
      .delete()
      .eq('id', license_id)

    if (deleteError) {
      return NextResponse.json({ 
        success: false, 
        error: `License deletion failed: ${deleteError.message}` 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'License deleted successfully'
    })

  } catch (error: any) {
    console.error('License deletion error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Support POST method for consistency with other endpoints
  return DELETE(req)
}
