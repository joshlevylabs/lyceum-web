'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  KeyIcon,
  CheckIcon,
  ClockIcon,
  PuzzlePieceIcon,
  UsersIcon,
  CogIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface AdvancedLicenseFormData {
  // Basic license info
  license_type: string
  max_users: number
  max_projects: number
  max_storage_gb: number
  
  // Time-based licensing
  time_limit_type: 'trial_30' | 'trial_custom' | 'unlimited' | 'fixed_period'
  custom_trial_days?: number
  expires_at?: string
  trial_extension_reason?: string
  
  // Plugin-based licensing
  enabled_plugins: string[]
  plugin_permissions: Record<string, any>
  
  // User access type licensing
  allowed_user_types: string[]
  access_level: 'basic' | 'standard' | 'advanced' | 'full'
  
  // General settings
  assign_to_email: string
  auto_generate_key: boolean
  custom_key: string
  restrictions: Record<string, any>
  license_config: Record<string, any>
}

interface Plugin {
  id: string
  plugin_id: string
  name: string
  description: string
  category: string
  vendor: string
  price_tier: string
  configuration_schema: Record<string, any>
}

const TIME_LIMIT_OPTIONS = [
  { value: 'trial_30', label: '30-Day Trial', description: 'Standard 30-day trial period' },
  { value: 'trial_custom', label: 'Custom Trial', description: 'Custom trial period (days)' },
  { value: 'unlimited', label: 'Unlimited', description: 'No time restrictions' },
  { value: 'fixed_period', label: 'Fixed Period', description: 'Specific start and end dates' }
]

