'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  PaperClipIcon,
  CalendarIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  TagIcon,
  AdjustmentsHorizontalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TicketIcon
} from '@heroicons/react/24/outline'

interface Ticket {
  id: string
  ticket_key: string
  title: string
  description: string
  ticket_type: 'bug' | 'feature_request' | 'improvement' | 'support' | 'other'
  status: 'open' | 'in_progress' | 'pending_user' | 'resolved' | 'closed' | 'duplicate' | 'wont_fix'
  priority: 'critical' | 'high' | 'medium' | 'low'
  severity?: 'critical' | 'major' | 'minor' | 'cosmetic'
  username: string
  email: string
  application_section: string
  plugin_name?: string
  centcom_version?: string
  created_at: string
  updated_at: string
  assigned_admin?: {
    id: string
    username: string
    full_name: string
  }
  comments_count?: [{ count: number }]
  attachments_count?: [{ count: number }]
  tags: string[]
}

interface Filters {
  search: string
  status: string
  ticket_type: string
  priority: string
  assigned_to: string
}

const ticketTypeLabels = {
  bug: 'Bug',
  feature_request: 'Feature',
  improvement: 'Enhancement',
  support: 'Support',
  other: 'Other'
}

const statusLabels = {
  open: 'Open',
  in_progress: 'In Progress',
  pending_user: 'Pending User',
  resolved: 'Resolved',
  closed: 'Closed',
  duplicate: 'Duplicate',
  wont_fix: "Won't Fix"
}

const priorityLabels = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open': return 'bg-red-100 text-red-800'
    case 'in_progress': return 'bg-blue-100 text-blue-800'
    case 'pending_user': return 'bg-yellow-100 text-yellow-800'
    case 'resolved': return 'bg-green-100 text-green-800'
    case 'closed': return 'bg-gray-100 text-gray-800'
    case 'duplicate': return 'bg-purple-100 text-purple-800'
    case 'wont_fix': return 'bg-orange-100 text-orange-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical': return 'bg-red-500'
    case 'high': return 'bg-orange-500'
    case 'medium': return 'bg-yellow-500'
    case 'low': return 'bg-green-500'
    default: return 'bg-gray-500'
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'bug': return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
    case 'feature_request': return <CheckCircleIcon className="h-4 w-4 text-blue-500" />
    case 'improvement': return <AdjustmentsHorizontalIcon className="h-4 w-4 text-purple-500" />
    case 'support': return <ChatBubbleLeftRightIcon className="h-4 w-4 text-green-500" />
    default: return <ClockIcon className="h-4 w-4 text-gray-500" />
  }
}

