'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  KeyIcon,
  ComputerDesktopIcon,
  PuzzlePieceIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
  CogIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { LICENSE_TYPES, PLUGIN_CONFIGURATIONS, getLicenseTypeConfig, formatLimitValue, getLicenseTypeDescription } from '@/lib/license-types'

interface EnhancedLicenseFormData {
  // Basic info
  license_category: 'main_application' | 'plugin'
  license_type: 'trial' | 'standard' | 'professional' | 'enterprise'
  
  // Main Application
  main_app_version: string
  main_app_permissions: {
    test_data: boolean
    data_visualization: boolean
    analytics_studio: boolean
    sequencer: boolean
    assets: boolean
    settings: boolean
  }
  feature_configurations: any
  
  // Plugin
  plugin_id: string
  plugin_name: string
  plugin_version: string
  plugin_features: Record<string, boolean>
  
  // Usage limits (can override defaults)
  max_users: number
  max_projects: number
  max_storage_gb: number
  
  // Assignment
  assign_to_email: string
  expires_at: string
  
  // Advanced options
  custom_key_code: string
  auto_generate_key: boolean
}

export default function CreateEnhancedLicense() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [previewMode, setPreviewMode] = useState(false)
  
  const [formData, setFormData] = useState<EnhancedLicenseFormData>({
    license_category: 'main_application',
    license_type: 'standard',
    
    main_app_version: '1.0.0',
    main_app_permissions: {
      test_data: true,
      data_visualization: true,
      analytics_studio: true,
      sequencer: false,
      assets: true,
      settings: false
    },
    feature_configurations: {},
    
    plugin_id: '',
    plugin_name: '',
    plugin_version: '1.0.0',
    plugin_features: {},
    
    max_users: 10,
    max_projects: 50,
    max_storage_gb: 25,
    
    assign_to_email: '',
    expires_at: '',
    
    custom_key_code: '',
    auto_generate_key: true
  })

  // Update form data when license type changes
  useEffect(() => {
    const config = getLicenseTypeConfig(formData.license_type)
    if (config) {
      setFormData(prev => ({
        ...prev,
        max_users: config.max_users === -1 ? 999999 : config.max_users,
        max_projects: config.max_projects === -1 ? 999999 : config.max_projects,
        max_storage_gb: config.max_storage_gb === -1 ? 999999 : config.max_storage_gb,
        main_app_permissions: { ...config.default_main_app_permissions },
        feature_configurations: { ...config.feature_configurations }
      }))
    }
  }, [formData.license_type])

  const handleCategoryChange = (category: 'main_application' | 'plugin') => {
    setFormData(prev => ({
      ...prev,
      license_category: category,
      // Reset plugin-specific fields when switching to main app
      plugin_id: category === 'plugin' ? prev.plugin_id : '',
      plugin_name: category === 'plugin' ? prev.plugin_name : '',
      plugin_features: category === 'plugin' ? prev.plugin_features : {}
    }))
  }

  const handlePermissionChange = (permission: string, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      main_app_permissions: {
        ...prev.main_app_permissions,
        [permission]: enabled
      }
    }))
  }

  const handleFeatureConfigChange = (app: string, feature: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      feature_configurations: {
        ...prev.feature_configurations,
        [app]: {
          ...prev.feature_configurations[app],
          [feature]: value
        }
      }
    }))
  }

  const handlePluginFeatureChange = (feature: string, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      plugin_features: {
        ...prev.plugin_features,
        [feature]: enabled
      }
    }))
  }

  const handlePluginSelect = (pluginId: string) => {
    const plugin = PLUGIN_CONFIGURATIONS[pluginId]
    if (plugin) {
      setFormData(prev => ({
        ...prev,
        plugin_id: pluginId,
        plugin_name: plugin.name,
        plugin_version: plugin.default_version,
        plugin_features: Object.keys(plugin.features).reduce((acc, key) => ({
          ...acc,
          [key]: plugin.features[key]
        }), {})
      }))
    }
  }

  const generateKeyCode = () => {
    const prefix = formData.license_category === 'main_application' ? 'CENTCOM' : 'PLUGIN'
    const type = formData.license_type.toUpperCase().slice(0, 3)
    const year = new Date().getFullYear()
    const random = Math.random().toString(36).substr(2, 8).toUpperCase()
    return `${prefix}-${type}-${year}-${random}`
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      
      const submitData = {
        ...formData,
        key_code: formData.auto_generate_key ? generateKeyCode() : formData.custom_key_code,
        expires_at: formData.expires_at || null
      }

      const response = await fetch('/api/admin/licenses/create-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        router.push('/admin/licenses?created=true')
      } else {
        throw new Error(result.error || 'Failed to create license')
      }
    } catch (error) {
      console.error('License creation error:', error)
      alert(error instanceof Error ? error.message : 'Failed to create license')
    } finally {
      setLoading(false)
    }
  }

  const currentConfig = getLicenseTypeConfig(formData.license_type)

  if (previewMode) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setPreviewMode(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">License Preview</h1>
                  <p className="text-sm text-gray-600">Review your license configuration before creating</p>
                </div>
              </div>
              <div className="space-x-3">
                <button
                  onClick={() => setPreviewMode(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create License'}
                </button>
              </div>
            </div>
          </div>

          {/* Preview Content */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">License Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Category</label>
                  <div className="mt-1 flex items-center space-x-2">
                    {formData.license_category === 'main_application' ? (
                      <>
                        <ComputerDesktopIcon className="h-5 w-5 text-blue-600" />
                        <span className="text-gray-900">CentCom Application</span>
                      </>
                    ) : (
                      <>
                        <PuzzlePieceIcon className="h-5 w-5 text-purple-600" />
                        <span className="text-gray-900">Plugin License</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">License Type</label>
                  <div className="mt-1">
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full capitalize ${
                      formData.license_type === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                      formData.license_type === 'professional' ? 'bg-blue-100 text-blue-800' :
                      formData.license_type === 'standard' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {formData.license_type}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{getLicenseTypeDescription(formData.license_type)}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Version</label>
                  <div className="mt-1 text-gray-900">
                    {formData.license_category === 'main_application' ? formData.main_app_version : formData.plugin_version}
                    <span className="text-xs text-gray-500 ml-2">(includes all previous versions)</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Usage Limits</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {formatLimitValue(formData.max_users)} users • {formatLimitValue(formData.max_projects)} projects • {formatLimitValue(formData.max_storage_gb)} GB
                  </div>
                </div>
              </div>
            </div>

            {/* Permissions/Features */}
            {formData.license_category === 'main_application' ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Application Permissions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(formData.main_app_permissions).map(([permission, enabled]) => (
                    <div key={permission} className={`p-3 rounded-lg border ${
                      enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center space-x-2">
                        {enabled ? (
                          <CheckIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <XMarkIcon className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={`text-sm font-medium capitalize ${
                          enabled ? 'text-green-900' : 'text-gray-500'
                        }`}>
                          {permission.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Plugin Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Plugin</label>
                    <div className="mt-1 text-gray-900">{formData.plugin_name || 'Not selected'}</div>
                  </div>
                  {Object.keys(formData.plugin_features).length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Features</label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries(formData.plugin_features).map(([feature, enabled]) => (
                          enabled && (
                            <span key={feature} className="inline-flex px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                              {feature.replace('_', ' ')}
                            </span>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Assignment */}
            {formData.assign_to_email && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Assigned to</label>
                    <div className="mt-1 text-gray-900">{formData.assign_to_email}</div>
                  </div>
                  {formData.expires_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Expires</label>
                      <div className="mt-1 text-gray-900">{new Date(formData.expires_at).toLocaleDateString()}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin/licenses" className="text-gray-500 hover:text-gray-700">
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create License</h1>
                <p className="text-sm text-gray-600">Create a new CentCom or plugin license</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > step ? <CheckIcon className="h-4 w-4" /> : step}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep >= step ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step === 1 ? 'Basic Setup' : step === 2 ? 'Configuration' : 'Review'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Basic Setup */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* License Category */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">License Category</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => handleCategoryChange('main_application')}
                  className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
                    formData.license_category === 'main_application'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <ComputerDesktopIcon className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">CentCom Application</h4>
                      <p className="text-sm text-gray-600">Main application features and modules</p>
                    </div>
                  </div>
                </div>
                <div
                  onClick={() => handleCategoryChange('plugin')}
                  className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
                    formData.license_category === 'plugin'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <PuzzlePieceIcon className="h-8 w-8 text-purple-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">Plugin License</h4>
                      <p className="text-sm text-gray-600">Individual plugin functionality</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* License Type */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">License Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(LICENSE_TYPES).map(([type, config]) => (
                  <div
                    key={type}
                    onClick={() => setFormData(prev => ({ ...prev, license_type: type as any }))}
                    className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
                      formData.license_type === type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 capitalize">{type}</h4>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>{formatLimitValue(config.max_users)} users</div>
                        <div>{formatLimitValue(config.max_projects)} projects</div>
                        <div>{formatLimitValue(config.max_storage_gb)} GB storage</div>
                        {config.trial_duration_days && <div>{config.trial_duration_days} days</div>}
                      </div>
                      <p className="text-xs text-gray-500">{getLicenseTypeDescription(type)}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {currentConfig && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">Selected: {formData.license_type.charAt(0).toUpperCase() + formData.license_type.slice(1)}</div>
                      <div className="text-gray-600">{getLicenseTypeDescription(formData.license_type)}</div>
                      <div className="mt-2 text-xs text-gray-500">
                        Priority Support: {currentConfig.priority_support ? '✓' : '✗'} • 
                        API Rate Limit: {currentConfig.api_rate_limit}/min • 
                        Concurrent Sessions: {formatLimitValue(currentConfig.concurrent_sessions)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Version */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Version Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.license_category === 'main_application' ? 'CentCom Version' : 'Plugin Version'}
                  </label>
                  <input
                    type="text"
                    value={formData.license_category === 'main_application' ? formData.main_app_version : formData.plugin_version}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      [formData.license_category === 'main_application' ? 'main_app_version' : 'plugin_version']: e.target.value
                    }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 1.0.3"
                  />
                  <p className="text-xs text-gray-500 mt-1">License will grant access to this version and all previous versions</p>
                </div>
              </div>
            </div>

            {/* Plugin Selection */}
            {formData.license_category === 'plugin' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Plugin Selection</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(PLUGIN_CONFIGURATIONS).map(([id, plugin]) => (
                    <div
                      key={id}
                      onClick={() => handlePluginSelect(id)}
                      className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
                        formData.plugin_id === id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">{plugin.name}</h4>
                        <p className="text-sm text-gray-600">{plugin.description}</p>
                        <div className="text-xs text-gray-500">Default version: {plugin.default_version}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Next: Configuration
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Configuration */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Main App Permissions */}
            {formData.license_category === 'main_application' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Application Permissions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(formData.main_app_permissions).map(([permission, enabled]) => (
                    <div key={permission} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="text-sm font-medium text-gray-900 capitalize">
                        {permission.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feature Configurations */}
            {formData.license_category === 'main_application' && currentConfig && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Granular Feature Configuration</h3>
                
                {/* Data Visualization Features */}
                {formData.main_app_permissions.data_visualization && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Data Visualization Features</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700">Save limits to test data projects</label>
                        <input
                          type="checkbox"
                          checked={formData.feature_configurations?.data_visualization?.save_limits_to_projects}
                          onChange={(e) => handleFeatureConfigChange('data_visualization', 'save_limits_to_projects', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700">Enable auto-flagger</label>
                        <input
                          type="checkbox"
                          checked={formData.feature_configurations?.data_visualization?.auto_flagger_enabled}
                          onChange={(e) => handleFeatureConfigChange('data_visualization', 'auto_flagger_enabled', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700">Max flagged measurements</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.feature_configurations?.data_visualization?.max_flagged_measurements || ''}
                          onChange={(e) => handleFeatureConfigChange('data_visualization', 'max_flagged_measurements', 
                            e.target.value ? parseInt(e.target.value) : null)}
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="∞"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Test Data Features */}
                {formData.main_app_permissions.test_data && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Test Data Features</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700">Enable batch processing</label>
                        <input
                          type="checkbox"
                          checked={formData.feature_configurations?.test_data?.batch_processing}
                          onChange={(e) => handleFeatureConfigChange('test_data', 'batch_processing', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700">Max concurrent tests</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.feature_configurations?.test_data?.max_concurrent_tests || ''}
                          onChange={(e) => handleFeatureConfigChange('test_data', 'max_concurrent_tests', 
                            e.target.value ? parseInt(e.target.value) : null)}
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="∞"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700">Data retention (days)</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.feature_configurations?.test_data?.data_retention_days || ''}
                          onChange={(e) => handleFeatureConfigChange('test_data', 'data_retention_days', 
                            e.target.value ? parseInt(e.target.value) : null)}
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="∞"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Analytics Studio Features */}
                {formData.main_app_permissions.analytics_studio && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Analytics Studio Features</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700">Advanced algorithms</label>
                        <input
                          type="checkbox"
                          checked={formData.feature_configurations?.analytics_studio?.advanced_algorithms}
                          onChange={(e) => handleFeatureConfigChange('analytics_studio', 'advanced_algorithms', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700">Real-time analysis</label>
                        <input
                          type="checkbox"
                          checked={formData.feature_configurations?.analytics_studio?.real_time_analysis}
                          onChange={(e) => handleFeatureConfigChange('analytics_studio', 'real_time_analysis', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700">API access</label>
                        <input
                          type="checkbox"
                          checked={formData.feature_configurations?.analytics_studio?.api_access}
                          onChange={(e) => handleFeatureConfigChange('analytics_studio', 'api_access', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Plugin Features */}
            {formData.license_category === 'plugin' && formData.plugin_id && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Plugin Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(formData.plugin_features).map(([feature, enabled]) => (
                    <div key={feature} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => handlePluginFeatureChange(feature, e.target.checked)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <label className="text-sm font-medium text-gray-900 capitalize">
                        {feature.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Usage Limits Override */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Limits (Optional Override)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Users</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_users}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_users: parseInt(e.target.value) || 1 }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Projects</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_projects}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_projects: parseInt(e.target.value) || 1 }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Storage (GB)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_storage_gb}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_storage_gb: parseInt(e.target.value) || 1 }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Previous: Basic Setup
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Assignment and Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Assignment */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Email</label>
                  <input
                    type="email"
                    value={formData.assign_to_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, assign_to_email: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="user@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expires At (Optional)</label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Key Generation */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">License Key</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    checked={formData.auto_generate_key}
                    onChange={() => setFormData(prev => ({ ...prev, auto_generate_key: true }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label className="text-sm font-medium text-gray-900">Auto-generate license key</label>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      checked={!formData.auto_generate_key}
                      onChange={() => setFormData(prev => ({ ...prev, auto_generate_key: false }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label className="text-sm font-medium text-gray-900">Custom license key</label>
                  </div>
                  {!formData.auto_generate_key && (
                    <input
                      type="text"
                      value={formData.custom_key_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, custom_key_code: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter custom license key"
                    />
                  )}
                </div>
                {formData.auto_generate_key && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="text-sm text-gray-600">Preview: {generateKeyCode()}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Previous: Configuration
              </button>
              <div className="space-x-3">
                <button
                  onClick={() => setPreviewMode(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Preview
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating License...' : 'Create License'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
