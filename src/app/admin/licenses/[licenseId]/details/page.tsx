'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import {
  ArrowLeft,
  Key,
  ShieldCheck,
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Warning,
  Pencil,
  CurrencyDollar,
  CreditCard
} from '@phosphor-icons/react'
import UserAssignmentManager from '@/components/admin/UserAssignmentManager'
import LicenseStatusManager from '@/components/admin/LicenseStatusManager'

interface LicenseDetails {
  id: string
  key_code: string
  license_category: 'main_application' | 'plugin'
  license_type: string
  status: string
  max_users: number
  max_projects: number
  max_storage_gb: number
  
  // Main Application Features
  main_app_permissions?: {
    test_data: boolean
    data_visualization: boolean
    analytics_studio: boolean
    sequencer: boolean
    assets: boolean
    settings: boolean
  }
  main_app_version?: string // e.g., "1.0.3"
  
  // Granular Feature Configurations
  feature_configurations?: {
    data_visualization?: {
      save_limits_to_projects: boolean
      max_flagged_measurements: number | null
      auto_flagger_enabled: boolean
      export_raw_data: boolean
      custom_visualization_templates: boolean
    }
    test_data?: {
      max_concurrent_tests: number | null
      batch_processing: boolean
      data_retention_days: number | null
      custom_test_protocols: boolean
    }
    analytics_studio?: {
      advanced_algorithms: boolean
      custom_reports: boolean
      api_access: boolean
      data_export_formats: string[]
      real_time_analysis: boolean
    }
    sequencer?: {
      max_sequence_length: number | null
      parallel_execution: boolean
      custom_sequence_templates: boolean
      automated_scheduling: boolean
    }
    assets?: {
      asset_versioning: boolean
      asset_sharing: boolean
      metadata_editing: boolean
      bulk_operations: boolean
    }
    settings?: {
      system_configuration: boolean
      user_management: boolean
      integration_settings: boolean
      backup_restore: boolean
    }
  }
  
  // Plugin Features  
  plugin_id?: string
  plugin_name?: string
  plugin_permissions?: any
  plugin_version?: string // e.g., "2.1.0"
  
  features: string[]
  expires_at?: string
  assigned_to?: {
    id: string
    email: string
    full_name: string
  }
  responsible_user?: {
    id: string
    email: string
    full_name: string
  }
  assigned_at?: string
  created_at: string
  updated_at: string
  usage_stats: {
    users_count?: number
    projects_count?: number
    storage_used_gb?: number
  }
  license_key?: string
  license_config?: any
  billing_info?: {
    plan_type: string
    amount: number
    currency: string
    billing_cycle: string
  }
  allows_local_cluster?: boolean
  local_cluster_limits?: {
    max_storage_gb: number
    max_monthly_queries: number
    max_users: number
    lifecycle_tiers_enabled: boolean
    offline_grace_days: number
  }
}

