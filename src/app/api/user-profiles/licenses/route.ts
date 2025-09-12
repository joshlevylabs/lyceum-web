import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user ID from query params or auth header
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    // Fetch user's assigned licenses from license_keys table
    const { data: licenseKeys, error: licenseKeysError } = await supabase
      .from('license_keys')
      .select(`
        id,
        key_code,
        license_type,
        status,
        features,
        max_users,
        max_projects,
        max_storage_gb,
        expires_at,
        assigned_at,
        created_at,
        enabled_plugins,
        plugin_permissions,
        access_level,
        restrictions,
        license_config,
        usage_stats
      `)
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false })

    if (licenseKeysError) {
      console.error('Error fetching license keys:', licenseKeysError)
    }

    // Fetch user's licenses from the licenses table (alternative structure)
    const { data: licenses, error: licensesError } = await supabase
      .from('licenses')
      .select(`
        id,
        key_id,
        license_type,
        status,
        features,
        max_users,
        max_projects,
        max_storage_gb,
        expires_at,
        assigned_at,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (licensesError) {
      console.error('Error fetching licenses:', licensesError)
    }

    // Fetch user license assignments (if using the enhanced schema)
    const { data: licenseAssignments, error: assignmentsError } = await supabase
      .from('user_license_assignments')
      .select(`
        id,
        assigned_at,
        is_primary,
        notes,
        licenses (
          id,
          key_id,
          license_type,
          status,
          features,
          max_users,
          max_projects,
          max_storage_gb,
          expires_at
        )
      `)
      .eq('user_id', userId)
      .is('revoked_at', null)
      .order('assigned_at', { ascending: false })

    if (assignmentsError) {
      console.error('Error fetching license assignments:', assignmentsError)
    }

    // Fetch subscription/payment information
    const { data: paymentStatus, error: paymentError } = await supabase
      .from('user_payment_status')
      .select(`
        id,
        payment_status,
        subscription_type,
        monthly_amount,
        currency,
        billing_cycle,
        next_billing_date,
        last_payment_date,
        payment_failures,
        notes,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .single()

    if (paymentError && paymentError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching payment status:', paymentError)
    }

    // Fetch recent payment transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('payment_transactions')
      .select(`
        id,
        transaction_type,
        amount,
        currency,
        status,
        payment_method,
        description,
        processed_at,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
    }

    // Fetch resource usage information
    const { data: resourceUsage, error: resourceError } = await supabase
      .from('user_resource_usage')
      .select(`
        storage_used_mb,
        storage_limit_mb,
        bandwidth_used_mb,
        bandwidth_limit_mb,
        api_calls_count,
        api_calls_limit,
        compute_hours_used,
        compute_hours_limit,
        last_usage_update
      `)
      .eq('user_id', userId)
      .single()

    if (resourceError && resourceError.code !== 'PGRST116') {
      console.error('Error fetching resource usage:', resourceError)
    }

    // Define main applications and plugins
    const mainApplications = [
      'analytics-studio',
      'data-visualizer', 
      'test-data',
      'sequencer',
      'assets'
    ]

    const knownPlugins = [
      'klippel-qc',
      'apx500'
    ]

    // Combine all license data with enhanced categorization
    const allLicenses = [
      ...(licenseKeys || []).map(license => ({ ...license, source: 'license_keys' })),
      ...(licenses || []).map(license => ({ ...license, source: 'licenses' })),
      ...(licenseAssignments || []).map(assignment => ({
        ...assignment.licenses,
        assigned_at: assignment.assigned_at,
        is_primary: assignment.is_primary,
        assignment_notes: assignment.notes,
        source: 'user_license_assignments'
      }))
    ]

    // Remove duplicates based on key_id or id
    const uniqueLicenses = allLicenses.filter((license, index, self) => {
      const key = license.key_id || license.id
      return index === self.findIndex(l => (l.key_id || l.id) === key)
    })

    // Categorize and enhance license data
    const categorizedLicenses = uniqueLicenses.map(license => {
      const licenseType = (license.license_type || '').toLowerCase()
      const pluginId = license.plugin_id || license.enabled_plugins?.[0] || ''
      
      // Determine if this is a main application or plugin
      const isMainApplication = mainApplications.some(app => 
        licenseType.includes(app) || 
        licenseType.includes(app.replace('-', '_')) ||
        licenseType.includes(app.replace('-', ''))
      )
      
      const isKnownPlugin = knownPlugins.some(plugin => 
        licenseType.includes(plugin) || 
        pluginId.toLowerCase().includes(plugin) ||
        licenseType.includes(plugin.replace('-', '_'))
      )

      // Get version information from license_config or features
      const versionInfo = license.license_config?.version || 
                         license.license_config?.app_version ||
                         license.features?.find(f => f.includes('version'))?.split(':')[1] ||
                         '1.0.0'

      const pluginVersion = license.license_config?.plugin_version ||
                           license.plugin_permissions?.version ||
                           '1.0.0'

      return {
        ...license,
        category: isMainApplication ? 'main_application' : (isKnownPlugin ? 'plugin' : 'other'),
        application_name: isMainApplication ? 
          formatApplicationName(licenseType) : 
          (isKnownPlugin ? formatPluginName(licenseType, pluginId) : 'Unknown Application'),
        main_app_version: isMainApplication ? versionInfo : null,
        plugin_version: isKnownPlugin ? pluginVersion : null,
        display_name: isMainApplication ? 
          formatApplicationName(licenseType) : 
          (isKnownPlugin ? formatPluginName(licenseType, pluginId) : license.license_type)
      }
    })

    // Separate into categories
    const mainAppLicenses = categorizedLicenses.filter(l => l.category === 'main_application')
    const pluginLicenses = categorizedLicenses.filter(l => l.category === 'plugin')
    const otherLicenses = categorizedLicenses.filter(l => l.category === 'other')

    // Helper functions for formatting names
    function formatApplicationName(licenseType) {
      const nameMap = {
        'analytics-studio': 'Analytics Studio',
        'analytics_studio': 'Analytics Studio',
        'analyticsstudio': 'Analytics Studio',
        'data-visualizer': 'Data Visualizer',
        'data_visualizer': 'Data Visualizer', 
        'datavisualizer': 'Data Visualizer',
        'test-data': 'Test Data',
        'test_data': 'Test Data',
        'testdata': 'Test Data',
        'sequencer': 'Sequencer',
        'assets': 'Assets'
      }

      for (const [key, name] of Object.entries(nameMap)) {
        if (licenseType.includes(key)) return name
      }

      // Fallback: capitalize and format
      return licenseType.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    function formatPluginName(licenseType, pluginId) {
      const nameMap = {
        'klippel-qc': 'Klippel QC',
        'klippel_qc': 'Klippel QC',
        'klippelqc': 'Klippel QC',
        'apx500': 'APx500',
        'apx-500': 'APx500',
        'apx_500': 'APx500'
      }

      for (const [key, name] of Object.entries(nameMap)) {
        if (licenseType.includes(key) || pluginId.toLowerCase().includes(key)) return name
      }

      // Fallback: use plugin ID or license type
      return pluginId || licenseType.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    return NextResponse.json({
      success: true,
      data: {
        licenses: categorizedLicenses,
        license_categories: {
          main_applications: mainAppLicenses,
          plugins: pluginLicenses,
          other: otherLicenses
        },
        subscription: paymentStatus || null,
        transactions: transactions || [],
        resource_usage: resourceUsage || null,
        statistics: {
          total_licenses: categorizedLicenses.length,
          main_app_licenses: mainAppLicenses.length,
          plugin_licenses: pluginLicenses.length,
          active_licenses: categorizedLicenses.filter(l => l.status === 'active').length
        }
      }
    })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
