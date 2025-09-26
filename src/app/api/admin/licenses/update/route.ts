import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { license_id, license_type, status, expires_at, max_users, max_projects, max_storage_gb } = body

    if (!license_id) {
      return NextResponse.json({ success: false, error: 'license_id is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Update the license
    const updateData: any = {}
    if (license_type) updateData.license_type = license_type
    if (status) updateData.status = status
    if (expires_at !== undefined) updateData.expires_at = expires_at
    if (max_users !== undefined) updateData.max_users = max_users
    if (max_projects !== undefined) updateData.max_projects = max_projects
    if (max_storage_gb !== undefined) updateData.max_storage_gb = max_storage_gb
    updateData.updated_at = new Date().toISOString()

    const { data: updatedLicense, error: updateError } = await supabase
      .from('licenses')
      .update(updateData)
      .eq('key_id', license_id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({ 
        success: false, 
        error: `License update failed: ${updateError.message}` 
      }, { status: 400 })
    }

    // Create activity log
    try {
      await supabase
        .from('user_activity_logs')
        .insert([{
          user_id: updatedLicense.user_id,
          activity_type: 'license_updated',
          description: `License ${license_id} updated by admin`,
          metadata: { 
            license_id,
            changes: updateData,
            updated_at: new Date().toISOString()
          }
        }])
    } catch (logError) {
      console.warn('Failed to create activity log:', logError)
    }

    return NextResponse.json({ 
      success: true, 
      license: updatedLicense,
      message: 'License updated successfully'
    })

  } catch (error: any) {
    console.error('License update error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    }, { status: 500 })
  }
}