export default function LicenseDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser, userProfile, loading: authLoading } = useAuth()

  const licenseId = params.licenseId as string
  const [license, setLicense] = useState<LicenseDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [relationships, setRelationships] = useState<any[]>([])
  const [relationshipsLoading, setRelationshipsLoading] = useState(false)
  const [editFormData, setEditFormData] = useState({
    license_category: 'main_application' as 'main_application' | 'plugin',
    license_type: '',
    status: 'active',
    max_users: 1,
    max_projects: 10,
    max_storage_gb: 100,
    features: [] as string[],
    expires_at: '',
    
    // Main Application
    main_app_permissions: {
      test_data: false,
      data_visualization: false,
      analytics_studio: false,
      sequencer: false,
      assets: false,
      settings: false
    },
    main_app_version: '1.0.0',
    
    // Granular Feature Configurations
    feature_configurations: {
      data_visualization: {
        save_limits_to_projects: false,
        max_flagged_measurements: 100,
        auto_flagger_enabled: false,
        export_raw_data: false,
        custom_visualization_templates: false
      },
      test_data: {
        max_concurrent_tests: 1,
        batch_processing: false,
        data_retention_days: 30,
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
        max_sequence_length: 50,
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
    
    // Plugin
    plugin_id: '',
    plugin_name: '',
    plugin_version: '1.0.0',

    // Local Cluster Configuration
    allows_local_cluster: false,
    local_cluster_limits: {
      max_storage_gb: 10,
      max_monthly_queries: 100000,
      max_users: 1,
      lifecycle_tiers_enabled: false,
      offline_grace_days: 7
    }
  })

  // Check if user is admin
  const isAdmin = useMemo(() => {
    if (!currentUser) return false

    const allowedRoles = ['admin', 'super_admin', 'superadmin']
    const metadataRole = currentUser.user_metadata?.role
    const profileRole = userProfile?.role

    return allowedRoles.includes(metadataRole) || allowedRoles.includes(profileRole)
  }, [currentUser, userProfile])

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) {
      router.push('/dashboard')
      return
    }
    fetchLicenseDetails()
    fetchRelationships()
  }, [authLoading, isAdmin, licenseId])

  useEffect(() => {
    if (license && !isEditMode) {
      setEditFormData({
        license_category: license.license_category || 'main_application',
        license_type: license.license_type || '',
        status: license.status || 'active',
        max_users: license.max_users || 1,
        max_projects: license.max_projects || 10,
        max_storage_gb: license.max_storage_gb || 100,
        features: license.features || [],
        expires_at: license.expires_at ? license.expires_at.split('T')[0] : '',
        
        // Main Application
        main_app_permissions: license.main_app_permissions || {
          test_data: false,
          data_visualization: false,
          analytics_studio: false,
          sequencer: false,
          assets: false,
          settings: false
        },
        main_app_version: license.main_app_version || '1.0.0',
        
        // Granular Feature Configurations
        feature_configurations: (license.feature_configurations || {
          data_visualization: {
            save_limits_to_projects: false,
            max_flagged_measurements: 100,
            auto_flagger_enabled: false,
            export_raw_data: false,
            custom_visualization_templates: false
          },
          test_data: {
            max_concurrent_tests: 1,
            batch_processing: false,
            data_retention_days: 30,
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
            max_sequence_length: 50,
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
        }) as any,
        
        // Plugin
        plugin_id: license.plugin_id || '',
        plugin_name: license.plugin_name || '',
        plugin_version: license.plugin_version || '1.0.0',

        // Local Cluster Configuration
        allows_local_cluster: license.allows_local_cluster || false,
        local_cluster_limits: license.local_cluster_limits || {
          max_storage_gb: 10,
          max_monthly_queries: 100000,
          max_users: 1,
          lifecycle_tiers_enabled: false,
          offline_grace_days: 7
        }
      })
    }
  }, [license, isEditMode])

  const fetchLicenseDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/licenses/${licenseId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch license details')
      }
      const result = await response.json()

      if (result.success) {
        setLicense(result.license)
      } else {
        throw new Error(result.error || 'Failed to fetch license details')
      }
    } catch (err) {
      console.error('Error fetching license details:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchRelationships = async () => {
    try {
      setRelationshipsLoading(true)
      const response = await fetch('/api/admin/license-subscription-relationships', {
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch relationships')
      }

      const result = await response.json()

      // Filter to only show relationships for this license
      const licenseRelationships = (result.relationships || []).filter(
        (rel: any) => rel.license_id === licenseId
      )

      setRelationships(licenseRelationships)
    } catch (err) {
      console.error('Error fetching relationships:', err)
      // Don't set error state for relationships, just log it
    } finally {
      setRelationshipsLoading(false)
    }
  }

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode)
    if (isEditMode) {
      // Reset form data when canceling
      if (license) {
        setEditFormData({
          license_category: license.license_category || 'main_application',
          license_type: license.license_type || '',
          status: license.status || 'active',
          max_users: license.max_users || 1,
          max_projects: license.max_projects || 10,
          max_storage_gb: license.max_storage_gb || 100,
          features: license.features || [],
          expires_at: license.expires_at ? license.expires_at.split('T')[0] : '',
          
          // Main Application
          main_app_permissions: license.main_app_permissions || {
            test_data: false,
            data_visualization: false,
            analytics_studio: false,
            sequencer: false,
            assets: false,
            settings: false
          },
          main_app_version: license.main_app_version || '1.0.0',
          
          // Plugin
          plugin_id: license.plugin_id || '',
          plugin_name: license.plugin_name || '',
          plugin_version: license.plugin_version || '1.0.0',

          // Local Cluster Configuration
          allows_local_cluster: license.allows_local_cluster || false,
          local_cluster_limits: license.local_cluster_limits || {
            max_storage_gb: 10,
            max_monthly_queries: 100000,
            max_users: 1,
            lifecycle_tiers_enabled: false,
            offline_grace_days: 7
          }
        })
      }
    }
  }

  const handleFormChange = (field: string, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFeaturesChange = (feature: string, checked: boolean) => {
    setEditFormData(prev => ({
      ...prev,
      features: checked 
        ? [...prev.features, feature]
        : prev.features.filter(f => f !== feature)
    }))
  }

  const handleSaveLicense = async () => {
    try {
      setIsSaving(true)
      const response = await fetch(`/api/admin/licenses/${licenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData)
      })

      if (!response.ok) {
        throw new Error('Failed to update license')
      }

      const result = await response.json()
      if (result.success) {
        setLicense(result.license)
        setIsEditMode(false)
      } else {
        throw new Error(result.error || 'Failed to update license')
      }
    } catch (err) {
      console.error('Error updating license:', err)
      setError(err instanceof Error ? err.message : 'Failed to update license')
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'inactive':
        return <XCircle className="h-5 w-5 text-gray-500" />
      case 'trial':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'revoked':
        return <Warning className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'trial':
        return 'bg-blue-100 text-blue-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'revoked':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const mainApplicationFeatures = [
    { id: 'test_data', name: 'Test Data', description: 'Access to test data management' },
    { id: 'data_visualization', name: 'Data Visualization', description: 'Data visualization tools' },
    { id: 'analytics_studio', name: 'Analytics Studio', description: 'Advanced analytics workspace' },
    { id: 'sequencer', name: 'Sequencer', description: 'Test sequence management' },
    { id: 'assets', name: 'Assets', description: 'Asset management system' },
    { id: 'settings', name: 'Settings', description: 'System configuration access' }
  ]

  const knownPlugins = [
    { id: 'klippel-qc', name: 'Klippel QC', description: 'Quality control plugin for audio testing' },
    { id: 'apx500', name: 'APx500', description: 'Audio analyzer integration plugin' }
  ]

  const handleMainAppPermissionChange = (feature: string, checked: boolean) => {
    setEditFormData(prev => ({
      ...prev,
      main_app_permissions: {
        ...prev.main_app_permissions,
        [feature]: checked
      }
    }))
  }

  const handleFeatureConfigChange = (appName: string, featureName: string, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      feature_configurations: {
        ...prev.feature_configurations,
        [appName]: {
          ...prev.feature_configurations[appName],
          [featureName]: value
        }
      }
    }))
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Warning className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Error Loading License</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <Link
              href="/admin/licenses"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="-ml-1 mr-2 h-5 w-5" />
              Back to Licenses
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!license) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Key className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">License Not Found</h3>
          <p className="mt-1 text-sm text-gray-500">The requested license could not be found.</p>
          <div className="mt-6">
            <Link
              href="/admin/licenses"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="-ml-1 mr-2 h-5 w-5" />
              Back to Licenses
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/licenses"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  License Details
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Manage and edit license configuration
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isEditMode ? (
                <>
                  <button
                    onClick={handleSaveLicense}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleEditToggle}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEditToggle}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Pencil className="-ml-1 mr-2 h-5 w-5" />
                  Edit License
                </button>
              )}
            </div>
          </div>
        </div>

        {/* License Overview Card */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Key className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {license.license_key || `License ${license.id.slice(-8)}`}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {license.license_category === 'main_application' ? 'CentCom Application' : 'Plugin'} License
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {license.license_category === 'main_application' 
                      ? `Version ${license.main_app_version || '1.0.0'}` 
                      : license.plugin_name 
                        ? `${license.plugin_name} v${license.plugin_version || '1.0.0'}` 
                        : license.license_type
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(license.status)}
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(license.status)} capitalize`}>
                  {license.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Max Users</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {license.max_users || 'Unlimited'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Current: {license.usage_stats?.users_count || 0}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Max Projects</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {license.max_projects || 'Unlimited'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Current: {license.usage_stats?.projects_count || 0}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Storage (GB)</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {license.max_storage_gb || 'Unlimited'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Used: {Math.round(license.usage_stats?.storage_used_gb || 0)} GB
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {license.license_category === 'main_application' ? 'App Features' : 'Plugin Features'}
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {license.license_category === 'main_application' 
                    ? Object.values(license.main_app_permissions || {}).filter(Boolean).length 
                    : license.features?.length || 0
                  }
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {license.license_category === 'main_application' ? 'Enabled modules' : 'Active features'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* License Details */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">License Information</h3>
              
              <div className="space-y-4">
                {/* License Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">License Category</label>
                  {isEditMode ? (
                    <select
                      value={editFormData.license_category}
                      onChange={(e) => handleFormChange('license_category', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="main_application">Main Application</option>
                      <option value="plugin">Plugin</option>
                    </select>
                  ) : (
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {license.license_category === 'main_application' ? 'CentCom Main Application' : 'Plugin License'}
                    </div>
                  )}
                </div>

                {/* License Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">License Type</label>
                  {isEditMode ? (
                    <select
                      value={editFormData.license_type}
                      onChange={(e) => handleFormChange('license_type', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="trial">Trial</option>
                      <option value="standard">Standard</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                      <option value="gratis">Gratis (Free)</option>
                    </select>
                  ) : (
                    <div className="mt-1 text-sm text-gray-900 dark:text-white capitalize">
                      {license.license_type}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  {isEditMode ? (
                    <select
                      value={editFormData.status}
                      onChange={(e) => handleFormChange('status', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="trial">Trial</option>
                      <option value="expired">Expired</option>
                      <option value="revoked">Revoked</option>
                    </select>
                  ) : (
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(license.status)} capitalize`}>
                        {license.status}
                      </span>
                    </div>
                  )}
                </div>

                {/* Version Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {license.license_category === 'main_application' ? 'CentCom Version' : 'Plugin Version'}
                  </label>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={license.license_category === 'main_application' ? editFormData.main_app_version : editFormData.plugin_version}
                      onChange={(e) => handleFormChange(
                        license.license_category === 'main_application' ? 'main_app_version' : 'plugin_version', 
                        e.target.value
                      )}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., 1.0.3"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {license.license_category === 'main_application' 
                        ? (license.main_app_version || '1.0.0') 
                        : (license.plugin_version || '1.0.0')
                      }
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        (includes all previous versions)
                      </span>
                    </div>
                  )}
                </div>

                {/* Plugin-specific fields */}
                {(license.license_category === 'plugin' || editFormData.license_category === 'plugin') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Plugin Name</label>
                      {isEditMode ? (
                        <select
                          value={editFormData.plugin_id}
                          onChange={(e) => {
                            const selectedPlugin = knownPlugins.find(p => p.id === e.target.value)
                            handleFormChange('plugin_id', e.target.value)
                            handleFormChange('plugin_name', selectedPlugin?.name || '')
                          }}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Select Plugin</option>
                          {knownPlugins.map(plugin => (
                            <option key={plugin.id} value={plugin.id}>{plugin.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="mt-1 text-sm text-gray-900 dark:text-white">
                          {license.plugin_name || license.plugin_id || 'Not specified'}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* License Key Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">License Key Code</label>
                  <div className="mt-1">
                    <code className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {license.key_code}
                    </code>
                  </div>
                </div>

                {/* Expires At */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expires At</label>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={editFormData.expires_at}
                      onChange={(e) => handleFormChange('expires_at', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'Never'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Usage Limits */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Usage Limits</h3>
              
              <div className="space-y-4">
                {/* Max Users */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Users</label>
                  {isEditMode ? (
                    <input
                      type="number"
                      min="1"
                      value={editFormData.max_users}
                      onChange={(e) => handleFormChange('max_users', parseInt(e.target.value) || 1)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {license.max_users || 'Unlimited'}
                    </div>
                  )}
                </div>

                {/* Max Projects */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Projects</label>
                  {isEditMode ? (
                    <input
                      type="number"
                      min="1"
                      value={editFormData.max_projects}
                      onChange={(e) => handleFormChange('max_projects', parseInt(e.target.value) || 1)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {license.max_projects || 'Unlimited'}
                    </div>
                  )}
                </div>

                {/* Max Storage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Storage (GB)</label>
                  {isEditMode ? (
                    <input
                      type="number"
                      min="1"
                      value={editFormData.max_storage_gb}
                      onChange={(e) => handleFormChange('max_storage_gb', parseInt(e.target.value) || 1)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {license.max_storage_gb || 'Unlimited'} GB
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Local Cluster Configuration */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Local Cluster Deployment</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Allow users to deploy local ClickHouse clusters</p>
                </div>
                {isEditMode && (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.allows_local_cluster}
                      onChange={(e) => handleFormChange('allows_local_cluster', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      {editFormData.allows_local_cluster ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                )}
              </div>

              {!isEditMode ? (
                license.allows_local_cluster ? (
                  <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Max Storage</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {license.local_cluster_limits?.max_storage_gb || 10} GB
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Max Monthly Queries</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {license.local_cluster_limits?.max_monthly_queries === -1
                            ? 'Unlimited'
                            : (license.local_cluster_limits?.max_monthly_queries || 100000).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Max Users</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {license.local_cluster_limits?.max_users === -1 ? 'Unlimited' : (license.local_cluster_limits?.max_users || 1)}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Offline Grace Period</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {license.local_cluster_limits?.offline_grace_days || 7} days
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {license.local_cluster_limits?.lifecycle_tiers_enabled ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Lifecycle Tiers {license.local_cluster_limits?.lifecycle_tiers_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Local cluster deployment is not enabled for this license.</p>
                  </div>
                )
              ) : editFormData.allows_local_cluster ? (
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Max Storage */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Storage (GB)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editFormData.local_cluster_limits.max_storage_gb}
                        onChange={(e) => handleFormChange('local_cluster_limits', {
                          ...editFormData.local_cluster_limits,
                          max_storage_gb: parseInt(e.target.value) || 10
                        })}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="e.g., 500"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Maximum storage per local cluster
                      </p>
                    </div>

                    {/* Max Monthly Queries */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Monthly Queries
                      </label>
                      <div className="flex items-center space-x-3 mb-2">
                        <input
                          type="checkbox"
                          id="edit-unlimited-queries"
                          checked={editFormData.local_cluster_limits.max_monthly_queries === -1}
                          onChange={(e) => handleFormChange('local_cluster_limits', {
                            ...editFormData.local_cluster_limits,
                            max_monthly_queries: e.target.checked ? -1 : 100000
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="edit-unlimited-queries" className="text-sm text-gray-700 dark:text-gray-300">
                          Unlimited Queries
                        </label>
                      </div>
                      {editFormData.local_cluster_limits.max_monthly_queries !== -1 && (
                        <input
                          type="number"
                          min="1"
                          value={editFormData.local_cluster_limits.max_monthly_queries}
                          onChange={(e) => handleFormChange('local_cluster_limits', {
                            ...editFormData.local_cluster_limits,
                            max_monthly_queries: parseInt(e.target.value) || 100000
                          })}
                          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., 10000000"
                        />
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {editFormData.local_cluster_limits.max_monthly_queries === -1
                          ? 'No limit on total queries'
                          : 'Total queries across all clusters'}
                      </p>
                    </div>

                    {/* Max Users */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Users (-1 for unlimited)
                      </label>
                      <input
                        type="number"
                        min="-1"
                        value={editFormData.local_cluster_limits.max_users}
                        onChange={(e) => handleFormChange('local_cluster_limits', {
                          ...editFormData.local_cluster_limits,
                          max_users: parseInt(e.target.value) || 1
                        })}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="e.g., 5 or -1"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Number of users who can access
                      </p>
                    </div>

                    {/* Offline Grace Period */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Offline Grace Period (days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editFormData.local_cluster_limits.offline_grace_days}
                        onChange={(e) => handleFormChange('local_cluster_limits', {
                          ...editFormData.local_cluster_limits,
                          offline_grace_days: parseInt(e.target.value) || 7
                        })}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="e.g., 30"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Days offline before restrictions apply
                      </p>
                    </div>
                  </div>

                  {/* Lifecycle Tiers Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        Lifecycle Tiers (Hot/Warm/Cold storage)
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Enable data lifecycle management tiers
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFormData.local_cluster_limits.lifecycle_tiers_enabled}
                        onChange={(e) => handleFormChange('local_cluster_limits', {
                          ...editFormData.local_cluster_limits,
                          lifecycle_tiers_enabled: e.target.checked
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                        {editFormData.local_cluster_limits.lifecycle_tiers_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Features/Permissions */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {license.license_category === 'main_application' ? 'Application Permissions' : 'Plugin Features'}
              </h3>
              
              {license.license_category === 'main_application' ? (
                // Main Application Permissions
                isEditMode ? (
                  <div className="space-y-3">
                    {mainApplicationFeatures.map((feature) => (
                      <div key={feature.id} className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <input
                          type="checkbox"
                          id={`app-${feature.id}`}
                          checked={editFormData.main_app_permissions[feature.id]}
                          onChange={(e) => handleMainAppPermissionChange(feature.id, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                        />
                        <div>
                          <label 
                            htmlFor={`app-${feature.id}`}
                            className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                          >
                            {feature.name}
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Granular Feature Configuration */}
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Advanced Feature Configuration</h4>
                      
                      {/* Data Visualization Configuration */}
                      {editFormData.main_app_permissions.data_visualization && (
                        <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700">
                          <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">Data Visualization Features</h5>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-700 dark:text-gray-300">Save limits to test data projects</label>
                              <input
                                type="checkbox"
                                checked={editFormData.feature_configurations.data_visualization.save_limits_to_projects}
                                onChange={(e) => handleFeatureConfigChange('data_visualization', 'save_limits_to_projects', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-700 dark:text-gray-300">Enable auto-flagger</label>
                              <input
                                type="checkbox"
                                checked={editFormData.feature_configurations.data_visualization.auto_flagger_enabled}
                                onChange={(e) => handleFeatureConfigChange('data_visualization', 'auto_flagger_enabled', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-700 dark:text-gray-300">Export raw data</label>
                              <input
                                type="checkbox"
                                checked={editFormData.feature_configurations.data_visualization.export_raw_data}
                                onChange={(e) => handleFeatureConfigChange('data_visualization', 'export_raw_data', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-700 dark:text-gray-300">Max flagged measurements</label>
                              <input
                                type="number"
                                min="1"
                                value={editFormData.feature_configurations.data_visualization.max_flagged_measurements || ''}
                                onChange={(e) => handleFeatureConfigChange('data_visualization', 'max_flagged_measurements', e.target.value ? parseInt(e.target.value) : null)}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md"
                                placeholder="∞"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Test Data Configuration */}
                      {editFormData.main_app_permissions.test_data && (
                        <div className="mb-6 p-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-700">
                          <h5 className="text-sm font-semibold text-green-900 dark:text-green-200 mb-3">Test Data Features</h5>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-700 dark:text-gray-300">Enable batch processing</label>
                              <input
                                type="checkbox"
                                checked={editFormData.feature_configurations.test_data.batch_processing}
                                onChange={(e) => handleFeatureConfigChange('test_data', 'batch_processing', e.target.checked)}
                                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-700 dark:text-gray-300">Custom test protocols</label>
                              <input
                                type="checkbox"
                                checked={editFormData.feature_configurations.test_data.custom_test_protocols}
                                onChange={(e) => handleFeatureConfigChange('test_data', 'custom_test_protocols', e.target.checked)}
                                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-700 dark:text-gray-300">Max concurrent tests</label>
                              <input
                                type="number"
                                min="1"
                                value={editFormData.feature_configurations.test_data.max_concurrent_tests || ''}
                                onChange={(e) => handleFeatureConfigChange('test_data', 'max_concurrent_tests', e.target.value ? parseInt(e.target.value) : null)}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md"
                                placeholder="∞"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-700 dark:text-gray-300">Data retention (days)</label>
                              <input
                                type="number"
                                min="1"
                                value={editFormData.feature_configurations.test_data.data_retention_days || ''}
                                onChange={(e) => handleFeatureConfigChange('test_data', 'data_retention_days', e.target.value ? parseInt(e.target.value) : null)}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md"
                                placeholder="∞"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Analytics Studio Configuration */}
                      {editFormData.main_app_permissions.analytics_studio && (
                        <div className="mb-6 p-4 border border-purple-200 rounded-lg bg-purple-50 dark:bg-purple-900/20 dark:border-purple-700">
                          <h5 className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-3">Analytics Studio Features</h5>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-700 dark:text-gray-300">Advanced algorithms</label>
                              <input
                                type="checkbox"
                                checked={editFormData.feature_configurations.analytics_studio.advanced_algorithms}
                                onChange={(e) => handleFeatureConfigChange('analytics_studio', 'advanced_algorithms', e.target.checked)}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-700 dark:text-gray-300">Real-time analysis</label>
                              <input
                                type="checkbox"
                                checked={editFormData.feature_configurations.analytics_studio.real_time_analysis}
                                onChange={(e) => handleFeatureConfigChange('analytics_studio', 'real_time_analysis', e.target.checked)}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-700 dark:text-gray-300">API access</label>
                              <input
                                type="checkbox"
                                checked={editFormData.feature_configurations.analytics_studio.api_access}
                                onChange={(e) => handleFeatureConfigChange('analytics_studio', 'api_access', e.target.checked)}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-700 dark:text-gray-300">Custom reports</label>
                              <input
                                type="checkbox"
                                checked={editFormData.feature_configurations.analytics_studio.custom_reports}
                                onChange={(e) => handleFeatureConfigChange('analytics_studio', 'custom_reports', e.target.checked)}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {mainApplicationFeatures.map((feature) => {
                      const isEnabled = license.main_app_permissions?.[feature.id] || false
                      return (
                        <div key={feature.id} className={`p-3 rounded-lg border ${
                          isEnabled 
                            ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20' 
                            : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                        }`}>
                          <div className="flex items-center space-x-2">
                            <div className={`h-2 w-2 rounded-full ${
                              isEnabled ? 'bg-green-500' : 'bg-gray-300'
                            }`}></div>
                            <span className={`text-sm font-medium ${
                              isEnabled ? 'text-green-900 dark:text-green-200' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {feature.name}
                            </span>
                          </div>
                          <p className={`text-xs mt-1 ${
                            isEnabled ? 'text-green-700 dark:text-green-300' : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            {feature.description}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )
              ) : (
                // Plugin Features (existing logic)
                isEditMode ? (
                  <div className="space-y-2">
                    {license.features?.map((feature, index) => (
                      <div key={index} className="text-sm text-gray-900 dark:text-white p-2 border rounded">
                        {feature}
                      </div>
                    )) || <p className="text-sm text-gray-500">No plugin features configured</p>}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {license.features && license.features.length > 0 ? (
                      license.features.map((feature, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                        >
                          {feature}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No plugin features configured</p>
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          {/* License Status Management */}
          <LicenseStatusManager
            licenseId={licenseId}
            currentStatus={license.status}
            onStatusChange={() => {
              fetchLicenseDetails() // Refresh license data when status changes
            }}
          />

          {/* User Assignment & Payment Responsibility Management */}
          <UserAssignmentManager
            licenseId={licenseId}
            assignedUsers={license.assigned_to ? [{ 
              ...license.assigned_to, 
              assigned_at: license.assigned_at 
            }] : []}
            responsibleUser={license.responsible_user}
            licenseType={license.license_type}
            onAssignmentChange={() => {
              fetchLicenseDetails() // Refresh license data when assignments change
            }}
          />
        </div>

        {/* Timeline */}
        <div className="mt-6 bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Timeline</h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Created</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(license.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Last Updated</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(license.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {license.expires_at && (
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Expires</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(license.expires_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Subscriptions */}
        <div className="mt-6 bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Associated Subscriptions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Subscriptions linked to this license
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {relationships.length} {relationships.length === 1 ? 'subscription' : 'subscriptions'}
                </span>
              </div>
            </div>

            {relationshipsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading subscriptions...</span>
              </div>
            ) : relationships.length > 0 ? (
              <div className="space-y-3">
                {relationships.map((rel: any) => (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {rel.subscription?.subscription_key || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {rel.subscription?.subscription_category === 'native_app'
                            ? 'Native App'
                            : rel.subscription?.plugin_type || 'Plugin'
                          } • {rel.subscription?.subscription_type} • {' '}
                          <span className={`font-medium ${
                            rel.subscription?.status === 'active' ? 'text-green-600 dark:text-green-400' :
                            rel.subscription?.status === 'cancelled' ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {rel.subscription?.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Relationship: <span className="font-medium capitalize">{rel.relationship_type.replace('_', ' ')}</span>
                          {rel.notes && ` • ${rel.notes}`}
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/admin/subscriptions/${rel.subscription_id}/details`}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View Details →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No associated subscriptions</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  This license has not been linked to any subscriptions yet.
                </p>
                <div className="mt-4">
                  <Link
                    href="/admin/licenses"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Go to Relationships Tab
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