const USER_ACCESS_TYPES = [
  { value: 'engineer', label: 'Engineer', description: 'Full measurement and analysis capabilities' },
  { value: 'operator', label: 'Operator', description: 'Measurement execution and basic analysis' },
  { value: 'analyst', label: 'Analyst', description: 'Data analysis and reporting' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access to results' },
  { value: 'admin', label: 'Administrator', description: 'System administration capabilities' }
]

const ACCESS_LEVELS = [
  { value: 'basic', label: 'Basic', description: 'Core functionality only' },
  { value: 'standard', label: 'Standard', description: 'Standard feature set' },
  { value: 'advanced', label: 'Advanced', description: 'Advanced features and integrations' },
  { value: 'full', label: 'Full', description: 'Complete access to all features' }
]

export default function CreateAdvancedLicense() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [availablePlugins, setAvailablePlugins] = useState<Plugin[]>([])
  const [formData, setFormData] = useState<AdvancedLicenseFormData>({
    license_type: 'standard',
    max_users: 10,
    max_projects: 50,
    max_storage_gb: 25,
    time_limit_type: 'unlimited',
    enabled_plugins: [],
    plugin_permissions: {},
    allowed_user_types: ['engineer', 'operator'],
    access_level: 'standard',
    assign_to_email: '',
    auto_generate_key: true,
    custom_key: '',
    restrictions: {},
    license_config: {}
  })

  useEffect(() => {
    loadAvailablePlugins()
  }, [])

  const loadAvailablePlugins = async () => {
    try {
      // TODO: Replace with actual API call when plugins table is ready
      const mockPlugins: Plugin[] = [
        {
          id: '1',
          plugin_id: 'klippel_qc',
          name: 'Klippel QC',
          description: 'Quality Control measurements and analysis for loudspeakers',
          category: 'measurement',
          vendor: 'Klippel',
          price_tier: 'premium',
          configuration_schema: {
            max_measurements: { type: 'number', default: 1000 },
            export_formats: { type: 'array', default: ['pdf', 'csv'] }
          }
        },
        {
          id: '2',
          plugin_id: 'apx500',
          name: 'APx500 Integration',
          description: 'Audio Precision APx500 measurement system integration',
          category: 'measurement',
          vendor: 'Audio Precision',
          price_tier: 'enterprise',
          configuration_schema: {
            max_channels: { type: 'number', default: 8 },
            sample_rates: { type: 'array', default: [48000, 96000, 192000] }
          }
        },
        {
          id: '3',
          plugin_id: 'advanced_analytics',
          name: 'Advanced Analytics',
          description: 'Machine learning and predictive analytics tools',
          category: 'analysis',
          vendor: 'Lyceum',
          price_tier: 'premium',
          configuration_schema: {
            ml_models: { type: 'number', default: 5 },
            batch_processing: { type: 'boolean', default: true }
          }
        },
        {
          id: '4',
          plugin_id: 'data_export',
          name: 'Data Export Plus',
          description: 'Enhanced data export with custom formats',
          category: 'integration',
          vendor: 'Lyceum',
          price_tier: 'standard',
          configuration_schema: {
            export_formats: { type: 'array', default: ['xlsx', 'csv', 'json', 'xml'] },
            auto_backup: { type: 'boolean', default: false }
          }
        },
        {
          id: '5',
          plugin_id: 'real_time_collaboration',
          name: 'Real-time Collaboration',
          description: 'Enhanced team collaboration features',
          category: 'other',
          vendor: 'Lyceum',
          price_tier: 'standard',
          configuration_schema: {
            max_collaborators: { type: 'number', default: 10 },
            live_chat: { type: 'boolean', default: true }
          }
        },
        {
          id: '6',
          plugin_id: 'custom_dashboards',
          name: 'Custom Dashboards',
          description: 'Create custom visualization dashboards',
          category: 'visualization',
          vendor: 'Lyceum',
          price_tier: 'premium',
          configuration_schema: {
            max_dashboards: { type: 'number', default: 20 },
            custom_widgets: { type: 'boolean', default: true }
          }
        }
      ]
      setAvailablePlugins(mockPlugins)
    } catch (error) {
      console.error('Failed to load plugins:', error)
    }
  }

  const handlePluginToggle = (pluginId: string) => {
    setFormData({
      ...formData,
      enabled_plugins: formData.enabled_plugins.includes(pluginId)
        ? formData.enabled_plugins.filter(id => id !== pluginId)
        : [...formData.enabled_plugins, pluginId]
    })
  }

  const handleUserTypeToggle = (userType: string) => {
    setFormData({
      ...formData,
      allowed_user_types: formData.allowed_user_types.includes(userType)
        ? formData.allowed_user_types.filter(type => type !== userType)
        : [...formData.allowed_user_types, userType]
    })
  }

  const generateKeyCode = () => {
    const prefix = `LYC-${formData.license_type.toUpperCase().slice(0, 3)}-${new Date().getFullYear()}`
    const random = Math.random().toString(36).substr(2, 6).toUpperCase()
    return `${prefix}-${random}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const licenseData = {
        ...formData,
        key_code: formData.auto_generate_key ? generateKeyCode() : formData.custom_key,
        features: [], // Legacy field for compatibility
        
        // Set up restrictions based on configurations
        restrictions: {
          ...formData.restrictions,
          time_based: formData.time_limit_type !== 'unlimited',
          plugin_restricted: formData.enabled_plugins.length > 0,
          user_type_restricted: formData.allowed_user_types.length < USER_ACCESS_TYPES.length
        },
        
        // Configuration object
        license_config: {
          ...formData.license_config,
          created_with: 'advanced_creator',
          version: '2.0'
        }
      }

      const response = await fetch('/api/admin/licenses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(licenseData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create license')
      }

      console.log('Advanced license created successfully:', result)
      router.push('/admin/licenses')
    } catch (error) {
      console.error('Error creating license:', error)
      alert(error instanceof Error ? error.message : 'Failed to create license')
    } finally {
      setLoading(false)
    }
  }

  const getPluginsByCategory = (category: string) => {
    return availablePlugins.filter(plugin => plugin.category === category)
  }

  const pluginCategories = [...new Set(availablePlugins.map(p => p.category))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <Link
          href="/admin/licenses"
          className="mr-4 p-2 text-gray-400 hover:text-gray-600"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Create Advanced License Key
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure time-based, plugin-based, and user-access licensing
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Time-Based Licensing */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ClockIcon className="h-6 w-6 text-blue-500 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">Time-Based Licensing</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {TIME_LIMIT_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`relative rounded-lg border p-4 cursor-pointer hover:bg-gray-50 ${
                  formData.time_limit_type === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onClick={() => setFormData({ ...formData, time_limit_type: option.value as any })}
              >
                {formData.time_limit_type === option.value && (
                  <div className="absolute top-2 right-2">
                    <CheckIcon className="h-5 w-5 text-blue-600" />
                  </div>
                )}
                <h4 className="font-medium text-gray-900">{option.label}</h4>
                <p className="text-sm text-gray-600 mt-1">{option.description}</p>
              </div>
            ))}
          </div>
          
          {/* Custom trial days input */}
          {formData.time_limit_type === 'trial_custom' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trial Period (Days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={formData.custom_trial_days || ''}
                onChange={(e) => setFormData({ ...formData, custom_trial_days: parseInt(e.target.value) })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter number of days"
                required
              />
            </div>
          )}
          
          {/* Fixed period date inputs */}
          {formData.time_limit_type === 'fixed_period' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License Expiry Date
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at || ''}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          )}
          
          {/* Trial extension reason (for super admins) */}
          {(formData.time_limit_type === 'trial_custom' || formData.time_limit_type === 'trial_30') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Extension Reason (Optional)
              </label>
              <textarea
                value={formData.trial_extension_reason || ''}
                onChange={(e) => setFormData({ ...formData, trial_extension_reason: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Reason for trial extension..."
              />
            </div>
          )}
        </div>

        {/* Plugin-Based Licensing */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <PuzzlePieceIcon className="h-6 w-6 text-green-500 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">Plugin-Based Licensing</h3>
          </div>
          
          {pluginCategories.map((category) => (
            <div key={category} className="mb-6">
              <h4 className="text-md font-medium text-gray-800 mb-3 capitalize">
                {category} Plugins
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getPluginsByCategory(category).map((plugin) => (
                  <div key={plugin.plugin_id} className="flex items-start p-3 border rounded-lg">
                    <div className="flex items-center h-5">
                      <input
                        id={plugin.plugin_id}
                        type="checkbox"
                        checked={formData.enabled_plugins.includes(plugin.plugin_id)}
                        onChange={() => handlePluginToggle(plugin.plugin_id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3 text-sm flex-1">
                      <label htmlFor={plugin.plugin_id} className="font-medium text-gray-700 cursor-pointer">
                        {plugin.name}
                      </label>
                      <p className="text-gray-500 text-xs mt-1">{plugin.description}</p>
                      <div className="flex items-center mt-1 space-x-2">
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          {plugin.vendor}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          plugin.price_tier === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                          plugin.price_tier === 'premium' ? 'bg-blue-100 text-blue-800' :
                          plugin.price_tier === 'standard' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {plugin.price_tier}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* User Access Type Licensing */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <UsersIcon className="h-6 w-6 text-purple-500 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">User Access Type Licensing</h3>
          </div>
          
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">Allowed User Types</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {USER_ACCESS_TYPES.map((userType) => (
                <div key={userType.value} className="flex items-start p-3 border rounded-lg">
                  <div className="flex items-center h-5">
                    <input
                      id={userType.value}
                      type="checkbox"
                      checked={formData.allowed_user_types.includes(userType.value)}
                      onChange={() => handleUserTypeToggle(userType.value)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={userType.value} className="font-medium text-gray-700 cursor-pointer">
                      {userType.label}
                    </label>
                    <p className="text-gray-500 text-xs mt-1">{userType.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-gray-800 mb-3">Access Level</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {ACCESS_LEVELS.map((level) => (
                <div
                  key={level.value}
                  className={`relative rounded-lg border p-3 cursor-pointer hover:bg-gray-50 ${
                    formData.access_level === level.value ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onClick={() => setFormData({ ...formData, access_level: level.value as any })}
                >
                  {formData.access_level === level.value && (
                    <div className="absolute top-2 right-2">
                      <CheckIcon className="h-4 w-4 text-blue-600" />
                    </div>
                  )}
                  <h5 className="font-medium text-gray-900 text-sm">{level.label}</h5>
                  <p className="text-xs text-gray-600 mt-1">{level.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Basic License Configuration */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CogIcon className="h-6 w-6 text-orange-500 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">Basic Configuration</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License Type
              </label>
              <select
                value={formData.license_type}
                onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="trial">Trial</option>
                <option value="standard">Standard</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Users
              </label>
              <input
                type="number"
                min="1"
                value={formData.max_users}
                onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Storage Limit (GB)
              </label>
              <input
                type="number"
                min="1"
                value={formData.max_storage_gb}
                onChange={(e) => setFormData({ ...formData, max_storage_gb: parseInt(e.target.value) })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to User (Optional)
            </label>
            <input
              type="email"
              placeholder="user@example.com"
              value={formData.assign_to_email}
              onChange={(e) => setFormData({ ...formData, assign_to_email: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/admin/licenses"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <KeyIcon className="-ml-1 mr-2 h-5 w-5" />
                Create Advanced License
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
