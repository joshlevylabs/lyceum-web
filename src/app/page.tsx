'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { 
  ChartBarIcon, 
  TableCellsIcon, 
  PresentationChartLineIcon,
  ShieldCheckIcon,
  CloudIcon,
  UserGroupIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

const features = [
  {
    name: 'Analytics Studio',
    description: 'Create, manage, and collaborate on analytics sessions with real-time data visualization.',
    icon: PresentationChartLineIcon,
  },
  {
    name: 'Test Data Management',
    description: 'Organize and analyze measurement data with advanced filtering and grouping capabilities.',
    icon: TableCellsIcon,
  },
  {
    name: 'Data Visualization',
    description: 'Interactive charts and graphs with measurement flagging and statistical analysis.',
    icon: ChartBarIcon,
  },
  {
    name: 'Cloud-Based Collaboration',
    description: 'Share sessions and data with team members in real-time from anywhere.',
    icon: CloudIcon,
  },
  {
    name: 'Enterprise Security',
    description: 'Role-based access control and enterprise-grade security for your industrial data.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Team Management',
    description: 'Organize teams, assign roles, and manage access across your organization.',
    icon: UserGroupIcon,
  },
]

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
          <div className="flex lg:flex-1">
            <div className="flex items-center">
              <div className="h-8 w-8 flex items-center justify-center rounded bg-blue-600">
                <span className="text-lg font-bold text-white">L</span>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white">Lyceum</span>
            </div>
          </div>
          <div className="flex lg:flex-1 lg:justify-end space-x-4">
            <Link
              href="/auth/signin"
              className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
            >
              Sign in <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>
        
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Industrial Analytics Platform
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Advanced measurement data analysis and visualization platform for industrial applications. 
              Collaborate in real-time with cloud-based sessions and enterprise-grade security.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/auth/signup"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Get started
              </Link>
              <Link
                href="/auth/signin"
                className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Sign in <ArrowRightIcon className="inline h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
        
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" />
        </div>
      </div>

      {/* Features section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600 dark:text-blue-400">Deploy faster</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Everything you need for industrial analytics
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Replicate and enhance your desktop Centcom experience in the cloud with advanced collaboration 
              and real-time analytics capabilities.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              {features.map((feature) => (
                <div key={feature.name} className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                      <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300">{feature.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="bg-gray-50 dark:bg-gray-800">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600 dark:text-gray-300">
              Join thousands of engineers and analysts using Lyceum for their industrial measurement analysis.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/auth/signup"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Start free trial
              </Link>
              <Link
                href="/auth/signin"
                className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Sign in to existing account <ArrowRightIcon className="inline h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
