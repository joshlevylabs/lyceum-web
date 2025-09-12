// License Type Definitions and Configurations

export interface LicenseTypeConfig {
  // Basic limits
  max_users: number
  max_projects: number
  max_storage_gb: number
  
  // Default main application permissions
  default_main_app_permissions: {
    test_data: boolean
    data_visualization: boolean
    analytics_studio: boolean
    sequencer: boolean
    assets: boolean
    settings: boolean
  }
  
  // Granular feature configurations for each app
  feature_configurations: {
    data_visualization: {
      save_limits_to_projects: boolean
      max_flagged_measurements: number | null // null = unlimited
      auto_flagger_enabled: boolean
      export_raw_data: boolean
      custom_visualization_templates: boolean
    }
    test_data: {
      max_concurrent_tests: number | null
      batch_processing: boolean
      data_retention_days: number | null
      custom_test_protocols: boolean
    }
    analytics_studio: {
      advanced_algorithms: boolean
      custom_reports: boolean
      api_access: boolean
      data_export_formats: string[]
      real_time_analysis: boolean
    }
    sequencer: {
      max_sequence_length: number | null
      parallel_execution: boolean
      custom_sequence_templates: boolean
      automated_scheduling: boolean
    }
    assets: {
      asset_versioning: boolean
      asset_sharing: boolean
      metadata_editing: boolean
      bulk_operations: boolean
    }
    settings: {
      system_configuration: boolean
      user_management: boolean
      integration_settings: boolean
      backup_restore: boolean
    }
  }
  
  // General features
  priority_support: boolean
  sla_hours: number | null
  concurrent_sessions: number
  api_rate_limit: number // requests per minute
  
  // Trial specific
  trial_duration_days?: number
}

export const LICENSE_TYPES: Record<string, LicenseTypeConfig> = {
  trial: {
    max_users: 1,
    max_projects: 5,
    max_storage_gb: 1,
    
    default_main_app_permissions: {
      test_data: true,
      data_visualization: true,
      analytics_studio: false,
      sequencer: false,
      assets: false,
      settings: false
    },
    
    feature_configurations: {
      data_visualization: {
        save_limits_to_projects: false,
        max_flagged_measurements: 10,
        auto_flagger_enabled: false,
        export_raw_data: false,
        custom_visualization_templates: false
      },
      test_data: {
        max_concurrent_tests: 1,
        batch_processing: false,
        data_retention_days: 7,
        custom_test_protocols: false
      },
      analytics_studio: {
        advanced_algorithms: false,
        custom_reports: false,
        api_access: false,
        data_export_formats: ['pdf'],
        real_time_analysis: false
      },
      sequencer: {
        max_sequence_length: null,
        parallel_execution: false,
        custom_sequence_templates: false,
        automated_scheduling: false
      },
      assets: {
        asset_versioning: false,
        asset_sharing: false,
        metadata_editing: false,
        bulk_operations: false
      },
      settings: {
        system_configuration: false,
        user_management: false,
        integration_settings: false,
        backup_restore: false
      }
    },
    
    priority_support: false,
    sla_hours: null,
    concurrent_sessions: 1,
    api_rate_limit: 10,
    trial_duration_days: 30
  },

  standard: {
    max_users: 10,
    max_projects: 50,
    max_storage_gb: 25,
    
    default_main_app_permissions: {
      test_data: true,
      data_visualization: true,
      analytics_studio: true,
      sequencer: false,
      assets: true,
      settings: false
    },
    
    feature_configurations: {
      data_visualization: {
        save_limits_to_projects: true,
        max_flagged_measurements: 100,
        auto_flagger_enabled: true,
        export_raw_data: true,
        custom_visualization_templates: false
      },
      test_data: {
        max_concurrent_tests: 3,
        batch_processing: true,
        data_retention_days: 90,
        custom_test_protocols: true
      },
      analytics_studio: {
        advanced_algorithms: false,
        custom_reports: true,
        api_access: true,
        data_export_formats: ['pdf', 'excel', 'csv'],
        real_time_analysis: false
      },
      sequencer: {
        max_sequence_length: 50,
        parallel_execution: false,
        custom_sequence_templates: false,
        automated_scheduling: false
      },
      assets: {
        asset_versioning: true,
        asset_sharing: false,
        metadata_editing: true,
        bulk_operations: false
      },
      settings: {
        system_configuration: false,
        user_management: false,
        integration_settings: true,
        backup_restore: false
      }
    },
    
    priority_support: false,
    sla_hours: null,
    concurrent_sessions: 3,
    api_rate_limit: 100
  },

  professional: {
    max_users: 50,
    max_projects: 200,
    max_storage_gb: 100,
    
    default_main_app_permissions: {
      test_data: true,
      data_visualization: true,
      analytics_studio: true,
      sequencer: true,
      assets: true,
      settings: true
    },
    
    feature_configurations: {
      data_visualization: {
        save_limits_to_projects: true,
        max_flagged_measurements: 500,
        auto_flagger_enabled: true,
        export_raw_data: true,
        custom_visualization_templates: true
      },
      test_data: {
        max_concurrent_tests: 10,
        batch_processing: true,
        data_retention_days: 365,
        custom_test_protocols: true
      },
      analytics_studio: {
        advanced_algorithms: true,
        custom_reports: true,
        api_access: true,
        data_export_formats: ['pdf', 'excel', 'csv', 'json', 'xml'],
        real_time_analysis: true
      },
      sequencer: {
        max_sequence_length: 200,
        parallel_execution: true,
        custom_sequence_templates: true,
        automated_scheduling: true
      },
      assets: {
        asset_versioning: true,
        asset_sharing: true,
        metadata_editing: true,
        bulk_operations: true
      },
      settings: {
        system_configuration: true,
        user_management: true,
        integration_settings: true,
        backup_restore: true
      }
    },
    
    priority_support: true,
    sla_hours: 24,
    concurrent_sessions: 10,
    api_rate_limit: 500
  },

  enterprise: {
    max_users: -1, // unlimited
    max_projects: -1, // unlimited
    max_storage_gb: -1, // unlimited
    
    default_main_app_permissions: {
      test_data: true,
      data_visualization: true,
      analytics_studio: true,
      sequencer: true,
      assets: true,
      settings: true
    },
    
    feature_configurations: {
      data_visualization: {
        save_limits_to_projects: true,
        max_flagged_measurements: null, // unlimited
        auto_flagger_enabled: true,
        export_raw_data: true,
        custom_visualization_templates: true
      },
      test_data: {
        max_concurrent_tests: null, // unlimited
        batch_processing: true,
        data_retention_days: null, // unlimited
        custom_test_protocols: true
      },
      analytics_studio: {
        advanced_algorithms: true,
        custom_reports: true,
        api_access: true,
        data_export_formats: ['pdf', 'excel', 'csv', 'json', 'xml', 'hdf5', 'matlab'],
        real_time_analysis: true
      },
      sequencer: {
        max_sequence_length: null, // unlimited
        parallel_execution: true,
        custom_sequence_templates: true,
        automated_scheduling: true
      },
      assets: {
        asset_versioning: true,
        asset_sharing: true,
        metadata_editing: true,
        bulk_operations: true
      },
      settings: {
        system_configuration: true,
        user_management: true,
        integration_settings: true,
        backup_restore: true
      }
    },
    
    priority_support: true,
    sla_hours: 4,
    concurrent_sessions: -1, // unlimited
    api_rate_limit: 2000
  }
}

