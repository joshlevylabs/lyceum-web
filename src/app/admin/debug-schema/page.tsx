'use client'

import { useState } from 'react'
import {
  Warning,
  CheckCircle,
  ArrowClockwise,
  Code
} from '@phosphor-icons/react'

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
          <h1 className="text-2xl font-bold leading-7 text-foreground sm:text-3xl sm:truncate">
            Admin Schema Debug Tool
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Diagnose and fix admin database schema creation issues
          </p>
        </div>
      </div>

      {/* Method Selection */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">Schema Creation Method</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              id="rpc-method"
              type="radio"
              name="method"
              checked={selectedMethod === 'rpc'}
              onChange={() => setSelectedMethod('rpc')}
              className="h-4 w-4 text-cyan-400 border-cyan-500/20 focus:ring-cyan-500"
            />
            <label htmlFor="rpc-method" className="ml-3 text-sm font-medium text-foreground">
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
              className="h-4 w-4 text-cyan-400 border-cyan-500/20 focus:ring-cyan-500"
            />
            <label htmlFor="direct-method" className="ml-3 text-sm font-medium text-foreground">
              Direct Method (Individual table creation)
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">Debug Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={checkExistingTables}
            disabled={loading}
            className="btn-ghost disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500/20 border-t-cyan-500" />
            ) : (
              <CheckCircle className="h-5 w-5" weight="duotone" />
            )}
            <span className="ml-2">Check Existing Tables</span>
          </button>

          <button
            onClick={testSchemaCreation}
            disabled={loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500/20 border-t-cyan-500" />
            ) : (
              <Code className="h-5 w-5" weight="duotone" />
            )}
            <span className="ml-2">Test Schema Creation</span>
          </button>

          <button
            onClick={createTablesDirectly}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500/20 border-t-cyan-500" />
            ) : (
              <CheckCircle className="h-5 w-5" weight="duotone" />
            )}
            <span className="ml-2">Create Tables (Step by Step)</span>
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">
            {result.success ? 'Success' : 'Error'}
          </h3>

          <div className="space-y-4">
            {result.type === 'check' && result.success && (
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-md p-4">
                <h4 className="font-medium text-foreground mb-2">Existing Tables:</h4>
                <div className="text-sm text-foreground/80">
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

            <pre className="text-sm bg-background border border-cyan-500/20 p-4 rounded overflow-auto text-foreground/80">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6">
        <div className="flex">
          <Warning className="flex-shrink-0 w-5 h-5 text-amber-400 mt-0.5" weight="duotone" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-foreground">
              Common Schema Creation Issues
            </h3>
            <div className="mt-2 text-sm text-foreground/80 space-y-2">
              <p><strong>RPC Function Missing:</strong> Supabase may not have the exec_sql function enabled</p>
              <p><strong>Permission Issues:</strong> Service role key may not have sufficient permissions</p>
              <p><strong>Table Conflicts:</strong> Some tables may already exist with different schemas</p>
              <p><strong>SQL Syntax:</strong> Complex SQL may need to be broken into smaller parts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-6">
        <h3 className="text-sm font-medium text-foreground mb-2">
          Troubleshooting Steps
        </h3>
        <div className="text-sm text-foreground/80 space-y-2">
          <p>1. <strong>Check existing tables</strong> to see what's already created</p>
          <p>2. <strong>Try the direct method</strong> if RPC method fails</p>
          <p>3. <strong>Use step-by-step creation</strong> to isolate specific table issues</p>
          <p>4. <strong>Check Supabase logs</strong> in your dashboard for detailed error messages</p>
        </div>
      </div>
    </div>
  )
}

