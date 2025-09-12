'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'

export default function DebugAuth() {
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('password123')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  const testSignup = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const supabase = createClientComponentClient()
      
      console.log('Testing signup with:', { email, password: '***' })
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      setResult({
        success: !error,
        data,
        error: error ? {
          message: error.message,
          status: error.status,
          name: error.name,
          details: error
        } : null,
        timestamp: new Date().toISOString()
      })
      
    } catch (err) {
      setResult({
        success: false,
        error: {
          message: err instanceof Error ? err.message : 'Unknown error',
          details: err
        }
      })
    } finally {
      setLoading(false)
    }
  }
  
  const testSignin = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const supabase = createClientComponentClient()
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      setResult({
        success: !error,
        data,
        error: error ? {
          message: error.message,
          status: error.status,
          name: error.name,
          details: error
        } : null,
        timestamp: new Date().toISOString()
      })
      
    } catch (err) {
      setResult({
        success: false,
        error: {
          message: err instanceof Error ? err.message : 'Unknown error',
          details: err
        }
      })
    } finally {
      setLoading(false)
    }
  }
  
  const checkAuthConfig = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      // Check if we can get the auth settings
      const response = await fetch('/api/health')
      const healthData = await response.json()
      
      setResult({
        health: healthData,
        authConfig: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co',
          hasAnonKey: !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'hardcoded'),
        }
      })
      
    } catch (err) {
      setResult({
        success: false,
        error: {
          message: err instanceof Error ? err.message : 'Unknown error',
          details: err
        }
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            🔍 Auth Debug Tool
          </h1>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={testSignup}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Signup'}
              </button>
              
              <button
                onClick={testSignin}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Signin'}
              </button>
              
              <button
                onClick={checkAuthConfig}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Check Config'}
              </button>
            </div>
            
            {result && (
              <div className="mt-6 p-4 border rounded-lg">
                <h3 className="text-lg font-semibold mb-2">
                  {result.success ? '✅ Success' : '❌ Error'}
                </h3>
                <pre className="text-sm bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">🔧 Common Auth Issues</h3>
              <ul className="text-sm space-y-1">
                <li>• <strong>Email confirmation required:</strong> Check if Supabase requires email confirmation</li>
                <li>• <strong>Domain restrictions:</strong> Some email domains might be blocked</li>
                <li>• <strong>Auth settings:</strong> Supabase auth might not be properly configured</li>
                <li>• <strong>Email service:</strong> Email delivery might not be set up</li>
              </ul>
            </div>
            
            <div className="flex space-x-4">
              <a
                href="https://supabase.com/dashboard/project/kffiaqsihldgqdwagook/auth/users"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Open Supabase Auth Dashboard
              </a>
              
              <a
                href="https://supabase.com/dashboard/project/kffiaqsihldgqdwagook/auth/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Open Auth Settings
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

