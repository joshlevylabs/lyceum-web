'use client'

import { useState } from 'react'

export default function TestEndpoints() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState<string | null>(null)

  const testEndpoint = async (name: string, url: string, options: RequestInit = {}) => {
    setLoading(name)
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })
      
      const data = await response.json()
      setResults(prev => ({
        ...prev,
        [name]: {
          status: response.status,
          data,
          success: response.ok
        }
      }))
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [name]: {
          status: 'ERROR',
          data: error.message,
          success: false
        }
      }))
    }
    setLoading(null)
  }

  const tests = [
    {
      name: 'List Existing Users',
      test: () => testEndpoint('listUsers', '/api/admin/users/list')
    },
    {
      name: 'Create Test User',
      test: () => testEndpoint('createUser', '/api/admin/users/invite', {
        method: 'POST',
        body: JSON.stringify({
          email: 'testuser@lyceum.com',
          full_name: 'Test User',
          username: 'testuser',
          company: 'Test Company',
          role: 'engineer',
          send_email: false,
          create_license: true,
          license_type: 'standard'
        })
      })
    },
    {
      name: 'User Verify (Test User)',
      test: () => testEndpoint('userVerifyTest', '/api/centcom/user/verify?email=testuser@lyceum.com')
    },
    {
      name: 'Auth Login (Test User - Will Fail)',
      test: () => testEndpoint('authLoginTest', '/api/centcom/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'testuser@lyceum.com',
          password: 'WrongPassword123',
          app_id: 'centcom'
        })
      })
    },
    {
      name: 'User Verify (Non-existent)',
      test: () => testEndpoint('userVerifyNone', '/api/centcom/user/verify?email=nonexistent@example.com')
    },
    {
      name: 'Auth Login (No Data)',
      test: () => testEndpoint('authLoginNoData', '/api/centcom/auth/login', {
        method: 'POST',
        body: JSON.stringify({})
      })
    },
    {
      name: 'Auth Validate (Invalid Token)',
      test: () => testEndpoint('authValidate', '/api/centcom/auth/validate', {
        method: 'POST',
        body: JSON.stringify({
          session_token: 'invalid_token',
          user_id: 'test-user-id'
        })
      })
    },
    {
      name: 'Setup Auth Tables',
      test: () => testEndpoint('setupTables', '/api/admin/setup-auth-tables', {
        method: 'POST'
      })
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🔐 Centcom Authentication Endpoints Test
        </h1>
        
        <div className="grid gap-4 mb-8">
          {tests.map((test, index) => (
            <button
              key={index}
              onClick={test.test}
              disabled={loading === test.name}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-left"
            >
              {loading === test.name ? '⏳ Testing...' : `🧪 ${test.name}`}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {Object.entries(results).map(([name, result]: [string, any]) => (
            <div key={name} className={`p-4 rounded-lg border ${
              result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <h3 className="font-semibold text-lg mb-2">
                {result.success ? '✅' : '❌'} {name}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Status: <span className="font-mono">{result.status}</span>
              </p>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="font-semibold text-lg mb-2">🔐 Authentication Flow Explanation:</h2>
          <div className="text-sm space-y-2">
            <p><strong>1. Users are created in Supabase-Lyceum:</strong></p>
            <ul className="ml-4 space-y-1">
              <li>• Via signup form: <code>/auth/signup</code></li>
              <li>• Via admin invite: <code>/api/admin/users/invite</code></li>
              <li>• Stored in Supabase Auth + user_profiles table</li>
            </ul>
            
            <p><strong>2. Centcom Authentication Process:</strong></p>
            <ul className="ml-4 space-y-1">
              <li>• User enters email/password in Centcom</li>
              <li>• Centcom calls Lyceum: <code>POST /api/centcom/auth/login</code></li>
              <li>• Lyceum validates against Supabase Auth</li>
              <li>• Returns JWT token if valid</li>
              <li>• Same password works for both systems! 🎯</li>
            </ul>

            <p><strong>3. Test Steps:</strong></p>
            <ul className="ml-4 space-y-1">
              <li>• <strong>List Users:</strong> See existing accounts</li>
              <li>• <strong>Create Test User:</strong> Creates user with temp password</li>
              <li>• <strong>User Verify:</strong> Check if user exists in Lyceum</li>
              <li>• <strong>Auth Login:</strong> Test password validation</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="font-semibold text-lg mb-2">🚀 To Create Real Users:</h2>
          <div className="text-sm space-y-1">
            <li>• <strong>Self-Registration:</strong> Visit <code>http://localhost:3594/auth/signup</code></li>
            <li>• <strong>Admin Creation:</strong> Use "Create Test User" button above</li>
            <li>• <strong>Password Reset:</strong> Users can reset passwords via Lyceum</li>
            <li>• <strong>Centcom Login:</strong> Use same email/password from Lyceum</li>
          </div>
        </div>
      </div>
    </div>
  )
}
