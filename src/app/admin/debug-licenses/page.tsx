'use client'

import { useState, useEffect } from 'react'
import {
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  KeyIcon,
  CircleStackIcon,
  BugAntIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function DebugLicenses() {
  const [licenses, setLicenses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const [testLicenseKey, setTestLicenseKey] = useState('')

  const loadLicenses = async () => {
    setLoading(true)
    try {
      // First try to get licenses from the API
      const response = await fetch('/api/admin/debug-licenses')
      if (response.ok) {
        const data = await response.json()
        setLicenses(data.licenses || [])
      } else {
        console.error('Failed to load licenses:', response.status)
        setLicenses([])
      }
    } catch (error) {
      console.error('Error loading licenses:', error)
      setLicenses([])
    } finally {
      setLoading(false)
    }
  }

  const testValidationAPI = async () => {
    if (!testLicenseKey.trim()) return
    
    setTestResults({ loading: true })
    
    try {
      const response = await fetch('/api/licenses/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: testLicenseKey,
          user_type: 'engineer'
        })
      })
      
      const data = await response.json()
      
      setTestResults({
        loading: false,
        success: response.ok,
        status: response.status,
        data
      })
    } catch (error) {
      setTestResults({
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const createLicenseTables = async () => {
    setTestResults({ loading: true })
    
    try {
      const response = await fetch('/api/admin/create-license-tables-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      setTestResults({
        loading: false,
        success: response.ok,
        status: response.status,
        data,
        type: 'create_tables_manual'
      })
      
      if (response.ok) {
        loadLicenses() // Refresh after table creation
      }
    } catch (error) {
      setTestResults({
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'create_tables_manual'
      })
    }
  }

  const createSimpleTables = async () => {
    setTestResults({ loading: true })
    
    try {
      const response = await fetch('/api/admin/create-simple-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      setTestResults({
        loading: false,
        success: response.ok,
        status: response.status,
        data,
        type: 'create_tables_simple'
      })
      
      if (response.ok) {
        loadLicenses() // Refresh after table creation
      }
    } catch (error) {
      setTestResults({
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'create_tables_simple'
      })
    }
  }

  const createTestLicense = async () => {
    setTestResults({ loading: true })
    
    try {
      const response = await fetch('/api/admin/create-test-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_type: 'professional',
          max_users: 10,
          max_projects: 50,
          max_storage_gb: 100
        })
      })
      
      const data = await response.json()
      
      setTestResults({
        loading: false,
        success: response.ok,
        status: response.status,
        data,
        type: 'create'
      })
      
      if (response.ok && data.license) {
        setTestLicenseKey(data.license.key_code)
        loadLicenses() // Refresh the license list
      }
    } catch (error) {
      setTestResults({
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'create'
      })
    }
  }

  useEffect(() => {
    loadLicenses()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            License Debug Tool
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Debug license creation and validation issues
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Debug Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <button
            onClick={loadLicenses}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <CircleStackIcon className="h-5 w-5" />
            )}
            <span className="ml-2">Load All Licenses</span>
          </button>
          
          <button
            onClick={createLicenseTables}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            <CircleStackIcon className="h-5 w-5" />
            <span className="ml-2">Manual Table Setup</span>
          </button>
          
          <button
            onClick={createSimpleTables}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
          >
            <CircleStackIcon className="h-5 w-5" />
            <span className="ml-2">Try Simple Tables</span>
          </button>
          
          <button
            onClick={createTestLicense}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <KeyIcon className="h-5 w-5" />
            <span className="ml-2">Create Test License</span>
          </button>
          
          <button
            onClick={testValidationAPI}
            disabled={!testLicenseKey.trim()}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            <BugAntIcon className="h-5 w-5" />
            <span className="ml-2">Test Validation API</span>
          </button>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Test License Key
          </label>
          <input
            type="text"
            value={testLicenseKey}
            onChange={(e) => setTestLicenseKey(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter license key to test"
          />
        </div>
      </div>

      {/* Existing Licenses */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Existing Licenses</h3>
          <span className="text-sm text-gray-500">{licenses.length} licenses found</span>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <ArrowPathIcon className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Loading licenses...</span>
          </div>
        ) : licenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {licenses.map((license, index) => (
                  <tr key={license.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {license.key_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {license.license_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        license.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {license.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {license.created_at ? new Date(license.created_at).toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => setTestLicenseKey(license.key_code)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Test This
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No licenses found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No licenses exist in the database. Try creating a test license.
            </p>
          </div>
        )}
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {testResults.loading ? 'Testing...' : 'Test Results'}
          </h3>
          
          {testResults.loading ? (
            <div className="flex items-center py-4">
              <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-500 mr-2" />
              <span>Running test...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status */}
              <div className={`p-4 rounded-md ${
                testResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center">
                  {testResults.success ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                  )}
                  <span className={`text-sm font-medium ${
                    testResults.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {testResults.type === 'create' ? 'License Creation' : 'License Validation'}: {testResults.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${
                  testResults.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  Status: {testResults.status} | {testResults.error || testResults.data?.message || 'See details below'}
                </p>
              </div>

              {/* Manual Table Creation Results */}
              {testResults.type === 'create_tables_manual' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">📋 Manual Table Creation Instructions</h4>
                  <div className="text-sm text-blue-700 space-y-2">
                    <p><strong>Problem:</strong> Supabase doesn't allow automatic table creation via API</p>
                    <p><strong>Solution:</strong> Create tables manually in Supabase dashboard</p>
                    
                    {testResults.data?.solution?.instructions && (
                      <div className="mt-3">
                        <p className="font-medium">Steps:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          {testResults.data.solution.instructions.map((instruction: string, idx: number) => (
                            <li key={idx} className="text-xs">{instruction}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    
                    {testResults.data?.solution?.sql_commands && (
                      <details className="mt-3">
                        <summary className="cursor-pointer font-medium text-blue-800">📄 SQL Commands (click to expand)</summary>
                        <div className="mt-2 space-y-3">
                          <div>
                            <p className="text-xs font-medium">1. License Keys Table:</p>
                            <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-40">
                              {testResults.data.solution.sql_commands.license_keys}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs font-medium">2. Admin Users Table:</p>
                            <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-40">
                              {testResults.data.solution.sql_commands.admin_users}
                            </pre>
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              )}

              {/* Simple Table Creation Results */}
              {testResults.type === 'create_tables_simple' && (
                <div className={`border rounded-md p-4 ${
                  testResults.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <h4 className={`text-sm font-medium mb-2 ${
                    testResults.success ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    🔧 Simple Table Creation Results
                  </h4>
                  <div className="text-sm space-y-2">
                    {testResults.success ? (
                      <p className="text-green-700">✅ {testResults.data?.message}</p>
                    ) : (
                      <div className="text-yellow-700">
                        <p>⚠️ {testResults.data?.message}</p>
                        {testResults.data?.suggestion?.sql && (
                          <details className="mt-2">
                            <summary className="cursor-pointer font-medium">Manual SQL Required</summary>
                            <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-32">
                              {testResults.data.suggestion.sql}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Table Creation Results */}
              {testResults.type === 'create_tables' && (
                <div className={`border rounded-md p-4 ${
                  testResults.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <h4 className={`text-sm font-medium mb-2 ${
                    testResults.success ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    🏗️ Database Table Creation Results
                  </h4>
                  {testResults.data?.steps && (
                    <div className="space-y-1 text-sm">
                      {testResults.data.steps.map((step: any, idx: number) => (
                        <div key={idx} className={`flex items-center ${
                          step.success ? 'text-green-700' : 'text-red-700'
                        }`}>
                          <span className="mr-2">{step.success ? '✅' : '❌'}</span>
                          <span>{step.step}</span>
                          {step.error && <span className="ml-2 text-xs">({step.error})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className={`text-xs mt-2 ${
                    testResults.success ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {testResults.data?.summary ? 
                      `${testResults.data.summary.successful_steps}/${testResults.data.summary.total_steps} steps completed` : 
                      'Check details above'
                    }
                  </p>
                </div>
              )}

              {/* Created License */}
              {testResults.type === 'create' && testResults.success && testResults.data?.license && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">✅ License Created Successfully</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>Key:</strong> <code className="bg-blue-100 px-2 py-1 rounded">{testResults.data.license.key_code}</code></p>
                    <p><strong>Type:</strong> {testResults.data.license.license_type}</p>
                    <p><strong>Status:</strong> {testResults.data.license.status}</p>
                    <p><strong>ID:</strong> {testResults.data.license.id}</p>
                  </div>
                </div>
              )}

              {/* Raw Response */}
              <details>
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  View raw response
                </summary>
                <pre className="text-xs bg-gray-100 p-3 rounded mt-2 overflow-auto">
                  {JSON.stringify(testResults, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Help */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex">
          <ExclamationTriangleIcon className="flex-shrink-0 w-5 h-5 text-yellow-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Debugging Steps
            </h3>
            <div className="mt-2 text-sm text-yellow-700 space-y-2">
              <p>1. <strong>Manual Table Setup:</strong> Get SQL commands to create tables in Supabase dashboard</p>
              <p>2. <strong>Try Simple Tables:</strong> Attempt automatic table creation (may not work)</p>
              <p>3. <strong>Load All Licenses:</strong> Check what licenses exist in the database</p>
              <p>4. <strong>Create Test License:</strong> Create a working license to test with</p>
              <p>5. <strong>Test Validation API:</strong> Test the validation endpoint with a known license</p>
              <p>6. <strong>Common Issue:</strong> Tables must be created manually in Supabase dashboard first</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
