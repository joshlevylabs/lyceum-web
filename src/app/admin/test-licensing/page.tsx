'use client'

import { useState } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  KeyIcon,
  UserIcon,
  PuzzlePieceIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface ValidationResult {
  valid: boolean
  license_id?: string
  license_type?: string
  permissions?: Record<string, any>
  restrictions?: Record<string, any>
  warnings?: string[]
  reason?: string
  message?: string
  [key: string]: any
}

export default function TestLicensing() {
  const [licenseKey, setLicenseKey] = useState('LYC-ENT-2024-SAMPLE01')
  const [userId, setUserId] = useState('')
  const [userType, setUserType] = useState('engineer')
  const [requestedPlugin, setRequestedPlugin] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)

  const validateLicense = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/licenses/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: licenseKey,
          user_id: userId || undefined,
          user_type: userType,
          requested_plugin: requestedPlugin || undefined,
          requested_action: 'access'
        })
      })

      const data = await response.json()
      setResult(data)

    } catch (error) {
      setResult({
        valid: false,
        reason: 'validation_error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const renderValidationResult = () => {
    if (!result) return null

    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          {result.valid ? (
            <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3" />
          ) : (
            <XCircleIcon className="h-6 w-6 text-red-500 mr-3" />
          )}
          <h3 className="text-lg font-medium text-gray-900">
            {result.valid ? 'License Valid' : 'License Invalid'}
          </h3>
        </div>

        {/* Status Message */}
        <div className={`p-4 rounded-md mb-4 ${
          result.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm ${result.valid ? 'text-green-800' : 'text-red-800'}`}>
            {result.message || (result.valid ? 'License validation successful' : 'License validation failed')}
          </p>
          {result.reason && (
            <p className="text-xs text-gray-600 mt-1">
              Reason: {result.reason}
            </p>
          )}
        </div>

        {/* Warnings */}
        {result.warnings && result.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <div className="flex items-center mb-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
              <h4 className="text-sm font-medium text-yellow-800">Warnings</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-yellow-700">
              {result.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* License Info */}
        {result.valid && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">License Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">License ID:</span>
                  <span className="font-mono text-xs">{result.license_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <span className="font-medium">{result.license_type}</span>
                </div>
                {result.expires_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expires:</span>
                    <span>{new Date(result.expires_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Permissions */}
            {result.permissions && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Permissions</h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(result.permissions).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className={typeof value === 'boolean' ? 
                        (value ? 'text-green-600' : 'text-red-600') : 
                        'text-gray-900'
                      }>
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Restrictions */}
        {result.restrictions && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">License Restrictions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(result.restrictions).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                  <div className="mt-1">
                    {typeof value === 'object' ? (
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <span className={typeof value === 'boolean' ? 
                        (value ? 'text-orange-600' : 'text-green-600') : 
                        'text-gray-900'
                      }>
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Usage */}
        {result.current_usage && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Current Usage</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="font-semibold">{result.current_usage.users_count || 0}</div>
                <div className="text-gray-500">Users</div>
                {result.limits && (
                  <div className="text-xs text-gray-400">/ {result.limits.max_users}</div>
                )}
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="font-semibold">{result.current_usage.projects_count || 0}</div>
                <div className="text-gray-500">Projects</div>
                {result.limits && (
                  <div className="text-xs text-gray-400">/ {result.limits.max_projects}</div>
                )}
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="font-semibold">{result.current_usage.storage_used_gb || 0}GB</div>
                <div className="text-gray-500">Storage</div>
                {result.limits && (
                  <div className="text-xs text-gray-400">/ {result.limits.max_storage_gb}GB</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Raw Response */}
        <details className="mt-6">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            View raw validation response
          </summary>
          <pre className="text-xs bg-gray-100 p-3 rounded mt-2 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            License Validation Testing
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Test the enhanced licensing system with time-based, plugin-based, and user-access validation
          </p>
        </div>
      </div>

      {/* Test Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <ShieldCheckIcon className="h-6 w-6 text-blue-500 mr-3" />
          <h3 className="text-lg font-medium text-gray-900">License Validation Test</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <KeyIcon className="h-4 w-4 inline mr-1" />
              License Key
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="LYC-XXX-YYYY-XXXXXX"
            />
            <p className="text-xs text-gray-500 mt-1">Try: LYC-ENT-2024-SAMPLE01 or LYC-PRO-2024-SAMPLE02</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="h-4 w-4 inline mr-1" />
              User Type
            </label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="engineer">Engineer</option>
              <option value="operator">Operator</option>
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID (Optional)
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="user-uuid-here"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <PuzzlePieceIcon className="h-4 w-4 inline mr-1" />
              Plugin to Test (Optional)
            </label>
            <select
              value={requestedPlugin}
              onChange={(e) => setRequestedPlugin(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Select Plugin --</option>
              <option value="klippel_qc">Klippel QC</option>
              <option value="apx500">APx500 Integration</option>
              <option value="advanced_analytics">Advanced Analytics</option>
              <option value="data_export">Data Export Plus</option>
              <option value="real_time_collaboration">Real-time Collaboration</option>
              <option value="custom_dashboards">Custom Dashboards</option>
            </select>
          </div>
        </div>

        <button
          onClick={validateLicense}
          disabled={loading || !licenseKey.trim()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Validating...
            </>
          ) : (
            <>
              <ShieldCheckIcon className="-ml-1 mr-2 h-5 w-5" />
              Validate License
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {renderValidationResult()}

      {/* Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex">
          <InformationCircleIcon className="flex-shrink-0 w-5 h-5 text-blue-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Testing Enhanced Licensing
            </h3>
            <div className="mt-2 text-sm text-blue-700 space-y-2">
              <p><strong>Sample License Keys:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li><code>LYC-ENT-2024-SAMPLE01</code> - Enterprise license with all plugins</li>
                <li><code>LYC-PRO-2024-SAMPLE02</code> - Professional license with limited plugins</li>
              </ul>
              <p><strong>Test Scenarios:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Try different user types (engineer, operator, analyst, viewer)</li>
                <li>Test plugin access (Klippel QC requires enterprise license)</li>
                <li>Check time-based restrictions and warnings</li>
                <li>Validate usage limits and permissions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

