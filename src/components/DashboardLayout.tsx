'use client'

import { useState, Fragment } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Dialog, Transition } from '@headlessui/react'
import {
  X,
  List,
  House,
  Table,
  Gear,
  PuzzlePiece,
  SignOut,
  User,
  ShieldCheck
} from '@phosphor-icons/react'
import clsx from 'clsx'
import { LyceumLogo } from './LyceumLogo'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: House },
  { name: 'Test Data', href: '/test-data', icon: Table },
  { name: 'Plugins Store', href: '/plugins', icon: PuzzlePiece },
  { name: 'Settings', href: '/settings', icon: Gear },
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/20 border-t-cyan-500"></div>
          <span className="text-sm text-foreground/60">Loading...</span>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin'
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground/60">Redirecting to login...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
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
                      <X className="h-6 w-6 text-white" weight="bold" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>

                {/* Mobile sidebar content */}
                <div className="flex grow flex-col gap-y-5 overflow-y-auto glass-panel px-6 pb-2">
                  {/* Logo */}
                  <div className="flex h-16 shrink-0 items-center">
                    <LyceumLogo size="md" />
                  </div>

                  {/* Navigation */}
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {navigation.map((item) => (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={clsx(
                                  'nav-item',
                                  pathname === item.href && 'active'
                                )}
                              >
                                <item.icon
                                  className={clsx(
                                    'h-5 w-5 shrink-0 transition-colors',
                                    pathname === item.href ? 'text-cyan-400' : 'text-foreground/50'
                                  )}
                                  weight={pathname === item.href ? 'duotone' : 'regular'}
                                  aria-hidden="true"
                                />
                                {item.name}
                              </Link>
                            </li>
                          ))}

                          {/* Admin Panel - Only show for admins */}
                          {isAdmin && (
                            <li className="pt-4 mt-4 border-t border-cyan-500/10">
                              <Link
                                href="/admin"
                                onClick={() => setSidebarOpen(false)}
                                className={clsx(
                                  'nav-item',
                                  pathname.startsWith('/admin') && 'active'
                                )}
                              >
                                <ShieldCheck
                                  className={clsx(
                                    'h-5 w-5 shrink-0',
                                    pathname.startsWith('/admin') ? 'text-emerald-400' : 'text-emerald-400/60'
                                  )}
                                  weight={pathname.startsWith('/admin') ? 'duotone' : 'regular'}
                                  aria-hidden="true"
                                />
                                <span className={pathname.startsWith('/admin') ? 'text-emerald-400' : 'text-emerald-400/70'}>
                                  Admin Panel
                                </span>
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
        <div className="flex grow flex-col gap-y-5 overflow-y-auto glass-panel border-r border-cyan-500/10 px-6">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <LyceumLogo size="md" />
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={clsx(
                          'nav-item',
                          pathname === item.href && 'active'
                        )}
                      >
                        <item.icon
                          className={clsx(
                            'h-5 w-5 shrink-0 transition-colors',
                            pathname === item.href ? 'text-cyan-400' : 'text-foreground/50'
                          )}
                          weight={pathname === item.href ? 'duotone' : 'regular'}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}

                  {/* Admin Panel - Only show for admins */}
                  {isAdmin && (
                    <li className="pt-4 mt-4 border-t border-cyan-500/10">
                      <Link
                        href="/admin"
                        className={clsx(
                          'nav-item group',
                          pathname.startsWith('/admin') ? 'active !bg-emerald-500/10 !border-l-emerald-400' : ''
                        )}
                      >
                        <ShieldCheck
                          className={clsx(
                            'h-5 w-5 shrink-0 transition-colors',
                            pathname.startsWith('/admin') ? 'text-emerald-400' : 'text-emerald-400/60 group-hover:text-emerald-400'
                          )}
                          weight={pathname.startsWith('/admin') ? 'duotone' : 'regular'}
                          aria-hidden="true"
                        />
                        <span className={pathname.startsWith('/admin') ? 'text-emerald-400' : 'text-emerald-400/70 group-hover:text-emerald-400'}>
                          Admin Panel
                        </span>
                      </Link>
                    </li>
                  )}
                </ul>
              </li>

              {/* User section */}
              <li className="mt-auto pb-4">
                <div className="glass-card p-3 flex items-center gap-x-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/20 flex items-center justify-center">
                    <User className="h-5 w-5 text-cyan-400" weight="duotone" />
                  </div>
                  <button
                    onClick={() => router.push('/settings')}
                    className="flex-1 text-left hover:opacity-80 transition-opacity"
                    title="Edit Profile"
                  >
                    <div className="text-sm font-medium text-foreground truncate">
                      {userProfile?.full_name ||
                       user?.user_metadata?.full_name ||
                       user?.email?.split('@')[0] ||
                       'User'}
                    </div>
                    <div className="text-xs text-foreground/50 capitalize">
                      {userProfile?.role || user?.user_metadata?.role || 'user'}
                    </div>
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="p-2 rounded-lg text-foreground/50 hover:text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title={loggingOut ? "Signing out..." : "Sign out"}
                  >
                    {loggingOut ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-foreground/20 border-t-cyan-400"></div>
                    ) : (
                      <SignOut className="h-5 w-5" weight="bold" />
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
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 glass-panel border-b border-cyan-500/10 px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-foreground/70 hover:text-cyan-400 transition-colors lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <List className="h-6 w-6" weight="bold" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-cyan-500/10 lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <h1 className="text-xl font-semibold text-gradient-cyan">
                {navigation.find(item => item.href === pathname)?.name ||
                 (pathname.startsWith('/admin') ? 'Admin Panel' : 'Lyceum')}
              </h1>
            </div>

            <div className="ml-auto flex items-center gap-x-4 lg:gap-x-6">
              {/* User menu for mobile */}
              <div className="lg:hidden">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-x-2 text-sm font-medium text-foreground/70 disabled:opacity-50 disabled:cursor-not-allowed hover:text-cyan-400 transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/20 flex items-center justify-center">
                    {loggingOut ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-foreground/20 border-t-cyan-400"></div>
                    ) : (
                      <User className="h-4 w-4 text-cyan-400" weight="duotone" />
                    )}
                  </div>
                  <span className="sr-only sm:not-sr-only">
                    {loggingOut ? 'Signing out...' : 'Sign out'}
                  </span>
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
