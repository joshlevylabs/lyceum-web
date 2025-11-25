'use client'

import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  ChartBarIcon,
  FlagIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  CloudIcon,
  ComputerDesktopIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface ClusterProject {
  id: string
  name: string
  description?: string
  external_project_id: string
  cluster_id: string
  cluster_name?: string
  cluster_type?: 'local' | 'cloud'
  project_type: string
  metadata: Record<string, any>
  sync_status: 'synced' | 'pending' | 'error' | 'disabled'
  last_synced_at?: string
  created_at: string
  updated_at: string
  measurement_count?: number
  file_count?: number
}

interface Project {
  id: string
  name: string
  project_key: string
  description?: string
  groups: string[]
  tags: string[]
  measurement_count: number
  flagged_count: number
  created_at: string
  updated_at: string
  created_by: string
  is_public: boolean
  data_types: string[]
}

export default function TestData() {
  const { user, userProfile } = useAuth()
  const [projects, setProjects] = useState<ClusterProject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'local' | 'cloud' | 'error'>('all')
  const [stats, setStats] = useState({
    total_projects: 0,
    total_measurements: 0,
    total_files: 0,
    by_cluster_type: { local: 0, cloud: 0 }
  })

  useEffect(() => {
    loadProjects()
  }, [filterType])

  const loadProjects = async () => {
    try {
      setLoading(true)

      // Fetch cluster projects from the API
      const queryParams = new URLSearchParams({
        project_type: 'test_data'
      })

      if (filterType === 'error') {
        queryParams.append('sync_status', 'error')
      }

      const response = await fetch(`/api/cluster-projects?${queryParams}`)

      if (!response.ok) {
        throw new Error('Failed to fetch cluster projects')
      }

      const data = await response.json()
      setProjects(data.projects || [])
      setStats(data.stats || stats)
    } catch (error) {
      console.error('Error loading cluster projects:', error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  // Filter projects by cluster type and search term
  const filteredProjects = projects.filter(project => {
    // Filter by cluster type
    if (filterType === 'local' && project.cluster_type !== 'local') return false
    if (filterType === 'cloud' && project.cluster_type !== 'cloud') return false
    if (filterType === 'error' && project.sync_status !== 'error') return false

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        project.name.toLowerCase().includes(searchLower) ||
        project.cluster_name?.toLowerCase().includes(searchLower) ||
        project.description?.toLowerCase().includes(searchLower)
      )
    }

    return true
  })

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
              Test Data Projects
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage and analyze your measurement data projects with advanced filtering and organization.
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">
            <button className="inline-flex items-center rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
              <DocumentArrowDownIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
              Import Data
            </button>
            <button className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
              <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
              New Project
            </button>
          </div>
        </div>

        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-l-4 border-blue-500 p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                Coming Soon
              </h3>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                Advanced test data management features are currently under development. Stay tuned for updates!
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CircleStackIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Projects</dt>
                    <dd className="text-lg font-semibold text-gray-900 dark:text-white">{stats.total_projects}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Measurements</dt>
                    <dd className="text-lg font-semibold text-gray-900 dark:text-white">{stats.total_measurements.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ComputerDesktopIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Local Clusters</dt>
                    <dd className="text-lg font-semibold text-gray-900 dark:text-white">{stats.by_cluster_type.local}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CloudIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Cloud Clusters</dt>
                    <dd className="text-lg font-semibold text-gray-900 dark:text-white">{stats.by_cluster_type.cloud}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex space-x-4">
            {[
              { key: 'all', label: 'All Projects' },
              { key: 'local', label: 'Local' },
              { key: 'cloud', label: 'Cloud' },
              { key: 'error', label: 'Sync Errors' },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setFilterType(filter.key as any)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filterType === filter.key
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
              <FunnelIcon className="h-4 w-4 mr-2" />
              Advanced Filters
            </button>
            
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 dark:text-white dark:bg-gray-800 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>
        </div>

        {/* Projects Table */}
        <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading projects...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Cluster
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Measurements / Files
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Sync Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Last Synced
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredProjects.map((project) => (
                      <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                <CircleStackIcon className="h-6 w-6 text-blue-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {project.name}
                              </div>
                              {project.description && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {project.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {project.cluster_type === 'local' ? (
                              <ComputerDesktopIcon className="h-5 w-5 text-gray-400 mr-2" />
                            ) : (
                              <CloudIcon className="h-5 w-5 text-gray-400 mr-2" />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {project.cluster_name || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                {project.cluster_type}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {(project.measurement_count || 0).toLocaleString()} measurements
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {(project.file_count || 0).toLocaleString()} files
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            project.sync_status === 'synced'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : project.sync_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : project.sync_status === 'error'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {project.sync_status === 'pending' && <ArrowPathIcon className="h-3 w-3 mr-1 animate-spin" />}
                            {project.sync_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {project.last_synced_at ? (
                            <div className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              {formatRelativeTime(project.last_synced_at)}
                            </div>
                          ) : (
                            <span className="text-gray-400">Never</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="View project"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                              title="View analytics"
                            >
                              <ChartBarIcon className="h-4 w-4" />
                            </button>
                            <button
                              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                              title="Sync now"
                              onClick={() => {
                                // TODO: Trigger sync
                              }}
                            >
                              <ArrowPathIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredProjects.length === 0 && (
              <div className="text-center py-12">
                <CircleStackIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No projects found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'No projects match your search criteria.' : 'Get started by creating your first project.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
                      <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                      New Project
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 