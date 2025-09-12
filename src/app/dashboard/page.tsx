'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  UserIcon,
  KeyIcon,
  ChartBarIcon,
  CogIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  PresentationChartLineIcon,
  TableCellsIcon,
  CubeIcon,
  PlayIcon
} from '@heroicons/react/24/outline'

interface UserProfile {
  email: string
  full_name: string
  username: string
  role: string
  company?: string
  onboarding_status?: string
}

export default function Dashboard() {
  const { user, userProfile, loading } = useAuth()
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false)
  const router = useRouter()

  // Debug logging
  console.log('Dashboard - Auth state:', {
    user: !!user,
    userProfile: !!userProfile,
    loading,
    userEmail: user?.email,
    profileName: userProfile?.full_name
  })

  useEffect(() => {
    if (user && user.user_metadata?.invited_by_admin && !user.user_metadata?.password_set) {
      setNeedsPasswordReset(true)
    }
  }, [user])

  // Redirect to login if not authenticated (additional protection)
  useEffect(() => {
    if (!loading && !user) {
      console.log('Dashboard: No user found, redirecting to login')
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  const handleSetPassword = () => {
    router.push('/auth/set-password')
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading user data...</p>
        </div>
      </DashboardLayout>
    )
  }

  const profile = userProfile || {
    email: user.email || '',
    full_name: user.user_metadata?.full_name || '',
    username: user.user_metadata?.user_name || '',
    role: user.user_metadata?.role || 'user',
    company: user.user_metadata?.company || '',
    onboarding_status: 'pending'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Password Reset Notice */}
        {needsPasswordReset && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Please set a secure password for your account.
                  <button
                    onClick={handleSetPassword}
                    className="ml-2 font-medium text-yellow-700 underline hover:text-yellow-600"
                  >
                    Set Password Now
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Welcome to Lyceum, {profile.full_name || profile.username}!
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Your industrial analytics platform is ready. Use the sidebar to navigate to different sections of the application.
            </p>
            
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{profile.email}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    profile.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' :
                    profile.role === 'superadmin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                  }`}>
                    {profile.role}
                  </span>
                </dd>
              </div>
              
              {profile.company && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Company</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{profile.company}</dd>
                </div>
              )}
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    profile.onboarding_status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                  }`}>
                    {profile.onboarding_status || 'pending'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Test Data */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TableCellsIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Test Data</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">Manage Projects</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/test-data')}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                  Open Test Data
                </button>
              </div>
            </div>
          </div>

          {/* Analytics Studio */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <PresentationChartLineIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Analytics Studio</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">Data Analysis</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/analytics-studio')}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700 transition-colors"
                >
                  Open Analytics
                </button>
              </div>
            </div>
          </div>

          {/* Data Visualizer */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Data Visualizer</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">Charts & Graphs</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/data-visualizer')}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 transition-colors"
                >
                  Open Visualizer
                </button>
              </div>
            </div>
          </div>

          {/* Centcom Assets */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CubeIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Centcom Assets</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">Asset Management</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/assets')}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-md text-sm hover:bg-orange-700 transition-colors"
                >
                  View Assets
                </button>
              </div>
            </div>
          </div>

          {/* Admin Portal (if admin) */}
          {(profile.role === 'admin' || profile.role === 'superadmin') && (
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ShieldCheckIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Admin Portal</dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">System Management</dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/admin')}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
                  >
                    Open Admin Portal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sequencer */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <PlayIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Sequencer</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">Automation</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/sequencer')}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors"
                >
                  Open Sequencer
                </button>
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserIcon className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Account</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">Profile Settings</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/settings')}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
                >
                  Manage Profile
                </button>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CogIcon className="h-6 w-6 text-slate-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Settings</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">Preferences</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/settings')}
                  className="w-full bg-slate-600 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-700 transition-colors"
                >
                  Open Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}