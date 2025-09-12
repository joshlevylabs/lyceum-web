import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const licenseId = searchParams.get('license_id')

    if (!licenseId) {
      return NextResponse.json({ success: false, error: 'license_id is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get license details - try both tables for compatibility
    let license = null
    let licenseError = null

    // First try the 'licenses' table (Centcom format)
    const { data: centcomLicense, error: centcomError } = await supabase
      .from('licenses')
      .select('*')
      .eq('key_id', licenseId)
      .single()

    if (centcomLicense) {
      license = centcomLicense
    } else {
      // Fallback to 'license_keys' table (legacy format)
      const { data: legacyLicense, error: legacyError } = await supabase
        .from('license_keys')
        .select('*')
        .eq('id', licenseId)
        .single()

      if (legacyLicense) {
        license = legacyLicense
      } else {
        licenseError = legacyError || centcomError
      }
    }

    if (licenseError) {
      return NextResponse.json({ 
        success: false, 
        error: `License not found: ${licenseError.message}` 
      }, { status: 404 })
    }

    // Get assigned user details if license is assigned
    let assignedUser = null
    if (license.user_id) {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(license.user_id)
        if (userData?.user) {
          // Get user profile
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', license.user_id)
            .single()

          assignedUser = {
            id: license.user_id,
            email: userData.user.email,
            full_name: profile?.full_name || userData.user.email,
            username: profile?.username || userData.user.email?.split('@')[0]
          }
        }
      } catch (error) {
        console.warn('Failed to load assigned user details:', error)
      }
    }

    return NextResponse.json({ 
      success: true, 
      license: {
        ...license,
        assigned_to: assignedUser
      }
    })

  } catch (error: any) {
    console.error('License details error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    }, { status: 500 })
  }
}