export default function AdminTicketsPage() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    ticket_type: '',
    priority: '',
    assigned_to: ''
  })

  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 25,
    hasMore: false
  })

  const [setupInstructions, setSetupInstructions] = useState<any>(null)

  const loadTickets = async (resetPagination = true) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const searchParams = new URLSearchParams()
      if (filters.status) searchParams.append('status', filters.status)
      if (filters.ticket_type) searchParams.append('ticket_type', filters.ticket_type)
      if (filters.priority) searchParams.append('priority', filters.priority)
      if (filters.assigned_to) searchParams.append('assigned_to', filters.assigned_to)
      
      const currentOffset = resetPagination ? 0 : pagination.offset
      searchParams.append('limit', pagination.limit.toString())
      searchParams.append('offset', currentOffset.toString())

      const response = await fetch(`/api/tickets?${searchParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        if (resetPagination) {
          setTickets(data.tickets || [])
          setPagination(prev => ({ ...prev, offset: 0, hasMore: data.pagination.has_more }))
        } else {
          setTickets(prev => [...prev, ...(data.tickets || [])])
          setPagination(prev => ({ ...prev, offset: currentOffset + pagination.limit, hasMore: data.pagination.has_more }))
        }
      } else {
        if (data.setup_required) {
          setError(`${data.message} Click "Setup Database" below to get setup instructions.`)
        } else {
          setError(data.error || 'Failed to load tickets')
        }
      }
    } catch (err: any) {
      console.error('Error loading tickets:', err)
      setError(err.message || 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [user, filters.status, filters.ticket_type, filters.priority, filters.assigned_to])

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // For now, we'll implement search on the frontend
    // In production, you'd want to implement server-side search
    loadTickets(true)
  }

  const getSetupInstructions = async () => {
    try {
      const response = await fetch('/api/admin/setup-ticket-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      setSetupInstructions(data)
    } catch (err) {
      console.error('Error getting setup instructions:', err)
      alert('Failed to get setup instructions. Please check the console.')
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      return (
        ticket.ticket_key.toLowerCase().includes(searchLower) ||
        ticket.title.toLowerCase().includes(searchLower) ||
        ticket.description.toLowerCase().includes(searchLower) ||
        ticket.username.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    if (!user) return

    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        // Reload tickets to get updated data
        loadTickets(true)
        // Update selected ticket if it's the one being updated
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(prev => prev ? { ...prev, status: newStatus as any } : null)
        }
      } else {
        const data = await response.json()
        alert(`Failed to update ticket: ${data.error}`)
      }
    } catch (err: any) {
      console.error('Error updating ticket status:', err)
      alert('Failed to update ticket status')
    }
  }

  if (loading && tickets.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">Manage user-submitted tickets from Centcom</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">Manage user-submitted tickets from Centcom</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading tickets</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <div className="mt-2 flex space-x-2">
                <button 
                  onClick={() => loadTickets()}
                  className="text-sm text-red-600 hover:text-red-500 underline"
                >
                  Try again
                </button>
                {error?.includes('setup') && (
                  <button
                    onClick={getSetupInstructions}
                    className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Setup Database
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">Manage user-submitted tickets from Centcom</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
          <button
            onClick={() => loadTickets()}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search tickets by key, title, description, or username..."
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Search
          </button>
        </form>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.ticket_type}
                  onChange={(e) => handleFilterChange('ticket_type', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {Object.entries(ticketTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Priorities</option>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <select
                  value={filters.assigned_to}
                  onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Assignees</option>
                  <option value="unassigned">Unassigned</option>
                  {/* In production, you'd load actual admin users here */}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-blue-600">{ticket.ticket_key}</span>
                        <div className={`ml-2 w-2 h-2 rounded-full ${getPriorityColor(ticket.priority)}`}></div>
                      </div>
                      <div className="text-sm text-gray-900 font-medium mt-1 max-w-xs truncate">
                        {ticket.title}
                      </div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {ticket.description}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getTypeIcon(ticket.ticket_type)}
                      <span className="ml-2 text-sm text-gray-900">
                        {ticketTypeLabels[ticket.ticket_type]}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                      {statusLabels[ticket.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {priorityLabels[ticket.priority]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ticket.username}</div>
                        <div className="text-sm text-gray-500">{ticket.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center text-sm text-gray-500">
                        <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                        {ticket.comments_count?.[0]?.count || 0}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <PaperClipIcon className="h-4 w-4 mr-1" />
                        {ticket.attachments_count?.[0]?.count || 0}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <select
                        value={ticket.status}
                        onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTickets.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <TicketIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filters.search || filters.status || filters.ticket_type || filters.priority
                  ? 'Try adjusting your search criteria'
                  : 'No tickets have been submitted yet'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {pagination.hasMore && (
        <div className="text-center">
          <button
            onClick={() => loadTickets(false)}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Ticket Detail Modal - You would implement this as a separate component */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">{selectedTicket.ticket_key}: {selectedTicket.title}</h2>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Status:</span>
                  <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedTicket.status)}`}>
                    {statusLabels[selectedTicket.status]}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Priority:</span>
                  <span className="ml-2 text-sm">{priorityLabels[selectedTicket.priority]}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Type:</span>
                  <span className="ml-2 text-sm">{ticketTypeLabels[selectedTicket.ticket_type]}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Submitter:</span>
                  <span className="ml-2 text-sm">{selectedTicket.username} ({selectedTicket.email})</span>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Description:</span>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded">
                  {selectedTicket.description}
                </div>
              </div>
              {selectedTicket.tags.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Tags:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedTicket.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <TagIcon className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Setup Instructions Modal */}
      {setupInstructions && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Database Setup Instructions</h2>
              <button
                onClick={() => setSetupInstructions(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {setupInstructions.success ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="text-green-800">{setupInstructions.message}</p>
                </div>
              ) : (
                <>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-yellow-800">{setupInstructions.message}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Instructions:</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      {setupInstructions.instructions?.map((instruction: string, index: number) => (
                        <li key={index}>{instruction}</li>
                      ))}
                    </ol>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">SQL Script:</h3>
                    <div className="bg-gray-100 border rounded p-3 max-h-96 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {setupInstructions.sql_script}
                      </pre>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(setupInstructions.sql_script)}
                      className="mt-2 text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Copy SQL Script
                    </button>
                  </div>
                  
                  <div className="pt-4">
                    <p className="text-sm text-gray-600 mb-2">
                      After running the SQL script in your Supabase dashboard, click "Try again" to refresh this page.
                    </p>
                    <button
                      onClick={() => {
                        setSetupInstructions(null)
                        loadTickets()
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      I've run the script - Try again
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
