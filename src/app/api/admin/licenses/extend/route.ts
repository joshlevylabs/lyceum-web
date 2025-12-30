import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { license_id, extend_days, new_expiry_date } = body

    if (!license_id) {
      return NextResponse.json({ success: false, error: 'license_id is required' }, { status: 400 })
    }

    if (!extend_days && !new_expiry_date) {
      return NextResponse.json({
        success: false,
        error: 'Either extend_days or new_expiry_date is required'
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Try to find the license in both tables
    let license = null
    let tableName = ''

    // First check licenses table (Centcom)
    const { data: centcomLicense } = await supabase
      .from('licenses')
      .select('*')
      .eq('key_id', license_id)
      .single()

    if (centcomLicense) {
      license = centcomLicense
      tableName = 'licenses'
    } else {
      // Check license_keys table (legacy)
      const { data: legacyLicense } = await supabase
        .from('license_keys')
        .select('*')
        .eq('id', license_id)
        .single()

      if (legacyLicense) {
        license = legacyLicense
        tableName = 'license_keys'
      }
    }

    if (!license) {
      return NextResponse.json({
        success: false,
        error: 'License not found'
      }, { status: 404 })
    }

    // Calculate new expiry date
    let newExpiresAt: string

    if (new_expiry_date) {
      newExpiresAt = new Date(new_expiry_date).toISOString()
    } else {
      // Extend from current expiry or from now if no expiry set
      const baseDate = license.expires_at ? new Date(license.expires_at) : new Date()
      baseDate.setDate(baseDate.getDate() + extend_days)
      newExpiresAt = baseDate.toISOString()
    }

    // Update the license
    const updateData: any = {
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString()
    }

    // If license was expired, reactivate it
    if (license.status === 'expired') {
      updateData.status = 'active'
    }

    const idField = tableName === 'licenses' ? 'key_id' : 'id'

    const { data: updatedLicense, error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .eq(idField, license_id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: `Failed to extend license: ${updateError.message}`
      }, { status: 400 })
    }

    // Create activity log
    try {
      await supabase
        .from('user_activity_logs')
        .insert([{
          user_id: license.user_id || null,
          activity_type: 'license_extended',
          description: `License extended by admin`,
          metadata: {
            license_id,
            previous_expiry: license.expires_at,
            new_expiry: newExpiresAt,
            extend_days: extend_days || null,
            updated_at: new Date().toISOString()
          }
        }])
    } catch (logError) {
      console.warn('Failed to create activity log:', logError)
    }

    return NextResponse.json({
      success: true,
      license: updatedLicense,
      previous_expiry: license.expires_at,
      new_expiry: newExpiresAt,
      message: `License extended successfully to ${new Date(newExpiresAt).toLocaleDateString()}`
    })

  } catch (error: any) {
    console.error('License extend error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
