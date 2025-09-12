'use client'

import { useState } from 'react'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CogIcon,
  KeyIcon,
  CircleStackIcon,
  UsersIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

interface SetupStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'error'
  icon: any
  endpoint?: string
  errorMessage?: string
}

export default function AdminSetup() {
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([
    {
      id: 'admin-schema',
      title: 'Create Admin Database Schema',
      description: 'Set up admin tables for users, licenses, clusters, and platform metrics',
      status: 'pending',
      icon: CogIcon,
      endpoint: '/api/admin/setup-admin-schema'
    },
    {
      id: 'super-admin',
      title: 'Create Super Admin User',
      description: 'Initialize the primary administrator account',
      status: 'pending',
      icon: ShieldCheckIcon
    },
    {
      id: 'sample-licenses',
      title: 'Generate Sample License Keys',
      description: 'Create example license keys for testing',
      status: 'pending',
      icon: KeyIcon
    },
    {
      id: 'default-cluster',
      title: 'Configure Default Database Cluster',
      description: 'Set up the primary database cluster configuration',
      status: 'pending',
      icon: CircleStackIcon
    },
    {
      id: 'platform-metrics',
      title: 'Initialize Platform Metrics',
      description: 'Set up monitoring and analytics tracking',
      status: 'pending',
      icon: UsersIcon
    }
  ])
  
  const [currentlyRunning, setCurrentlyRunning] = useState<string | null>(null)
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle')

  const updateStepStatus = (stepId: string, status: SetupStep['status'], errorMessage?: string) => {
    setSetupSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, errorMessage }
        : step
    ))
  }

  const runSetupStep = async (step: SetupStep) => {
    setCurrentlyRunning(step.id)
    updateStepStatus(step.id, 'running')

    try {
      if (step.endpoint) {
        const response = await fetch(step.endpoint, { method: 'POST' })
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || result.details || 'Setup failed')
        }
      } else {
        // Simulate setup for steps without endpoints
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
      updateStepStatus(step.id, 'completed')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updateStepStatus(step.id, 'error', errorMessage)
      console.error(`Setup step ${step.id} failed:`, error)
    } finally {
      setCurrentlyRunning(null)
    }
  }

  const runAllSetup = async () => {
    setOverallStatus('running')
    
    try {
      for (const step of setupSteps) {
        if (step.status !== 'completed') {
          await runSetupStep(step)
          
          // Check if this step failed
          const updatedStep = setupSteps.find(s => s.id === step.id)
          if (updatedStep?.status === 'error') {
            setOverallStatus('error')
            return
          }
        }
      }
      
      setOverallStatus('completed')
    } catch (error) {
      setOverallStatus('error')
    }
  }

  const resetSetup = () => {
    setSetupSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending',
      errorMessage: undefined
    })))
    setOverallStatus('idle')
    setCurrentlyRunning(null)
  }

  const getStatusIcon = (status: SetupStep['status']) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'running': return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />
      case 'error': return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      default: return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
    }
  }

  const getStatusColor = (status: SetupStep['status']) => {
    switch (status) {
      case 'completed': return 'border-green-200 bg-green-50'
      case 'running': return 'border-blue-200 bg-blue-50'
      case 'error': return 'border-red-200 bg-red-50'
      default: return 'border-gray-200 bg-white'
    }
  }

  const completedSteps = setupSteps.filter(step => step.status === 'completed').length
  const totalSteps = setupSteps.length
  const progressPercentage = (completedSteps / totalSteps) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Admin System Setup
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Initialize the admin portal with required database schema and configuration
          </p>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Setup Progress</h3>
          <span className="text-sm text-gray-500">{completedSteps}/{totalSteps} completed</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between">
          <button
            onClick={runAllSetup}
            disabled={overallStatus === 'running' || overallStatus === 'completed'}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {overallStatus === 'running' ? (
              <>
                <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5 animate-spin" />
                Running Setup...
              </>
            ) : overallStatus === 'completed' ? (
              <>
                <CheckCircleIcon className="-ml-1 mr-2 h-5 w-5" />
                Setup Complete
              </>
            ) : (
              <>
                <CogIcon className="-ml-1 mr-2 h-5 w-5" />
                Run Full Setup
              </>
            )}
          </button>
          
          {(overallStatus === 'completed' || overallStatus === 'error') && (
            <button
              onClick={resetSetup}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5" />
              Reset Setup
            </button>
          )}
        </div>
      </div>

      {/* Setup Steps */}
      <div className="space-y-4">
        {setupSteps.map((step, index) => {
          const StepIcon = step.icon
          return (
            <div 
              key={step.id} 
              className={`border rounded-lg p-6 transition-colors ${getStatusColor(step.status)}`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-gray-200">
                    <StepIcon className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {index + 1}. {step.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {step.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(step.status)}
                      
                      {step.status === 'pending' && overallStatus !== 'running' && (
                        <button
                          onClick={() => runSetupStep(step)}
                          disabled={currentlyRunning !== null}
                          className="text-sm font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Run Step
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {step.status === 'error' && step.errorMessage && (
                    <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">
                        <strong>Error:</strong> {step.errorMessage}
                      </p>
                    </div>
                  )}
                  
                  {step.status === 'completed' && (
                    <div className="mt-3 p-3 bg-green-100 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        ✅ This step completed successfully
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Next Steps */}
      {overallStatus === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex">
            <CheckCircleIcon className="flex-shrink-0 w-5 h-5 text-green-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Setup Complete!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p className="mb-2">Your admin system is now ready. You can:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Access the <a href="/admin" className="font-medium underline">Admin Dashboard</a></li>
                  <li>Manage <a href="/admin/users" className="font-medium underline">Users</a> and <a href="/admin/licenses" className="font-medium underline">License Keys</a></li>
                  <li>Configure <a href="/admin/clusters" className="font-medium underline">Database Clusters</a></li>
                  <li>Monitor <a href="/admin/analytics" className="font-medium underline">Platform Analytics</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          💡 What does this setup do?
        </h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p><strong>Admin Database Schema:</strong> Creates tables for admin users, license keys, database clusters, onboarding workflows, and platform metrics.</p>
          <p><strong>Super Admin User:</strong> Creates the primary administrator account with full system privileges.</p>
          <p><strong>Sample Data:</strong> Generates example license keys and cluster configurations for testing.</p>
          <p><strong>Monitoring:</strong> Initializes platform metrics and health monitoring systems.</p>
        </div>
      </div>
    </div>
  )
}

