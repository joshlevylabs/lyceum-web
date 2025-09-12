'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  KeyIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

interface LicenseFormData {
  license_type: string
  max_users: number
  max_projects: number
  max_storage_gb: number
  features: string[]
  expires_at: string
  assign_to_email: string
  auto_generate_key: boolean
  custom_key: string
}

const LICENSE_TYPES = {
  trial: {
    name: 'Trial',
    description: 'Basic features for evaluation',
    default_users: 3,
    default_projects: 5,
    default_storage: 5,
    default_features: ['analytics_studio'],
    color: 'bg-gray-100 text-gray-800'
  },
  standard: {
    name: 'Standard',
    description: 'Essential features for small teams',
    default_users: 10,
    default_projects: 50,
    default_storage: 25,
    default_features: ['analytics_studio', 'collaboration'],
    color: 'bg-green-100 text-green-800'
  },
  professional: {
    name: 'Professional',
    description: 'Advanced features for growing businesses',
    default_users: 25,
    default_projects: 100,
    default_storage: 100,
    default_features: ['analytics_studio', 'collaboration', 'api_access'],
    color: 'bg-blue-100 text-blue-800'
  },
  enterprise: {
    name: 'Enterprise',
    description: 'Full features for large organizations',
    default_users: 100,
    default_projects: 1000,
    default_storage: 500,
    default_features: ['analytics_studio', 'collaboration', 'api_access', 'priority_support', 'custom_branding'],
    color: 'bg-purple-100 text-purple-800'
  }
}

const AVAILABLE_FEATURES = [
  { id: 'analytics_studio', name: 'Analytics Studio', description: 'Core analytics and visualization tools' },
  { id: 'collaboration', name: 'Team Collaboration', description: 'Real-time collaboration features' },
  { id: 'api_access', name: 'API Access', description: 'REST API for integrations' },
  { id: 'priority_support', name: 'Priority Support', description: '24/7 priority customer support' },
  { id: 'custom_branding', name: 'Custom Branding', description: 'White-label and custom branding options' },
  { id: 'advanced_analytics', name: 'Advanced Analytics', description: 'Machine learning and predictive analytics' },
  { id: 'data_export', name: 'Data Export', description: 'Bulk data export capabilities' },
  { id: 'audit_logging', name: 'Audit Logging', description: 'Comprehensive audit and compliance logs' }
]

export default function CreateLicenseKey() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<LicenseFormData>({
    license_type: 'standard',
    max_users: 10,
    max_projects: 50,
    max_storage_gb: 25,
    features: ['analytics_studio', 'collaboration'],
    expires_at: '',
    assign_to_email: '',
    auto_generate_key: true,
    custom_key: ''
  })

  const handleLicenseTypeChange = (type: string) => {
    const licenseConfig = LICENSE_TYPES[type as keyof typeof LICENSE_TYPES]
    setFormData({
      ...formData,
      license_type: type,
      max_users: licenseConfig.default_users,
      max_projects: licenseConfig.default_projects,
      max_storage_gb: licenseConfig.default_storage,
      features: [...licenseConfig.default_features]
    })
  }

  const handleFeatureToggle = (featureId: string) => {
    setFormData({
      ...formData,
      features: formData.features.includes(featureId)
        ? formData.features.filter(f => f !== featureId)
        : [...formData.features, featureId]
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
        key_code: formData.auto_generate_key ? generateKeyCode() : formData.custom_key
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

      console.log('License created successfully:', result)
      router.push('/admin/licenses')
    } catch (error) {
      console.error('Error creating license:', error)
      alert(error instanceof Error ? error.message : 'Failed to create license')
    } finally {
      setLoading(false)
    }
  }

  const selectedLicenseType = LICENSE_TYPES[formData.license_type as keyof typeof LICENSE_TYPES]

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
            Create License Key
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate a new license key for platform access
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* License Type Selection */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">License Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(LICENSE_TYPES).map(([key, type]) => (
              <div
                key={key}
                className={`relative rounded-lg border p-4 cursor-pointer hover:bg-gray-50 ${
                  formData.license_type === key ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onClick={() => handleLicenseTypeChange(key)}
              >
                {formData.license_type === key && (
                  <div className="absolute top-2 right-2">
                    <CheckIcon className="h-5 w-5 text-blue-600" />
                  </div>
                )}
                <div className="mb-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${type.color}`}>
                    {type.name}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{type.description}</p>
                <div className="mt-2 text-xs text-gray-500">
                  <div>Users: {type.default_users}</div>
                  <div>Projects: {type.default_projects}</div>
                  <div>Storage: {type.default_storage}GB</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* License Configuration */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">License Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                Maximum Projects
              </label>
              <input
                type="number"
                min="1"
                value={formData.max_projects}
                onChange={(e) => setFormData({ ...formData, max_projects: parseInt(e.target.value) })}
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
        </div>

        {/* Features */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Included Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_FEATURES.map((feature) => (
              <div key={feature.id} className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id={feature.id}
                    type="checkbox"
                    checked={formData.features.includes(feature.id)}
                    onChange={() => handleFeatureToggle(feature.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor={feature.id} className="font-medium text-gray-700">
                    {feature.name}
                  </label>
                  <p className="text-gray-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expiry and Assignment */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">License Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">Leave empty for no expiry</p>
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
              <p className="mt-1 text-xs text-gray-500">Email of user to assign this license to</p>
            </div>
          </div>
        </div>

        {/* License Key Generation */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">License Key</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="auto-generate"
                type="radio"
                name="key-generation"
                checked={formData.auto_generate_key}
                onChange={() => setFormData({ ...formData, auto_generate_key: true })}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="auto-generate" className="ml-3 text-sm font-medium text-gray-700">
                Auto-generate license key
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="custom-key"
                type="radio"
                name="key-generation"
                checked={!formData.auto_generate_key}
                onChange={() => setFormData({ ...formData, auto_generate_key: false })}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="custom-key" className="ml-3 text-sm font-medium text-gray-700">
                Use custom license key
              </label>
            </div>
            
            {!formData.auto_generate_key && (
              <div className="ml-7">
                <input
                  type="text"
                  placeholder="Enter custom license key"
                  value={formData.custom_key}
                  onChange={(e) => setFormData({ ...formData, custom_key: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required={!formData.auto_generate_key}
                />
              </div>
            )}
            
            {formData.auto_generate_key && (
              <div className="ml-7 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  Preview: <span className="font-mono font-medium">{generateKeyCode()}</span>
                </p>
              </div>
            )}
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
                Create License Key
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
