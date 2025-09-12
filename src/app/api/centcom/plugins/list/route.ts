import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    // Define available Centcom plugins and their requirements
    const availablePlugins = [
      {
        id: 'general',
        name: 'Centcom Core',
        description: 'Basic Centcom functionality and project management',
        version: '1.0.0',
        required_license_type: 'trial',
        features: [
          {
            id: 'basic_access',
            name: 'Basic Access',
            description: 'Access to core Centcom features',
            required: true
          },
          {
            id: 'project_create',
            name: 'Project Creation',
            description: 'Create and manage projects',
            required: false
          },
          {
            id: 'data_export',
            name: 'Data Export',
            description: 'Export project data and results',
            required: false
          }
        ],
        license_tiers: {
          trial: {
            max_projects: 1,
            max_storage_gb: 1,
            duration_days: 30,
            features: ['basic_access']
          },
          standard: {
            max_projects: 10,
            max_storage_gb: 10,
            duration_days: null,
            features: ['basic_access', 'project_create', 'data_export']
          },
          professional: {
            max_projects: 50,
            max_storage_gb: 50,
            duration_days: null,
            features: ['basic_access', 'project_create', 'data_export', 'advanced_analytics']
          },
          enterprise: {
            max_projects: -1, // unlimited
            max_storage_gb: 500,
            duration_days: null,
            features: ['basic_access', 'project_create', 'data_export', 'advanced_analytics', 'api_access', 'priority_support']
          }
        }
      },
      {
        id: 'klippel_qc',
        name: 'Klippel QC',
        description: 'Quality control and testing with Klippel hardware integration',
        version: '2.1.0',
        required_license_type: 'standard',
        features: [
          {
            id: 'qc_testing',
            name: 'QC Testing',
            description: 'Run quality control tests',
            required: true
          },
          {
            id: 'klippel_hardware',
            name: 'Klippel Hardware Integration',
            description: 'Connect and control Klippel measurement hardware',
            required: true
          },
          {
            id: 'automated_testing',
            name: 'Automated Testing',
            description: 'Set up automated test sequences',
            required: false
          },
          {
            id: 'batch_processing',
            name: 'Batch Processing',
            description: 'Process multiple measurements in batches',
            required: false
          }
        ],
        license_tiers: {
          standard: {
            max_concurrent_tests: 1,
            max_storage_gb: 20,
            features: ['qc_testing', 'klippel_hardware']
          },
          professional: {
            max_concurrent_tests: 5,
            max_storage_gb: 100,
            features: ['qc_testing', 'klippel_hardware', 'automated_testing']
          },
          enterprise: {
            max_concurrent_tests: -1,
            max_storage_gb: 1000,
            features: ['qc_testing', 'klippel_hardware', 'automated_testing', 'batch_processing', 'api_integration']
          }
        }
      },
      {
        id: 'apx500',
        name: 'APx500 Integration',
        description: 'Audio Precision APx500 analyzer integration and control',
        version: '1.5.0',
        required_license_type: 'standard',
        features: [
          {
            id: 'apx_control',
            name: 'APx Control',
            description: 'Control APx500 analyzer remotely',
            required: true
          },
          {
            id: 'measurement_automation',
            name: 'Measurement Automation',
            description: 'Automate measurement sequences',
            required: false
          },
          {
            id: 'custom_sequences',
            name: 'Custom Sequences',
            description: 'Create custom measurement sequences',
            required: false
          }
        ],
        license_tiers: {
          standard: {
            max_concurrent_measurements: 1,
            max_storage_gb: 15,
            features: ['apx_control']
          },
          professional: {
            max_concurrent_measurements: 3,
            max_storage_gb: 75,
            features: ['apx_control', 'measurement_automation']
          },
          enterprise: {
            max_concurrent_measurements: -1,
            max_storage_gb: 500,
            features: ['apx_control', 'measurement_automation', 'custom_sequences', 'api_integration']
          }
        }
      },
      {
        id: 'analytics_pro',
        name: 'Analytics Pro',
        description: 'Advanced analytics and reporting capabilities',
        version: '1.2.0',
        required_license_type: 'professional',
        features: [
          {
            id: 'advanced_analytics',
            name: 'Advanced Analytics',
            description: 'Complex data analysis and visualization',
            required: true
          },
          {
            id: 'custom_reports',
            name: 'Custom Reports',
            description: 'Create custom report templates',
            required: false
          },
          {
            id: 'data_mining',
            name: 'Data Mining',
            description: 'Advanced data mining and pattern recognition',
            required: false
          }
        ],
        license_tiers: {
          professional: {
            max_reports: 50,
            max_storage_gb: 25,
            features: ['advanced_analytics']
          },
          enterprise: {
            max_reports: -1,
            max_storage_gb: 200,
            features: ['advanced_analytics', 'custom_reports', 'data_mining']
          }
        }
      }
    ]

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url)
    const filterByLicense = searchParams.get('license_type')
    const includeFeatures = searchParams.get('include_features') === 'true'

    let filteredPlugins = availablePlugins

    // Filter by license type if specified
    if (filterByLicense) {
      filteredPlugins = availablePlugins.filter(plugin => 
        Object.keys(plugin.license_tiers).includes(filterByLicense)
      )
    }

    // Optionally exclude detailed features to reduce response size
    if (!includeFeatures) {
      filteredPlugins = filteredPlugins.map(plugin => ({
        id: plugin.id,
        name: plugin.name,
        description: plugin.description,
        version: plugin.version,
        required_license_type: plugin.required_license_type
      }))
    }

    return NextResponse.json({ 
      success: true, 
      plugins: filteredPlugins,
      total_count: filteredPlugins.length,
      available_license_types: ['trial', 'standard', 'professional', 'enterprise']
    })

  } catch (error: any) {
    console.error('Plugin list error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

