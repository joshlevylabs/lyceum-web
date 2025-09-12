'use client'

import { useState } from 'react'
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline'

export default function DebugSchema() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<'rpc' | 'direct'>('direct')

  const testSchemaCreation = async () => {
    setLoading(true)
    setResult(null)

    try {
      const endpoint = selectedMethod === 'rpc' 
        ? '/api/admin/setup-admin-schema'
        : '/api/admin/setup-admin-schema-direct'
        
      const response = await fetch(endpoint, { method: 'POST' })
      const data = await response.json()
      
      setResult({
        success: response.ok,
        status: response.status,
        data,
        method: selectedMethod
      })
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        method: selectedMethod
      })
    } finally {
      setLoading(false)
    }
  }

  const checkExistingTables = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/check-schema', { method: 'GET' })
      const data = await response.json()
      
      setResult({
        success: response.ok,
        status: response.status,
        data,
        type: 'check'
      })
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'check'
      })
    } finally {
      setLoading(false)
    }
  }

  const createTablesDirectly = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/create-tables-step-by-step', { method: 'POST' })
      const data = await response.json()
      
      setResult({
        success: response.ok,
        status: response.status,
        data,
        type: 'step-by-step'
      })
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'step-by-step'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Admin Schema Debug Tool
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Diagnose and fix admin database schema creation issues
          </p>
        </div>
      </div>

      {/* Method Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Schema Creation Method</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              id="rpc-method"
              type="radio"
              name="method"
              checked={selectedMethod === 'rpc'}
              onChange={() => setSelectedMethod('rpc')}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="rpc-method" className="ml-3 text-sm font-medium text-gray-700">
              RPC Method (Original - using exec_sql function)
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              id="direct-method"
              type="radio"
              name="method"
              checked={selectedMethod === 'direct'}
              onChange={() => setSelectedMethod('direct')}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="direct-method" className="ml-3 text-sm font-medium text-gray-700">
              Direct Method (Individual table creation)
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Debug Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={checkExistingTables}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircleIcon className="h-5 w-5" />
            )}
            <span className="ml-2">Check Existing Tables</span>
          </button>
          
          <button
            onClick={testSchemaCreation}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <CodeBracketIcon className="h-5 w-5" />
            )}
            <span className="ml-2">Test Schema Creation</span>
          </button>
          
          <button
            onClick={createTablesDirectly}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircleIcon className="h-5 w-5" />
            )}
            <span className="ml-2">Create Tables (Step by Step)</span>
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {result.success ? '✅ Success' : '❌ Error'}
          </h3>
          
          <div className="space-y-4">
            {result.type === 'check' && result.success && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="font-medium text-blue-900 mb-2">Existing Tables:</h4>
                <div className="text-sm text-blue-800">
                  {result.data.tables?.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {result.data.tables.map((table: string) => (
                        <li key={table}>{table}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No admin tables found</p>
                  )}
                </div>
              </div>
            )}
            
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex">
          <ExclamationTriangleIcon className="flex-shrink-0 w-5 h-5 text-yellow-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Common Schema Creation Issues
            </h3>
            <div className="mt-2 text-sm text-yellow-700 space-y-2">
              <p><strong>RPC Function Missing:</strong> Supabase may not have the exec_sql function enabled</p>
              <p><strong>Permission Issues:</strong> Service role key may not have sufficient permissions</p>
              <p><strong>Table Conflicts:</strong> Some tables may already exist with different schemas</p>
              <p><strong>SQL Syntax:</strong> Complex SQL may need to be broken into smaller parts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          🔧 Troubleshooting Steps
        </h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p>1. <strong>Check existing tables</strong> to see what's already created</p>
          <p>2. <strong>Try the direct method</strong> if RPC method fails</p>
          <p>3. <strong>Use step-by-step creation</strong> to isolate specific table issues</p>
          <p>4. <strong>Check Supabase logs</strong> in your dashboard for detailed error messages</p>
        </div>
      </div>
    </div>
  )
}

