'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  HomeIcon,
  UsersIcon,
  KeyIcon,
  CircleStackIcon,
  ChartBarIcon,
  CogIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  BellIcon,
  PowerIcon,
  PuzzlePieceIcon,
  ArrowLeftIcon,
  UserIcon,
  TicketIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'License Keys', href: '/admin/licenses', icon: KeyIcon },
  { name: 'Plugins', href: '/admin/plugins', icon: PuzzlePieceIcon },
  { name: 'Database Clusters', href: '/admin/clusters', icon: CircleStackIcon },
  { name: 'Analytics', href: '/admin/analytics', icon: ChartBarIcon },
  { name: 'Tickets', href: '/admin/tickets', icon: TicketIcon },
  { name: 'Onboarding', href: '/admin/onboarding', icon: DocumentTextIcon },
  { name: 'System Health', href: '/admin/health', icon: ShieldCheckIcon },
  { name: 'Settings', href: '/admin/settings', icon: CogIcon },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const { user, userProfile, loading, signOut } = useAuth()

  // Check if user has admin privileges
  const isAdmin = user && (
    (userProfile?.role === 'admin' || userProfile?.role === 'superadmin') ||
    (user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'superadmin')
  )

  const adminUser = isAdmin ? {
    id: user.id,
    email: user.email,
    username: userProfile?.username || user.user_metadata?.username || user.email?.split('@')[0],
    full_name: userProfile?.full_name || user.user_metadata?.full_name || 'Admin User',
    role: userProfile?.role || user.user_metadata?.role || 'admin'
  } : null

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      console.log('Admin access denied - redirecting to dashboard', {
        hasUser: !!user,
        userEmail: user?.email,
        userRole: userProfile?.role,
        userMetadataRole: user?.user_metadata?.role,
        isAdmin
      })
      router.push('/dashboard')
    } else if (!loading && isAdmin) {
      console.log('Admin access granted', {
        userEmail: user?.email,
        userRole: userProfile?.role,
        userMetadataRole: user?.user_metadata?.role,
        isAdmin
      })
    }
  }, [user, userProfile, isAdmin, loading, router])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Admin logout error:', error)
      router.push('/auth/signin')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You need admin privileges to access this panel.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r border-gray-200">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <h1 className="ml-3 text-xl font-semibold text-gray-900">
              Lyceum Admin
            </h1>
          </div>
          
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {/* Back to Platform Link */}
              <Link
                href="/dashboard"
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700 border border-blue-200 hover:border-blue-300 transition-colors mb-4"
              >
                <ArrowLeftIcon className="mr-3 h-5 w-5 text-blue-500 group-hover:text-blue-600" />
                Back to Platform
              </Link>
              
              {/* Admin Navigation */}
              <div className="border-t border-gray-200 pt-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                  Admin Tools
                </div>
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <item.icon className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
          
          {/* Admin user info */}
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {adminUser.full_name}
                  </p>
                  <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                    {adminUser.role.replace('_', ' ').replace('superadmin', 'Super Admin').toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="ml-auto p-1 text-gray-400 hover:text-gray-600"
                  title="Sign out"
                >
                  <PowerIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top navigation */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1 flex">
              <div className="w-full flex md:ml-0">
                {/* You can add search or other top nav items here */}
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              {/* Notifications */}
              <button className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500">
                <BellIcon className="h-6 w-6" />
              </button>
              
              {/* Admin dropdown would go here */}
              <div className="ml-3 relative">
                <div className="max-w-xs bg-white flex items-center text-sm rounded-full">
                  <span className="text-gray-700 text-sm font-medium">
                    {adminUser.username}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
