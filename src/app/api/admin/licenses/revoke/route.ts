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

    // Try to revoke from license_keys table first (main table)
    // Note: license_keys table uses 'inactive' instead of 'revoked' for status
    const { data: revokedLicense, error: revokeError } = await supabase
      .from('license_keys')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', license_id)
      .select('*')
      .single()

    if (revokeError) {
      // If license_keys fails, try the legacy licenses table
      console.warn('license_keys revoke failed, trying licenses table:', revokeError)
      
      const { data: legacyRevokedLicense, error: legacyRevokeError } = await supabase
        .from('licenses')
        .update({ 
          revoked: true,
          status: 'revoked'
        })
        .eq('id', license_id)
        .select('*')
        .single()

      if (legacyRevokeError) {
        return NextResponse.json({ 
          success: false, 
          error: `License revocation failed: ${legacyRevokeError.message}` 
        }, { status: 400 })
      }

      return NextResponse.json({ 
        success: true, 
        license: legacyRevokedLicense,
        message: 'License revoked successfully'
      })
    }

    // Create activity log if we have assigned_to user
    if (revokedLicense.assigned_to) {
      try {
        await supabase
          .from('user_activity_log')
          .insert([{
            user_id: revokedLicense.assigned_to,
            activity_type: 'license_revoked',
            description: `License ${revokedLicense.key_code || license_id} revoked by admin`,
            metadata: { 
              license_id,
              license_type: revokedLicense.license_type,
              revoked_at: new Date().toISOString()
            }
          }])
      } catch (logError) {
        console.warn('Failed to create activity log:', logError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      license: revokedLicense,
      message: 'License revoked successfully'
    })

  } catch (error: any) {
    console.error('License revocation error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    }, { status: 500 })
  }
}

