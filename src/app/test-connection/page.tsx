'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@/lib/supabase'

export default function TestConnection() {
  const [connectionStatus, setConnectionStatus] = useState('Testing...')
  const [details, setDetails] = useState<any>({})
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    testConnection()
  }, [])
  
  const testConnection = async () => {
    try {
      setLoading(true)
      const supabase = createClientComponentClient()
      
      // Test 1: Basic connection
      console.log('Testing Supabase connection...')
      
      // Test 2: Try to access user_profiles table
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('count', { count: 'exact', head: true })
      
      // Test 3: Check auth
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      // Test 4: Call our health API
      let healthStatus = null
      try {
        const response = await fetch('/api/health')
        healthStatus = await response.json()
      } catch (healthError) {
        console.log('Health API error:', healthError)
      }
      
      const results = {
        profileTable: profileError ? `❌ Error: ${profileError.message}` : '✅ Accessible',
        auth: userError ? `❌ Error: ${userError.message}` : `✅ Working (User: ${user ? 'Logged in' : 'Not logged in'})`,
        healthAPI: healthStatus ? `✅ Response: ${JSON.stringify(healthStatus, null, 2)}` : '❌ No response',
        tableExists: !profileError
      }
      
      setDetails(results)
      
      if (profileError?.message?.includes('relation "user_profiles" does not exist')) {
        setConnectionStatus('🔶 Connected but database tables missing')
      } else if (profileError) {
        setConnectionStatus('❌ Connection error')
      } else {
        setConnectionStatus('✅ Connected and working!')
      }
      
    } catch (error) {
      setConnectionStatus('❌ Connection failed')
      setDetails({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }
  
  const createTables = async () => {
    try {
      const response = await fetch('/api/setup-database', { method: 'POST' })
      const result = await response.json()
      
      if (response.ok) {
        alert('Database setup completed! Refreshing connection test...')
        testConnection()
      } else {
        alert(`Setup failed: ${result.error}`)
      }
    } catch (error) {
      alert(`Setup failed: ${error}`)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            🔗 Supabase Connection Test
          </h1>
          
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
              <p className={`text-lg ${loading ? 'text-yellow-600' : ''}`}>
                {loading ? '⏳ Testing...' : connectionStatus}
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h2 className="text-lg font-semibold mb-2">Configuration</h2>
              <div className="text-sm space-y-1">
                <p><strong>Supabase URL:</strong> https://kffiaqsihldgqdwagook.supabase.co</p>
                <p><strong>Using:</strong> Hardcoded credentials (no .env file)</p>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h2 className="text-lg font-semibold mb-2">Test Results</h2>
              <div className="text-sm space-y-2">
                {Object.entries(details).map(([key, value]) => (
                  <div key={key}>
                    <strong>{key}:</strong> 
                    <pre className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1 overflow-auto">
                      {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
            
            {!loading && details.tableExists === false && (
              <div className="p-4 border-2 border-orange-200 bg-orange-50 rounded-lg">
                <h3 className="text-lg font-semibold text-orange-800 mb-2">
                  🛠️ Database Setup Required
                </h3>
                <p className="text-orange-700 mb-4">
                  Your Supabase project is connected but the database tables haven't been created yet.
                  This is normal for a new project.
                </p>
                <button
                  onClick={createTables}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                  Create Database Tables
                </button>
              </div>
            )}
            
            <div className="flex space-x-4">
              <button
                onClick={testConnection}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Retest Connection'}
              </button>
              
              <a
                href="https://supabase.com/dashboard/project/kffiaqsihldgqdwagook"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Open Supabase Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