export const PLUGIN_CONFIGURATIONS: Record<string, any> = {
  'klippel-qc': {
    name: 'Klippel QC',
    description: 'Quality control plugin for audio testing',
    default_version: '2.1.0',
    features: {
      automated_testing: true,
      custom_test_protocols: true,
      batch_processing: true,
      reporting: true,
      integration_apis: true
    },
    license_tiers: {
      standard: {
        max_tests_per_day: 100,
        parallel_processing: false,
        custom_protocols: 5
      },
      professional: {
        max_tests_per_day: 500,
        parallel_processing: true,
        custom_protocols: 25
      },
      enterprise: {
        max_tests_per_day: null, // unlimited
        parallel_processing: true,
        custom_protocols: null // unlimited
      }
    }
  },
  
  'apx500': {
    name: 'APx500',
    description: 'Audio analyzer integration plugin',
    default_version: '1.5.0',
    features: {
      audio_analysis: true,
      measurement_automation: true,
      data_export: true,
      custom_sequences: true,
      hardware_integration: true
    },
    license_tiers: {
      standard: {
        max_measurements_per_session: 50,
        concurrent_analyzers: 1,
        export_formats: ['wav', 'csv']
      },
      professional: {
        max_measurements_per_session: 200,
        concurrent_analyzers: 3,
        export_formats: ['wav', 'csv', 'json', 'xml']
      },
      enterprise: {
        max_measurements_per_session: null, // unlimited
        concurrent_analyzers: null, // unlimited
        export_formats: ['wav', 'csv', 'json', 'xml', 'matlab', 'python']
      }
    }
  }
}

// Helper functions
export function getLicenseTypeConfig(licenseType: string): LicenseTypeConfig | null {
  return LICENSE_TYPES[licenseType] || null
}

export function formatLimitValue(value: number | null): string {
  if (value === null || value === -1) return 'Unlimited'
  return value.toString()
}

export function getLicenseTypeDescription(licenseType: string): string {
  const descriptions = {
    trial: 'Perfect for evaluation with basic features and limited usage',
    standard: 'Ideal for small teams with essential CentCom features',
    professional: 'Full-featured license for growing teams and advanced workflows',
    enterprise: 'Unlimited access with priority support and custom configurations'
  }
  return descriptions[licenseType as keyof typeof descriptions] || 'Unknown license type'
}
