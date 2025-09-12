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
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

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
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'my-projects' | 'shared' | 'flagged'>('all')

  useEffect(() => {
    loadProjects()
  }, [filterType, searchTerm])

  const loadProjects = async () => {
    try {
      setLoading(true)
      
      // Fetch real projects from the API
      const queryParams = new URLSearchParams({
        filterType: filterType,
        page: '1',
        pageSize: '50'
      })
      
      if (searchTerm) {
        queryParams.append('search', searchTerm)
      }

      const response = await fetch(`/api/projects?${queryParams}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }
      
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Error loading projects:', error)
      // Show empty state instead of fallback data
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  // Since filtering is now handled by the API, we just use projects directly
  const filteredProjects = projects

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

        {/* Filters and Search */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex space-x-4">
            {[
              { key: 'all', label: 'All Projects' },
              { key: 'my-projects', label: 'My Projects' },
              { key: 'shared', label: 'Shared' },
              { key: 'flagged', label: 'Flagged' },
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
                        Groups & Tags
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Measurements
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Updated
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredProjects.map((project) => (
                      <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
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
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {project.project_key}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {project.groups.slice(0, 2).map((group) => (
                                <span
                                  key={group}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                >
                                  {group}
                                </span>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {project.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                                >
                                  <TagIcon className="h-3 w-3 mr-1" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {project.measurement_count.toLocaleString()}
                          </div>
                          {project.flagged_count > 0 && (
                            <div className="flex items-center text-sm text-orange-600 dark:text-orange-400">
                              <FlagIcon className="h-4 w-4 mr-1" />
                              {project.flagged_count} flagged
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {formatRelativeTime(project.updated_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300">
                              <ChartBarIcon className="h-4 w-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300">
                              <Cog6ToothIcon className="h-4 w-4" />
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