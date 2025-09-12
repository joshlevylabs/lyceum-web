'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  UserIcon,
  KeyIcon,
  CircleStackIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

export default function FixSetup() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  const createAdminUser = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/admin/create-admin-user', { method: 'POST' })
      const data = await response.json()
      
      setResult({
        success: response.ok,
        status: response.status,
        data
      })
      
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const getStepIcon = (success: boolean) => {
    return success ? 
      <CheckCircleIcon className="h-5 w-5 text-green-500" /> :
      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
  }
  
  const goToAdmin = () => {
    router.push('/admin')
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Fix Admin Setup
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete the admin setup by creating the super admin user and sample data
          </p>
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex">
          <CheckCircleIcon className="flex-shrink-0 w-5 h-5 text-blue-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              ✅ Good News: All Database Tables Exist!
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p className="mb-2">Your admin schema was actually created successfully. The tables that exist:</p>
              <div className="grid grid-cols-2 gap-2">
                <div>• admin_users</div>
                <div>• license_keys</div>
                <div>• database_clusters</div>
                <div>• user_onboarding</div>
                <div>• admin_activity_log</div>
                <div>• platform_metrics</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fix Action */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Complete Setup</h3>
          {!result && (
            <button
              onClick={createAdminUser}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="-ml-1 mr-2 h-5 w-5" />
                  Create Admin User & Sample Data
                </>
              )}
            </button>
          )}
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          This will create the super admin user and populate your admin system with sample data so you can start using it immediately.
        </p>
        
        {/* What this will create */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="border rounded-lg p-3">
            <div className="flex items-center mb-2">
              <UserIcon className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-sm font-medium">Super Admin</span>
            </div>
            <p className="text-xs text-gray-500">admin@lyceum.app</p>
          </div>
          
          <div className="border rounded-lg p-3">
            <div className="flex items-center mb-2">
              <KeyIcon className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm font-medium">License Keys</span>
            </div>
            <p className="text-xs text-gray-500">Sample Enterprise & Pro</p>
          </div>
          
          <div className="border rounded-lg p-3">
            <div className="flex items-center mb-2">
              <CircleStackIcon className="h-5 w-5 text-purple-500 mr-2" />
              <span className="text-sm font-medium">DB Cluster</span>
            </div>
            <p className="text-xs text-gray-500">Production example</p>
          </div>
          
          <div className="border rounded-lg p-3">
            <div className="flex items-center mb-2">
              <ChartBarIcon className="h-5 w-5 text-orange-500 mr-2" />
              <span className="text-sm font-medium">Metrics</span>
            </div>
            <p className="text-xs text-gray-500">Platform analytics</p>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {result.success ? '✅ Setup Complete!' : '⚠️ Setup Results'}
          </h3>
          
          {result.success && result.data?.results && (
            <div className="space-y-3 mb-6">
              {result.data.results.map((step: any, index: number) => (
                <div key={index} className="flex items-center space-x-3">
                  {getStepIcon(step.success)}
                  <span className="text-sm">
                    {step.step}: {step.success ? '✅' : '❌'} {step.message || step.error}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {result.success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-green-900 mb-2">🎉 Admin System Ready!</h4>
              <div className="text-sm text-green-800 space-y-1">
                <p><strong>Super Admin Created:</strong> admin@lyceum.app (username: superadmin)</p>
                <p><strong>Sample Data:</strong> License keys, database cluster, and metrics initialized</p>
                <p><strong>Ready to use:</strong> All admin features are now available</p>
              </div>
            </div>
          )}
          
          <div className="flex space-x-4">
            {result.success && (
              <button
                onClick={goToAdmin}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <ArrowRightIcon className="-ml-1 mr-2 h-5 w-5" />
                Go to Admin Dashboard
              </button>
            )}
            
            <button
              onClick={createAdminUser}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5" />
              Try Again
            </button>
          </div>
          
          {/* Debug Details */}
          <details className="mt-4">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              View detailed results
            </summary>
            <pre className="text-xs bg-gray-100 p-3 rounded mt-2 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex">
          <ExclamationTriangleIcon className="flex-shrink-0 w-5 h-5 text-yellow-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              What Happened?
            </h3>
            <div className="mt-2 text-sm text-yellow-700 space-y-2">
              <p><strong>Schema Creation:</strong> ✅ Worked perfectly - all tables exist</p>
              <p><strong>RPC Function:</strong> ❌ Not available in your Supabase (this is normal)</p>
              <p><strong>Admin User:</strong> ❌ Failed due to foreign key constraint with auth.users</p>
              <p><strong>Solution:</strong> Create admin user directly in admin_users table (bypassing user_profiles)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

