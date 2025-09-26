import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Set or change the responsible user for a license
 * POST /api/admin/licenses/set-responsible-user
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { license_id, responsible_user_id, table_name = 'licenses' } = body

    if (!license_id || !responsible_user_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'license_id and responsible_user_id are required' 
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Validate that the new responsible user exists
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('id', responsible_user_id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({
        success: false,
        error: 'Responsible user not found'
      }, { status: 404 })
    }

    // Update the license based on table_name
    let updateResult
    if (table_name === 'licenses') {
      updateResult = await supabase
        .from('licenses')
        .update({ 
          responsible_user_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', license_id)
        .select('*')
        .single()
    } else if (table_name === 'license_keys') {
      updateResult = await supabase
        .from('license_keys')
        .update({ 
          responsible_user_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', license_id)
        .select('*')
        .single()
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid table_name. Must be either "licenses" or "license_keys"'
      }, { status: 400 })
    }

    if (updateResult.error) {
      console.error('Update error:', updateResult.error)
      return NextResponse.json({
        success: false,
        error: updateResult.error.message
      }, { status: 400 })
    }

    console.log('License responsibility updated successfully:', {
      license_id,
      new_responsible_user: userProfile.email,
      table_name
    })

    return NextResponse.json({
      success: true,
      license: updateResult.data,
      responsible_user: userProfile,
      message: `License responsibility transferred to ${userProfile.full_name || userProfile.email}`
    })

  } catch (e: any) {
    console.error('Error setting responsible user:', e)
    return NextResponse.json({
      success: false,
      error: e?.message || 'Internal error'
    }, { status: 500 })
  }
}
