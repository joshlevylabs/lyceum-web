'use client'

import { useState, Fragment } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Dialog, Transition } from '@headlessui/react'
import {
  XMarkIcon,
  Bars3Icon,
  HomeIcon,
  ChartBarIcon,
  TableCellsIcon,
  BeakerIcon,
  UserGroupIcon,
  FolderIcon,
  Cog6ToothIcon,
  PlayIcon,
  PresentationChartLineIcon,
  CircleStackIcon,
  CubeIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Test Data', href: '/test-data', icon: TableCellsIcon },
  { name: 'Data Visualizer', href: '/data-visualizer', icon: ChartBarIcon },
  { name: 'Analytics Studio', href: '/analytics-studio', icon: PresentationChartLineIcon },
  { name: 'Groups', href: '/groups', icon: UserGroupIcon },
  { name: 'Centcom Assets', href: '/assets', icon: CubeIcon },
  { name: 'Sequencer', href: '/sequencer', icon: PlayIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, userProfile, signOut, loading } = useAuth()

  // Check if user has admin privileges
  const isAdmin = user && (
    (userProfile?.role === 'admin' || userProfile?.role === 'superadmin') ||
    (user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'superadmin')
  )

  // Debug logging
  console.log('DashboardLayout - Auth state:', {
    user: !!user,
    userProfile: !!userProfile,
    loading,
    userEmail: user?.email,
    profileName: userProfile?.full_name,
    isAdmin
  })

  // Enhanced logout handler with error handling
  const handleLogout = async () => {
    if (loggingOut) return // Prevent multiple logout attempts
    
    console.log('Logout button clicked')
    setLoggingOut(true)
    
    try {
      console.log('Calling signOut...')
      await signOut()
      console.log('SignOut completed successfully')
    } catch (error) {
      console.error('Logout error:', error)
      // Even if there's an error, try to redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin'
      }
    } finally {
      setLoggingOut(false)
    }
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin'
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p>Redirecting to login...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-800 px-6 pb-2">
                  <div className="flex h-16 shrink-0 items-center">
                    <div className="h-8 w-8 flex items-center justify-center rounded bg-blue-600">
                      <span className="text-lg font-bold text-white">L</span>
                    </div>
                    <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white">Lyceum</span>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {navigation.map((item) => (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                className={clsx(
                                  pathname === item.href
                                    ? 'bg-gray-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700',
                                  'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                )}
                              >
                                <item.icon
                                  className={clsx(
                                    pathname === item.href ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400',
                                    'h-6 w-6 shrink-0'
                                  )}
                                  aria-hidden="true"
                                />
                                {item.name}
                              </Link>
                            </li>
                          ))}
                          
                          {/* Admin Panel - Only show for admins */}
                          {isAdmin && (
                            <li>
                              <Link
                                href="/admin"
                                className={clsx(
                                  pathname.startsWith('/admin')
                                    ? 'bg-gray-50 dark:bg-gray-700 text-red-600 dark:text-red-400'
                                    : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700',
                                  'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold border-t border-gray-200 dark:border-gray-600 mt-2 pt-4'
                                )}
                              >
                                <ShieldCheckIcon
                                  className={clsx(
                                    pathname.startsWith('/admin') ? 'text-red-600 dark:text-red-400' : 'text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400',
                                    'h-6 w-6 shrink-0'
                                  )}
                                  aria-hidden="true"
                                />
                                Admin Panel
                              </Link>
                            </li>
                          )}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6">
          <div className="flex h-16 shrink-0 items-center">
            <div className="h-8 w-8 flex items-center justify-center rounded bg-blue-600">
              <span className="text-lg font-bold text-white">L</span>
            </div>
            <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white">Lyceum</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={clsx(
                          pathname === item.href
                            ? 'bg-gray-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700',
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                        )}
                      >
                        <item.icon
                          className={clsx(
                            pathname === item.href ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400',
                            'h-6 w-6 shrink-0'
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                  
                  {/* Admin Panel - Only show for admins */}
                  {isAdmin && (
                    <li>
                      <Link
                        href="/admin"
                        className={clsx(
                          pathname.startsWith('/admin')
                            ? 'bg-gray-50 dark:bg-gray-700 text-red-600 dark:text-red-400'
                            : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700',
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold border-t border-gray-200 dark:border-gray-600 mt-2 pt-4'
                        )}
                      >
                        <ShieldCheckIcon
                          className={clsx(
                            pathname.startsWith('/admin') ? 'text-red-600 dark:text-red-400' : 'text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400',
                            'h-6 w-6 shrink-0'
                          )}
                          aria-hidden="true"
                        />
                        Admin Panel
                      </Link>
                    </li>
                  )}
                </ul>
              </li>
              
              {/* User section */}
              <li className="mt-auto">
                <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                  <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <button
                    onClick={() => router.push('/settings')}
                    className="flex-1 text-left hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Edit Profile"
                  >
                    <div className="text-sm font-medium">
                      {userProfile?.full_name || 
                       user?.user_metadata?.full_name || 
                       user?.email?.split('@')[0] || 
                       'User'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {userProfile?.role || user?.user_metadata?.role || 'user'}
                    </div>
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={loggingOut ? "Signing out..." : "Sign out"}
                  >
                    {loggingOut ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
                    ) : (
                      <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button type="button" className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-300 lg:hidden" onClick={() => setSidebarOpen(true)}>
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {navigation.find(item => item.href === pathname)?.name || 'Lyceum'}
              </h1>
            </div>
            
            <div className="ml-auto flex items-center gap-x-4 lg:gap-x-6">
              {/* User menu for mobile */}
              <div className="lg:hidden">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-x-2 text-sm font-semibold text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    {loggingOut ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-300"></div>
                    ) : (
                      <UserIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    )}
                  </div>
                  {loggingOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
} 