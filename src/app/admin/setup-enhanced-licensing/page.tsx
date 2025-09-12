'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClockIcon,
  PuzzlePieceIcon,
  UsersIcon,
  CogIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline'

export default function SetupEnhancedLicensing() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [manualSetupMode, setManualSetupMode] = useState(false)
  const router = useRouter()
  
  const updateLicenseSchema = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/admin/update-license-schema', { method: 'POST' })
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
  
  const goToLicenses = () => {
    router.push('/admin/licenses')
  }
  
  const sqlToExecute = `
-- Create plugins table
CREATE TABLE IF NOT EXISTS license_plugins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plugin_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'measurement' CHECK (category IN ('measurement', 'analysis', 'integration', 'visualization', 'other')),
  version TEXT DEFAULT '1.0.0',
  vendor TEXT,
  price_tier TEXT DEFAULT 'standard' CHECK (price_tier IN ('free', 'standard', 'premium', 'enterprise')),
  requires_plugins TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  configuration_schema JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add new columns to license_keys table
ALTER TABLE license_keys 
ADD COLUMN IF NOT EXISTS time_limit_type TEXT DEFAULT 'unlimited' CHECK (time_limit_type IN ('trial_30', 'trial_custom', 'unlimited', 'fixed_period')),
ADD COLUMN IF NOT EXISTS custom_trial_days INTEGER,
ADD COLUMN IF NOT EXISTS trial_extended_by UUID REFERENCES admin_users(id),
ADD COLUMN IF NOT EXISTS trial_extension_reason TEXT,
ADD COLUMN IF NOT EXISTS enabled_plugins TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS plugin_permissions JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS allowed_user_types TEXT[] DEFAULT '{"engineer", "operator"}',
ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'standard' CHECK (access_level IN ('basic', 'standard', 'advanced', 'full')),
ADD COLUMN IF NOT EXISTS restrictions JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS license_config JSONB DEFAULT '{}';

-- Insert default plugins
INSERT INTO license_plugins (plugin_id, name, description, category, vendor, price_tier, configuration_schema) VALUES
('klippel_qc', 'Klippel QC', 'Quality Control measurements and analysis for loudspeakers', 'measurement', 'Klippel', 'premium', '{"max_measurements": {"type": "number", "default": 1000}, "export_formats": {"type": "array", "default": ["pdf", "csv"]}}'),
('apx500', 'APx500 Integration', 'Audio Precision APx500 measurement system integration', 'measurement', 'Audio Precision', 'enterprise', '{"max_channels": {"type": "number", "default": 8}, "sample_rates": {"type": "array", "default": [48000, 96000, 192000]}}'),
('advanced_analytics', 'Advanced Analytics', 'Machine learning and predictive analytics tools', 'analysis', 'Lyceum', 'premium', '{"ml_models": {"type": "number", "default": 5}, "batch_processing": {"type": "boolean", "default": true}}'),
('data_export', 'Data Export Plus', 'Enhanced data export with custom formats', 'integration', 'Lyceum', 'standard', '{"export_formats": {"type": "array", "default": ["xlsx", "csv", "json", "xml"]}, "auto_backup": {"type": "boolean", "default": false}}'),
('real_time_collaboration', 'Real-time Collaboration', 'Enhanced team collaboration features', 'other', 'Lyceum', 'standard', '{"max_collaborators": {"type": "number", "default": 10}, "live_chat": {"type": "boolean", "default": true}}'),
('custom_dashboards', 'Custom Dashboards', 'Create custom visualization dashboards', 'visualization', 'Lyceum', 'premium', '{"max_dashboards": {"type": "number", "default": 20}, "custom_widgets": {"type": "boolean", "default": true}}')
ON CONFLICT (plugin_id) DO NOTHING;
  `
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Setup Enhanced Licensing System
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure advanced licensing with time-based, plugin-based, and user-access controls
          </p>
        </div>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ClockIcon className="h-8 w-8 text-blue-500 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">Time-Based Licensing</h3>
          </div>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• 30-day standard trials</li>
            <li>• Custom trial periods</li>
            <li>• Unlimited licenses</li>
            <li>• Fixed expiry dates</li>
          </ul>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <PuzzlePieceIcon className="h-8 w-8 text-green-500 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">Plugin-Based Licensing</h3>
          </div>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Klippel QC integration</li>
            <li>• APx500 support</li>
            <li>• Advanced analytics</li>
            <li>• Custom dashboards</li>
          </ul>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <UsersIcon className="h-8 w-8 text-purple-500 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">User Access Types</h3>
          </div>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Engineer access</li>
            <li>• Operator permissions</li>
            <li>• Analyst capabilities</li>
            <li>• Viewer restrictions</li>
          </ul>
        </div>
      </div>

      {/* Setup Action */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Database Schema Update</h3>
          {!result && !manualSetupMode && (
            <button
              onClick={updateLicenseSchema}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5 animate-spin" />
                  Updating Schema...
                </>
              ) : (
                <>
                  <CogIcon className="-ml-1 mr-2 h-5 w-5" />
                  Update License Schema
                </>
              )}
            </button>
          )}
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          This will update your database schema to support the new licensing features including plugins table and enhanced license fields.
        </p>
        
        {!manualSetupMode && (
          <button
            onClick={() => setManualSetupMode(true)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Need manual setup? Click here for SQL commands
          </button>
        )}
      </div>

      {/* Manual Setup Mode */}
      {manualSetupMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CodeBracketIcon className="h-6 w-6 text-yellow-600 mr-3" />
            <h3 className="text-lg font-medium text-yellow-800">Manual Setup Instructions</h3>
          </div>
          
          <p className="text-sm text-yellow-700 mb-4">
            Since automated schema updates may not work with your Supabase configuration, please run the following SQL manually:
          </p>
          
          <div className="mb-4">
            <h4 className="font-medium text-yellow-800 mb-2">Steps:</h4>
            <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
              <li>Go to your <a href="https://supabase.com/dashboard/project/kffiaqsihldgqdwagook/editor" target="_blank" rel="noopener noreferrer" className="underline">Supabase SQL Editor</a></li>
              <li>Copy and paste the SQL below</li>
              <li>Execute the SQL commands</li>
              <li>Return here and continue with testing</li>
            </ol>
          </div>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto mb-4">
            <pre>{sqlToExecute}</pre>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => navigator.clipboard.writeText(sqlToExecute)}
              className="inline-flex items-center px-3 py-2 border border-yellow-300 rounded-md text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200"
            >
              Copy SQL to Clipboard
            </button>
            
            <button
              onClick={() => setManualSetupMode(false)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Automatic Setup
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {result.success ? '✅ Schema Update Results' : '⚠️ Setup Results'}
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
              <h4 className="font-medium text-green-900 mb-2">🎉 Enhanced Licensing Ready!</h4>
              <div className="text-sm text-green-800 space-y-1">
                <p><strong>New Features:</strong> Time-based, plugin-based, and user-access licensing</p>
                <p><strong>Plugins Added:</strong> Klippel QC, APx500, Advanced Analytics, and more</p>
                <p><strong>Ready to use:</strong> Create advanced licenses with granular control</p>
              </div>
            </div>
          )}
          
          <div className="flex space-x-4">
            {result.success && (
              <>
                <button
                  onClick={goToLicenses}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  <ArrowRightIcon className="-ml-1 mr-2 h-5 w-5" />
                  Go to License Management
                </button>
                
                <Link
                  href="/admin/licenses/create-advanced"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PuzzlePieceIcon className="-ml-1 mr-2 h-5 w-5" />
                  Create Advanced License
                </Link>
              </>
            )}
            
            <button
              onClick={updateLicenseSchema}
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

      {/* What's New */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          🚀 What's New in Enhanced Licensing
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <h4 className="font-medium mb-2">Time-Based Features:</h4>
            <ul className="space-y-1">
              <li>• Configurable trial periods</li>
              <li>• Trial extensions by super admins</li>
              <li>• Fixed expiry dates</li>
              <li>• Automatic expiry warnings</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Plugin Management:</h4>
            <ul className="space-y-1">
              <li>• Individual plugin licensing</li>
              <li>• Plugin configuration settings</li>
              <li>• Vendor and pricing tiers</li>
              <li>• Permission granularity</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// Add Link import
import Link from 'next/link'

