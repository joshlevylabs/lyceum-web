import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ licenseId: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { licenseId } = await params

    // Fetch from license_keys table only (the licenses table doesn't exist)
    const { data: license, error: licenseError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('id', licenseId)
      .single()

    if (licenseError || !license) {
      console.error('License fetch error:', licenseError)
      return NextResponse.json({ 
        success: false,
        error: 'License not found',
        details: licenseError?.message 
      }, { status: 404 })
    }

    // Get assigned user details if license is assigned
    let assignedUser = null
    if (license.assigned_to) {
      const { data: user } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .eq('id', license.assigned_to)
        .single()
      
      if (user) {
        assignedUser = user
      }
    }

    // Extract enhanced data from JSONB fields
    const licenseConfig = license.license_config || {}
    const pluginPerms = license.plugin_permissions || {}

    // Combine license data with enhanced fields from JSONB
    const licenseWithStats = {
      ...license,
      assigned_to: assignedUser,
      
      // Enhanced fields from license_config
      license_category: licenseConfig.license_category || 'main_application',
      main_app_permissions: licenseConfig.main_app_permissions || {
        test_data: false,
        data_visualization: false,
        analytics_studio: false,
        sequencer: false,
        assets: false,
        settings: false
      },
      main_app_version: licenseConfig.main_app_version || '1.0.0',
      feature_configurations: licenseConfig.feature_configurations || {},
      
      // Plugin fields from plugin_permissions
      plugin_id: pluginPerms.plugin_id || null,
      plugin_name: pluginPerms.plugin_name || null,
      plugin_version: pluginPerms.plugin_version || '1.0.0',
      
      usage_stats: {
        users_count: assignedUser ? 1 : 0,
        projects_count: 0,
        storage_used_gb: 0
      },
      license_key: license.key_code || `LIC-${license.created_at ? new Date(license.created_at).getFullYear() : new Date().getFullYear()}-${String(licenseId).slice(-4).toUpperCase()}`
    }

    return NextResponse.json({
      success: true,
      license: licenseWithStats
    })

  } catch (error) {
    console.error('Get license error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ licenseId: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { licenseId } = await params
    const updateData = await request.json()

    // Get current license to preserve existing config
    const { data: currentLicense, error: fetchError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('id', licenseId)
      .single()

    if (fetchError || !currentLicense) {
      return NextResponse.json({ 
        success: false,
        error: 'License not found',
        details: fetchError?.message 
      }, { status: 404 })
    }

    // Prepare update data for license_keys table structure
    const updatePayload: any = {
      updated_at: new Date().toISOString()
    }

    // Basic fields that exist as columns
    if (updateData.license_type) updatePayload.license_type = updateData.license_type
    if (updateData.status) updatePayload.status = updateData.status
    if (updateData.max_users !== undefined) updatePayload.max_users = updateData.max_users
    if (updateData.max_projects !== undefined) updatePayload.max_projects = updateData.max_projects
    if (updateData.max_storage_gb !== undefined) updatePayload.max_storage_gb = updateData.max_storage_gb
    if (updateData.features) updatePayload.features = updateData.features
    
    if (updateData.expires_at) {
      const expiryDate = new Date(updateData.expires_at)
      updatePayload.expires_at = expiryDate.toISOString()
    }

    // Handle enhanced fields in license_config JSONB
    const currentConfig = currentLicense.license_config || {}
    const updatedConfig = { ...currentConfig }

    if (updateData.license_category !== undefined) updatedConfig.license_category = updateData.license_category
    if (updateData.main_app_permissions) updatedConfig.main_app_permissions = updateData.main_app_permissions
    if (updateData.main_app_version !== undefined) updatedConfig.main_app_version = updateData.main_app_version
    if (updateData.feature_configurations) updatedConfig.feature_configurations = updateData.feature_configurations

    // Update the license_config JSONB field
    updatePayload.license_config = updatedConfig

    // Handle plugin data in plugin_permissions JSONB
    if (updateData.plugin_id !== undefined || updateData.plugin_name !== undefined || updateData.plugin_version !== undefined) {
      const currentPluginPerms = currentLicense.plugin_permissions || {}
      const updatedPluginPerms = { ...currentPluginPerms }
      
      if (updateData.plugin_id !== undefined) updatedPluginPerms.plugin_id = updateData.plugin_id
      if (updateData.plugin_name !== undefined) updatedPluginPerms.plugin_name = updateData.plugin_name
      if (updateData.plugin_version !== undefined) updatedPluginPerms.plugin_version = updateData.plugin_version
      
      updatePayload.plugin_permissions = updatedPluginPerms
    }

    // Update in license_keys table only
    const { data: updatedLicense, error: updateError } = await supabase
      .from('license_keys')
      .update(updatePayload)
      .eq('id', licenseId)
      .select()
      .single()

    if (updateError) {
      console.error('License update error:', updateError)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to update license',
        details: updateError.message 
      }, { status: 400 })
    }

    // Get assigned user details if license is assigned
    let assignedUser = null
    if (updatedLicense.assigned_to) {
      const { data: user } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .eq('id', updatedLicense.assigned_to)
        .single()
      
      if (user) {
        assignedUser = user
      }
    }

    // Extract enhanced data from JSONB fields for response
    const licenseConfig = updatedLicense.license_config || {}
    const pluginPerms = updatedLicense.plugin_permissions || {}

    // Combine updated license data with enhanced fields
    const licenseWithStats = {
      ...updatedLicense,
      assigned_to: assignedUser,
      
      // Enhanced fields from license_config
      license_category: licenseConfig.license_category || 'main_application',
      main_app_permissions: licenseConfig.main_app_permissions || {
        test_data: false,
        data_visualization: false,
        analytics_studio: false,
        sequencer: false,
        assets: false,
        settings: false
      },
      main_app_version: licenseConfig.main_app_version || '1.0.0',
      feature_configurations: licenseConfig.feature_configurations || {},
      
      // Plugin fields from plugin_permissions
      plugin_id: pluginPerms.plugin_id || null,
      plugin_name: pluginPerms.plugin_name || null,
      plugin_version: pluginPerms.plugin_version || null,
      
      usage_stats: {
        users_count: assignedUser ? 1 : 0,
        projects_count: 0, 
        storage_used_gb: 0
      },
      license_key: updatedLicense.key_code || `LIC-${updatedLicense.created_at ? new Date(updatedLicense.created_at).getFullYear() : new Date().getFullYear()}-${String(licenseId).slice(-4).toUpperCase()}`
    }

    return NextResponse.json({
      success: true,
      license: licenseWithStats
    })

  } catch (error) {
    console.error('Update license error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ licenseId: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { licenseId } = await params

    // Try to delete from both tables (same pattern as other endpoints)
    let deleteError = null
    let deleted = false

    // First try deleting from 'licenses' table
    const { error: centcomDeleteError } = await supabase
      .from('licenses')
      .delete()
      .eq('key_id', licenseId)

    if (!centcomDeleteError) {
      deleted = true
    } else {
      // Fallback to 'license_keys' table
      const { error: legacyDeleteError } = await supabase
        .from('license_keys')
        .delete()
        .eq('id', licenseId)

      if (!legacyDeleteError) {
        deleted = true
      } else {
        deleteError = legacyDeleteError
      }
    }

    if (!deleted) {
      console.error('License deletion error:', deleteError)
      return NextResponse.json({ error: 'License not found or failed to delete' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'License deleted successfully'
    })

  } catch (error) {
    console.error('Delete license error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
