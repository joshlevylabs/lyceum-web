'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  House,
  Users,
  Key,
  Database,
  ChartBar,
  Gear,
  ShieldCheck,
  FileText,
  Bell,
  Power,
  PuzzlePiece,
  ArrowLeft,
  User,
  Ticket,
  Wrench,
  Desktop
} from '@phosphor-icons/react'
import { LyceumLogo } from '@/components/LyceumLogo'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: House },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Subscriptions & Keys', href: '/admin/licenses', icon: Key },
  { name: 'Plugins', href: '/admin/plugins', icon: PuzzlePiece },
  { name: 'Clusters', href: '/admin/clusters', icon: Database },
  { name: 'Tickets', href: '/admin/tickets', icon: Ticket },
  { name: 'Onboarding', href: '/admin/onboarding', icon: FileText },
  { name: 'System Health', href: '/admin/health', icon: ShieldCheck },
  { name: 'Desktop-App', href: '/admin/versions', icon: Desktop },
  { name: 'Settings', href: '/admin/settings', icon: Gear },
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
  const isAdmin = useMemo(() => {
    if (!user) return false

    const allowedRoles = ['admin', 'super_admin', 'superadmin']
    const profileRole = userProfile?.role
    const metadataRole = user.user_metadata?.role

    return allowedRoles.includes(profileRole) || allowedRoles.includes(metadataRole)
  }, [user, userProfile])

  const adminUser = isAdmin ? {
    id: user.id,
    email: user.email,
    username: userProfile?.username || user.user_metadata?.username || user.email?.split('@')[0],
    full_name: userProfile?.full_name || user.user_metadata?.full_name || 'Admin User',
    role: userProfile?.role || user.user_metadata?.role || 'admin'
  } : null

  // Check if current path is a public billing page (accessible to non-admins)
  const isPublicBillingPage = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/admin/billing/success') ||
    window.location.pathname.startsWith('/admin/billing/canceled')
  )

  // Redirect non-admin users (except for public billing pages)
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      // Allow access to billing success/canceled pages for regular users
      if (isPublicBillingPage) {
        console.log('Allowing non-admin access to billing page:', window.location.pathname)
        return
      }

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
  }, [user, userProfile, isAdmin, loading, router, isPublicBillingPage])

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-500"></div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    // Allow billing pages to render without admin layout
    if (isPublicBillingPage) {
      return <div className="min-h-screen bg-background">{children}</div>
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center glass-card p-8">
          <h2 className="text-lg font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-foreground/60 mb-4">You need admin privileges to access this panel.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-cyan-400 hover:text-cyan-300"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 glass-panel overflow-y-auto border-r border-cyan-500/10">
          <div className="flex items-center flex-shrink-0 px-4">
            <LyceumLogo size="sm" showText={false} />
            <h1 className="ml-3 text-xl font-semibold text-foreground">
              Lyceum Admin
            </h1>
          </div>

          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {/* Back to Platform Link */}
              <Link
                href="/dashboard"
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-lg text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors mb-4"
              >
                <ArrowLeft className="mr-3 h-5 w-5 text-cyan-400" />
                Back to Platform
              </Link>

              {/* Admin Navigation */}
              <div className="border-t border-cyan-500/10 pt-4">
                <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-3 px-2">
                  Admin Tools
                </div>
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-lg text-foreground/70 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
                  >
                    <item.icon className="mr-3 h-6 w-6 text-foreground/40 group-hover:text-cyan-400" weight="duotone" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </nav>
          </div>

          {/* Admin user info */}
          <div className="flex-shrink-0 flex border-t border-cyan-500/10 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div className="ml-3">
                  <p className="text-sm font-medium text-foreground/80">
                    {adminUser?.full_name}
                  </p>
                  <p className="text-xs font-medium text-foreground/50">
                    {adminUser?.role.replace('_', ' ').replace('superadmin', 'Super Admin').toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="ml-auto p-1 text-foreground/40 hover:text-cyan-400 transition-colors"
                  title="Sign out"
                >
                  <Power className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top navigation */}
        <div className="relative z-10 flex-shrink-0 flex h-16 glass-panel border-b border-cyan-500/10">
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1 flex">
              <div className="w-full flex md:ml-0">
                {/* You can add search or other top nav items here */}
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              {/* Notifications */}
              <button className="p-2 rounded-lg text-foreground/50 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors">
                <Bell className="h-5 w-5" />
              </button>

              {/* Admin dropdown would go here */}
              <div className="ml-3 relative">
                <div className="flex items-center text-sm">
                  <span className="text-foreground/70 text-sm font-medium">
                    {adminUser?.username}
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
