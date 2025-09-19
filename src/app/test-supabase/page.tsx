'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestSupabase() {
  const [status, setStatus] = useState('Testing...')
  const [details, setDetails] = useState<any>({})

  useEffect(() => {
    const testSupabase = async () => {
      try {
        console.log('Testing Supabase connection...')
        
        // Test 1: Basic client availability
        console.log('Supabase client:', !!supabase)
        setDetails(prev => ({ ...prev, clientAvailable: !!supabase }))
        
        // Test 2: Simple auth check with timeout
        console.log('Testing auth.getUser()...')
        const getUserPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout after 3 seconds')), 3000)
        })
        
        const result = await Promise.race([getUserPromise, timeoutPromise]) as any
        console.log('Auth test result:', result)
        setDetails(prev => ({ ...prev, authTest: 'Success', user: !!result.data?.user }))
        
        // Test 3: Simple database query
        console.log('Testing database query...')
        const { data, error } = await supabase.from('user_profiles').select('count').limit(1)
        console.log('Database test result:', { data, error })
        setDetails(prev => ({ ...prev, dbTest: error ? 'Error: ' + error.message : 'Success' }))
        
        setStatus('Tests completed')
      } catch (error: any) {
        console.error('Supabase test failed:', error)
        setStatus('Test failed: ' + error.message)
        setDetails(prev => ({ ...prev, error: error.message }))
      }
    }

    testSupabase()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Supabase Connection Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Status: {status}</h2>
          
          <div className="space-y-2">
            <div>
              <strong>Client Available:</strong> {details.clientAvailable ? '✅ Yes' : '❌ No'}
            </div>
            <div>
              <strong>Auth Test:</strong> {details.authTest || 'Pending...'}
            </div>
            <div>
              <strong>User Found:</strong> {details.user ? '✅ Yes' : '❌ No'}
            </div>
            <div>
              <strong>Database Test:</strong> {details.dbTest || 'Pending...'}
            </div>
            {details.error && (
              <div className="text-red-600">
                <strong>Error:</strong> {details.error}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-100 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Environment Check:</h3>
          <pre className="text-sm">
            {JSON.stringify({
              NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Using fallback',
              NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Using fallback'
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}





