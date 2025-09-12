import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { 
      license_key, 
      user_id, 
      user_type, 
      requested_plugin, 
      requested_action 
    } = body

    console.log('License validation request:', { license_key, user_type, requested_plugin })

    // Step 1: Find the license
    const { data: license, error: licenseError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('key_code', license_key)
      .eq('status', 'active')
      .single()

    console.log('License query result:', { license, error: licenseError })

    if (licenseError || !license) {
      return NextResponse.json({
        valid: false,
        reason: 'license_not_found',
        message: 'License key not found or inactive',
        debug: {
          searched_key: license_key,
          error: licenseError?.message,
          error_code: licenseError?.code
        }
      }, { status: 404 })
    }

    const validationResult = {
      valid: true,
      license_id: license.id,
      license_type: license.license_type,
      permissions: {},
      restrictions: {},
      warnings: []
    }

    // Step 2: Check onboarding requirements for trial licenses
    if (license.license_type === 'trial') {
      const onboardingValidation = await validateOnboardingRequirements(license, user_id)
      if (!onboardingValidation.valid) {
        return NextResponse.json({
          valid: false,
          ...onboardingValidation
        })
      }
      if (onboardingValidation.warnings && onboardingValidation.warnings.length > 0) {
        validationResult.warnings.push(...onboardingValidation.warnings)
      }
    }

    // Step 3: Check time-based restrictions
    const timeValidation = validateTimeRestrictions(license)
    if (!timeValidation.valid) {
      return NextResponse.json({
        valid: false,
        reason: timeValidation.reason,
        message: timeValidation.message,
        expires_at: license.expires_at
      }, { status: 403 })
    }
    
    if (timeValidation.warnings) {
      validationResult.warnings.push(...timeValidation.warnings)
    }

    // Step 4: Check user type restrictions
    if (user_type && license.allowed_user_types) {
      if (!license.allowed_user_types.includes(user_type)) {
        return NextResponse.json({
          valid: false,
          reason: 'user_type_not_allowed',
          message: `User type '${user_type}' is not allowed for this license`,
          allowed_user_types: license.allowed_user_types
        }, { status: 403 })
      }
    }

    // Step 5: Check plugin restrictions
    if (requested_plugin && license.enabled_plugins) {
      if (!license.enabled_plugins.includes(requested_plugin)) {
        return NextResponse.json({
          valid: false,
          reason: 'plugin_not_enabled',
          message: `Plugin '${requested_plugin}' is not enabled for this license`,
          enabled_plugins: license.enabled_plugins
        }, { status: 403 })
      }
      
      // Check plugin-specific permissions
      const pluginPermissions = license.plugin_permissions?.[requested_plugin] || {}
      validationResult.permissions[requested_plugin] = pluginPermissions
    }

    // Step 6: Check usage limits
    const usageValidation = await validateUsageLimits(supabase, license, user_id)
    if (!usageValidation.valid) {
      return NextResponse.json({
        valid: false,
        reason: usageValidation.reason,
        message: usageValidation.message,
        current_usage: usageValidation.current_usage,
        limits: usageValidation.limits
      }, { status: 403 })
    }

    // Step 7: Set permissions based on access level
    validationResult.permissions = {
      ...validationResult.permissions,
      access_level: license.access_level || 'standard',
      can_create_projects: checkProjectCreationPermission(license, usageValidation.current_usage),
      can_invite_users: checkUserInvitePermission(license, usageValidation.current_usage),
      can_export_data: license.enabled_plugins?.includes('data_export') || license.access_level === 'full',
      can_use_api: license.enabled_plugins?.includes('api_access') || license.access_level === 'advanced' || license.access_level === 'full',
      can_collaborate: license.enabled_plugins?.includes('real_time_collaboration') || license.access_level !== 'basic'
    }

    // Step 8: Add restrictions information
    validationResult.restrictions = {
      time_limited: license.time_limit_type !== 'unlimited',
      plugin_restricted: license.enabled_plugins?.length > 0,
      user_type_restricted: license.allowed_user_types?.length < 5,
      usage_limits: {
        max_users: license.max_users,
        max_projects: license.max_projects,
        max_storage_gb: license.max_storage_gb
      }
    }

    console.log('Validation successful:', validationResult)

    return NextResponse.json(validationResult)

  } catch (error) {
    console.error('License validation error:', error)
    return NextResponse.json({ 
      valid: false,
      reason: 'validation_error',
      message: 'Internal error during license validation',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

function validateTimeRestrictions(license: any) {
  const now = new Date()
  const warnings = []

  // Check if license has expired
  if (license.expires_at) {
    const expiryDate = new Date(license.expires_at)
    if (now > expiryDate) {
      return {
        valid: false,
        reason: 'license_expired',
        message: `License expired on ${expiryDate.toLocaleDateString()}`
      }
    }

    // Check if expiring soon (within 7 days)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    if (expiryDate <= sevenDaysFromNow) {
      warnings.push(`License expires on ${expiryDate.toLocaleDateString()}`)
    }
  }

  // Handle custom trial logic
  if (license.time_limit_type === 'trial_custom' && license.custom_trial_days) {
    const createdDate = new Date(license.created_at)
    const trialEndDate = new Date(createdDate)
    trialEndDate.setDate(trialEndDate.getDate() + license.custom_trial_days)

    if (now > trialEndDate) {
      return {
        valid: false,
        reason: 'trial_expired',
        message: `Trial period of ${license.custom_trial_days} days has expired`
      }
    }

    // Warning if trial expires soon
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    if (trialEndDate <= threeDaysFromNow) {
      warnings.push(`Trial expires on ${trialEndDate.toLocaleDateString()}`)
    }
  }

  return { valid: true, warnings }
}

async function validateUsageLimits(supabase: any, license: any, user_id?: string) {
  try {
    // Get current usage statistics
    const currentUsage = {
      users_count: 0,
      projects_count: 0,
      storage_used_gb: 0
    }

    // TODO: Implement actual usage counting queries
    // For now, return mock data
    currentUsage.users_count = Math.floor(Math.random() * license.max_users * 0.8)
    currentUsage.projects_count = Math.floor(Math.random() * license.max_projects * 0.6)
    currentUsage.storage_used_gb = Math.floor(Math.random() * license.max_storage_gb * 0.4)

    // Check limits
    if (currentUsage.users_count >= license.max_users) {
      return {
        valid: false,
        reason: 'user_limit_exceeded',
        message: `User limit of ${license.max_users} has been reached`,
        current_usage: currentUsage,
        limits: {
          max_users: license.max_users,
          max_projects: license.max_projects,
          max_storage_gb: license.max_storage_gb
        }
      }
    }

    if (currentUsage.projects_count >= license.max_projects) {
      return {
        valid: false,
        reason: 'project_limit_exceeded',
        message: `Project limit of ${license.max_projects} has been reached`,
        current_usage: currentUsage,
        limits: {
          max_users: license.max_users,
          max_projects: license.max_projects,
          max_storage_gb: license.max_storage_gb
        }
      }
    }

    if (currentUsage.storage_used_gb >= license.max_storage_gb) {
      return {
        valid: false,
        reason: 'storage_limit_exceeded',
        message: `Storage limit of ${license.max_storage_gb}GB has been reached`,
        current_usage: currentUsage,
        limits: {
          max_users: license.max_users,
          max_projects: license.max_projects,
          max_storage_gb: license.max_storage_gb
        }
      }
    }

    return {
      valid: true,
      current_usage: currentUsage,
      limits: {
        max_users: license.max_users,
        max_projects: license.max_projects,
        max_storage_gb: license.max_storage_gb
      }
    }
  } catch (error) {
    return {
      valid: false,
      reason: 'usage_check_failed',
      message: 'Failed to check current usage limits'
    }
  }
}

function checkProjectCreationPermission(license: any, currentUsage: any): boolean {
  return currentUsage.projects_count < license.max_projects
}

function checkUserInvitePermission(license: any, currentUsage: any): boolean {
  return currentUsage.users_count < license.max_users
}

// Validate onboarding requirements for trial licenses
async function validateOnboardingRequirements(license: any, user_id?: string) {
  try {
    if (!user_id) {
      return {
        valid: false,
        reason: 'onboarding_required',
        message: 'Trial licenses require user identification for onboarding validation'
      }
    }

    // Call the onboarding validation API
    const onboardingResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/onboarding/validate-license-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        license_key_id: license.id,
        user_id: user_id,
        plugin_id: license.plugin_id || 'centcom'
      })
    })

    if (!onboardingResponse.ok) {
      console.error('Onboarding validation failed:', onboardingResponse.status)
      // If onboarding service fails, allow access but warn
      return {
        valid: true,
        warnings: ['Unable to verify onboarding status - please contact administrator']
      }
    }

    const onboardingResult = await onboardingResponse.json()
    
    if (!onboardingResult.valid) {
      return {
        valid: false,
        reason: onboardingResult.reason || 'onboarding_incomplete',
        message: onboardingResult.action === 'license_suspended' 
          ? 'Trial license suspended due to incomplete onboarding'
          : 'Trial license requires completed onboarding sessions',
        onboarding_status: onboardingResult.progress,
        next_steps: onboardingResult.next_steps
      }
    }

    // Extract warnings if any
    const warnings = []
    if (onboardingResult.action === 'allow_access_with_warning') {
      warnings.push(onboardingResult.warning)
    }

    return {
      valid: true,
      warnings: warnings,
      onboarding_status: onboardingResult.progress
    }

  } catch (error) {
    console.error('Error validating onboarding requirements:', error)
    // If validation fails, allow access but warn
    return {
      valid: true,
      warnings: ['Unable to verify onboarding status - please contact administrator']
    }
  }
}