import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateCentcomLicenseKey } from '@/lib/licenses/centcom'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { license_id, key_id, user_ids } = body
    const targetKeyId = key_id || license_id

    if (!targetKeyId || !user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'license_id/key_id and user_ids array are required' 
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get the original license details
    const { data: originalLicense, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('key_id', targetKeyId)
      .single()

    if (!originalLicense) {
      return NextResponse.json({ 
        success: false, 
        error: `License not found: ${licenseError.message}` 
      }, { status: 404 })
    }

    const createdLicenses = []
    const errors = []

    // Create a copy of the license for each user
    for (const userId of user_ids) {
      try {
        // Generate new license key for Centcom format
        const { license_key: newLicenseKey, key_id: newKeyId } = generateCentcomLicenseKey(
          originalLicense.plugin_id || 'general',
          userId,
          originalLicense.expires_at ? new Date(originalLicense.expires_at) : null
        )

        // Create the new license record
        const newLicense = {
          key_id: newKeyId,
          key_code: newLicenseKey,
          plugin_id: originalLicense.plugin_id,
          license_type: originalLicense.license_type,
          user_id: userId,
          expires_at: originalLicense.expires_at,
          max_users: originalLicense.max_users,
          max_projects: originalLicense.max_projects,
          max_storage_gb: originalLicense.max_storage_gb,
          features: originalLicense.features,
          status: 'active',
          revoked: false,
          assigned_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data: createdLicense, error: createError } = await supabase
          .from('licenses')
          .insert([newLicense])
          .select('*')
          .single()

        if (createError) {
          errors.push({ userId, error: createError.message })
        } else {
          createdLicenses.push(createdLicense)

          // Create activity log
          try {
            await supabase
              .from('user_activity_logs')
              .insert([{
                user_id: userId,
                activity_type: 'license_assigned',
                description: `License copy created from ${license_id} by admin`,
                metadata: { 
                  license_id: newKeyId,
                  original_license_id: license_id,
                  assigned_at: new Date().toISOString()
                }
              }])
          } catch (logError) {
            console.warn('Failed to create activity log:', logError)
          }
        }
      } catch (error: any) {
        errors.push({ userId, error: error.message })
      }
    }

    // Update the original license status if it was assigned to multiple users
    if (createdLicenses.length > 0) {
      try {
        await supabase
          .from('licenses')
          .update({ 
            status: 'distributed',
            updated_at: new Date().toISOString()
          })
          .eq('key_id', license_id)
      } catch (error) {
        console.warn('Failed to update original license status:', error)
      }
    }

    if (errors.length > 0 && createdLicenses.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create any licenses',
        errors 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully created ${createdLicenses.length} license${createdLicenses.length !== 1 ? 's' : ''}`,
      created_licenses: createdLicenses,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('Multiple license assignment error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    }, { status: 500 })
  }
}
