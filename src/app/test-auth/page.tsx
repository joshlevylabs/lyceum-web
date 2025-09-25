'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestAuthPage() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const addResult = (test: string, result: any, success: boolean) => {
    setTestResults(prev => [...prev, { 
      test, 
      result: typeof result === 'object' ? JSON.stringify(result, null, 2) : result,
      success,
      timestamp: new Date().toISOString()
    }])
  }

  const testSupabaseConnection = async () => {
    setLoading(true)
    setTestResults([])

    // Test 1: Basic client
    try {
      addResult('Supabase Client', 'Client created successfully', true)
    } catch (error: any) {
      addResult('Supabase Client', error.message, false)
    }

    // Test 2: Simple query (no auth required)
    try {
      const { data, error } = await supabase
        .from('database_clusters')
        .select('count')
        .limit(1)
      
      if (error) {
        addResult('Database Connection', `Error: ${error.message}`, false)
      } else {
        addResult('Database Connection', 'Successfully connected to database', true)
      }
    } catch (error: any) {
      addResult('Database Connection', error.message, false)
    }

    // Test 3: Get session (should be fast)
    try {
      const startTime = Date.now()
      const { data: { session }, error } = await supabase.auth.getSession()
      const duration = Date.now() - startTime
      
      addResult('Get Session', `Duration: ${duration}ms, Session: ${session ? 'Found' : 'None'}, Error: ${error?.message || 'None'}`, true)
    } catch (error: any) {
      addResult('Get Session', error.message, false)
    }

    // Test 4: Get user (this is the hanging one)
    try {
      const startTime = Date.now()
      
      // Add timeout to prevent hanging
      const getUserPromise = supabase.auth.getUser()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 5 seconds')), 5000)
      )
      
      const { data: { user }, error } = await Promise.race([getUserPromise, timeoutPromise]) as any
      const duration = Date.now() - startTime
      
      addResult('Get User', `Duration: ${duration}ms, User: ${user ? 'Found' : 'None'}, Error: ${error?.message || 'None'}`, true)
    } catch (error: any) {
      addResult('Get User', error.message, false)
    }

    setLoading(false)
  }

  const testLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'josh@thelyceum.io', // Replace with your email
        password: 'your_password' // You'll need to enter your password
      })
      
      if (error) {
        addResult('Login Test', `Error: ${error.message}`, false)
      } else {
        addResult('Login Test', 'Login successful!', true)
      }
    } catch (error: any) {
      addResult('Login Test', error.message, false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>🔧 Supabase Authentication Diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-x-4">
            <Button 
              onClick={testSupabaseConnection}
              disabled={loading}
            >
              {loading ? 'Testing...' : 'Run All Tests'}
            </Button>
            
            <Button 
              onClick={() => setTestResults([])}
              variant="outline"
            >
              Clear Results
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Test Results:</h3>
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border ${
                    result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="font-medium">
                    {result.success ? '✅' : '❌'} {result.test}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    <pre className="whitespace-pre-wrap">{result.result}</pre>
                  </div>
                  <div className="text-xs text-gray-400">{result.timestamp}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
