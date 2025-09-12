'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  ClockIcon,
  UserIcon,
  FlagIcon,
  ChartBarIcon,
  CloudIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import { 
  PresentationChartLineIcon as PresentationChartLineIconSolid,
  UserGroupIcon as UserGroupIconSolid
} from '@heroicons/react/24/solid'
import Link from 'next/link'

interface AnalyticsSession {
  id: string
  name: string
  description?: string
  session_type: 'exploratory' | 'monitoring' | 'comparison' | 'collaborative'
  status: 'active' | 'paused' | 'archived' | 'error'
  created_at: string
  updated_at: string
  created_by: string
  config: any
  is_public: boolean
  collaborators_count: number
  measurements_count: number
}

export default function AnalyticsStudio() {
  const { user, userProfile } = useAuth()
  const [sessions, setSessions] = useState<AnalyticsSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'my-sessions' | 'shared' | 'recent'>('all')
  
  useEffect(() => {
    loadSessions()
  }, [filterType, searchTerm])

  const loadSessions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch real sessions from the API instead of direct Supabase calls
      const queryParams = new URLSearchParams({
        filterType: filterType,
        page: '1',
        pageSize: '50'
      })
      
      if (searchTerm) {
        queryParams.append('search', searchTerm)
      }

      const response = await fetch(`/api/analytics-sessions?${queryParams}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics sessions')
      }
      
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (err) {
      console.error('Error loading sessions:', err)
      setError('Failed to load analytics sessions')
      // Show empty state instead of fallback data
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  const filteredSessions = sessions.filter(session =>
    session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'exploratory': return ChartBarIcon
      case 'monitoring': return EyeIcon
      case 'comparison': return PresentationChartLineIconSolid
      case 'collaborative': return UserGroupIconSolid
      default: return DocumentArrowDownIcon
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const handleCreateSession = () => {
    setShowCreateModal(true)
  }

  const handleCreateSessionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const formData = new FormData(e.currentTarget)
      const sessionData = {
        name: formData.get('sessionName') as string,
        description: formData.get('sessionDescription') as string,
        session_type: formData.get('sessionType') as string,
        is_public: formData.get('isPublic') === 'on',
        config: {
          auto_refresh: true,
          refresh_interval: 30,
          allow_collaboration: formData.get('sessionType') === 'collaborative',
          max_collaborators: 10,
          data_retention_days: 90
        }
      }

      const response = await fetch('/api/analytics-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create session')
      }

      const result = await response.json()
      
      // Add the new session to the list
      setSessions(prev => [result.session, ...prev])
      
      // Close the modal
      setShowCreateModal(false)
      
      // Reset any errors
      setError(null)
      
    } catch (err) {
      console.error('Error creating session:', err)
      setError('Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  const handleSessionAction = async (sessionId: string, action: 'open' | 'edit' | 'delete' | 'share') => {
    switch (action) {
      case 'open':
        // Navigate to session workspace
        window.location.href = `/analytics-studio/session/${sessionId}`
        break
      case 'edit':
        // Open edit modal or navigate to edit page
        break
      case 'delete':
        if (confirm('Are you sure you want to delete this session?')) {
          try {
            const response = await fetch(`/api/analytics-sessions`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sessionId }),
            })

            if (response.ok) {
              setSessions(prev => prev.filter(s => s.id !== sessionId))
            } else {
              throw new Error('Failed to delete session')
            }
          } catch (err) {
            console.error('Error deleting session:', err)
            setError('Failed to delete session')
          }
        }
        break
      case 'share':
        // Open share modal
        break
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
              🎯 Analytics Studio
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create, manage, and collaborate on analytics sessions. Sessions are automatically saved to the cloud.
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0">
            <button
              onClick={handleCreateSession}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              New Session
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex space-x-4">
            {[
              { key: 'all', label: 'All Sessions' },
              { key: 'my-sessions', label: 'My Sessions' },
              { key: 'shared', label: 'Shared' },
              { key: 'recent', label: 'Recent' },
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
          
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 dark:text-white dark:bg-gray-800 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4">
            <div className="text-sm text-red-700 dark:text-red-200">
              {error}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading sessions...</span>
          </div>
        )}

        {/* Sessions Grid */}
        {!loading && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {filteredSessions.map((session) => {
              const TypeIcon = getTypeIcon(session.session_type)
              return (
                <div
                  key={session.id}
                  className="relative flex flex-col rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <TypeIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                          {session.name}
                        </h3>
                      </div>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {session.description || 'No description provided'}
                  </p>

                  {/* Metadata */}
                  <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <ChartBarIcon className="mr-1 h-4 w-4" />
                      {session.measurements_count} measurements
                    </div>
                    {session.collaborators_count > 0 && (
                      <div className="flex items-center">
                        <UserIcon className="mr-1 h-4 w-4" />
                        {session.collaborators_count} collaborators
                      </div>
                    )}
                    {session.is_public && (
                      <div className="flex items-center">
                        <ShareIcon className="mr-1 h-4 w-4" />
                        Public
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <ClockIcon className="mr-1 h-3 w-3" />
                      Updated {formatRelativeTime(session.updated_at)}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSessionAction(session.id, 'open')}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                      >
                        <EyeIcon className="h-3 w-3 mr-1" />
                        Open
                      </button>
                      
                      {session.created_by === user?.id && (
                        <>
                          <button
                            onClick={() => handleSessionAction(session.id, 'edit')}
                            className="inline-flex items-center p-1.5 border border-transparent rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleSessionAction(session.id, 'delete')}
                            className="inline-flex items-center p-1.5 border border-transparent rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredSessions.length === 0 && (
          <div className="text-center py-12">
            <CloudIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No analytics sessions</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No sessions match your search.' : 'Get started by creating a new analytics session.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={handleCreateSession}
                  className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                >
                  <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                  New Session
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowCreateModal(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Create New Analytics Session
              </h3>
              
              <form onSubmit={handleCreateSessionSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="sessionName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Session Name
                    </label>
                    <input
                      type="text"
                      id="sessionName"
                      name="sessionName"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter session name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="sessionDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      id="sessionDescription"
                      name="sessionDescription"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Describe your analytics session"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="sessionType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Session Type
                    </label>
                    <select
                      id="sessionType"
                      name="sessionType"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="exploratory">Exploratory</option>
                      <option value="monitoring">Monitoring</option>
                      <option value="comparison">Comparison</option>
                      <option value="collaborative">Collaborative</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isPublic"
                      name="isPublic"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Make this session public
                    </label>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Create Session
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
} 