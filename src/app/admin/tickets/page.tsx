'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  MagnifyingGlass,
  Funnel,
  Eye,
  ChatCircle,
  Paperclip,
  CalendarBlank,
  User,
  CheckCircle,
  Clock,
  Tag,
  Faders,
  CaretLeft,
  CaretRight,
  Ticket,
  Warning,
  X
} from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'

// Custom Bug Icon Component
const BugIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    fill="currentColor" 
    viewBox="0 0 24 24"
  >
    {/* Bug body */}
    <ellipse cx="12" cy="13" rx="4" ry="6" />
    
    {/* Bug head */}
    <circle cx="12" cy="6" r="2.5" />
    
    {/* Antennae */}
    <path d="M10.5 4.5C10.5 4.5 9 3 8 2.5" stroke="currentColor" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
    <path d="M13.5 4.5C13.5 4.5 15 3 16 2.5" stroke="currentColor" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
    
    {/* Left legs */}
    <path d="M8 10L5 8" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round"/>
    <path d="M8 13L4 12" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round"/>
    <path d="M8 16L5 18" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round"/>
    
    {/* Right legs */}
    <path d="M16 10L19 8" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round"/>
    <path d="M16 13L20 12" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round"/>
    <path d="M16 16L19 18" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round"/>
    
    {/* Wing pattern */}
    <ellipse cx="10" cy="11" rx="1.5" ry="3" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.6"/>
    <ellipse cx="14" cy="11" rx="1.5" ry="3" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.6"/>
  </svg>
)

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
  user_id: string
  
  // Application Context
  application_section: string
  plugin_name?: string
  centcom_version?: string
  
  // Bug Report Fields
  steps_to_reproduce?: string
  expected_behavior?: string
  actual_behavior?: string
  reproduction_rate?: 'always' | 'sometimes' | 'rarely' | 'once'
  
  // Environment Information
  environment_info?: {
    os?: string
    browser?: string
    screen_resolution?: string
    memory?: string
    network?: string
    additional_notes?: string
  }
  
  // Metadata
  tags: string[]
  created_at: string
  updated_at: string
  resolved_at?: string
  closed_at?: string
  
  // Assignment & Workflow
  assigned_to_admin_id?: string
  assigned_at?: string
  assigned_admin?: {
    id: string
    username: string
    full_name: string
  }
  resolution?: string
  internal_notes?: string
  
  // Additional Fields
  estimated_effort_hours?: number
  actual_effort_hours?: number
  user_satisfaction_rating?: number
  user_satisfaction_feedback?: string
  
  // Computed Fields
  comments_count?: [{ count: number }]
  attachments_count?: [{ count: number }]
}

interface Filters {
  search: string
  status: string
  ticket_type: string
  priority: string
  severity: string
  application_section: string
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

const severityLabels = {
  critical: 'Critical',
  major: 'Major',
  minor: 'Minor',
  cosmetic: 'Cosmetic'
}

const reproductionRateLabels = {
  always: 'Always',
  sometimes: 'Sometimes',
  rarely: 'Rarely',
  once: 'Once'
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

const getSeverityColor = (severity?: string) => {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800'
    case 'major': return 'bg-orange-100 text-orange-800'
    case 'minor': return 'bg-yellow-100 text-yellow-800'
    case 'cosmetic': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getReproductionRateColor = (rate?: string) => {
  switch (rate) {
    case 'always': return 'bg-red-100 text-red-800'
    case 'sometimes': return 'bg-orange-100 text-orange-800'
    case 'rarely': return 'bg-yellow-100 text-yellow-800'
    case 'once': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'bug': return <BugIcon className="h-4 w-4 text-red-500" />
    case 'feature_request': return <CheckCircle className="h-4 w-4 text-blue-500" />
    case 'improvement': return <Faders className="h-4 w-4 text-purple-500" />
    case 'support': return <ChatCircle className="h-4 w-4 text-green-500" />
    default: return <Clock className="h-4 w-4 text-gray-500" />
  }
}

export default function AdminTicketsPage() {
  const { user } = useAuth()
  const router = useRouter()
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
    severity: '',
    application_section: '',
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
  }, [user, filters.status, filters.ticket_type, filters.priority, filters.severity, filters.application_section, filters.assigned_to])

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
      const response = await fetch(`/api/tickets/by-id/${ticketId}`, {
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

  const openTicketView = (ticket: Ticket) => {
    // Navigate to the ticket detail page using ticket key
    router.push(`/admin/tickets/${ticket.ticket_key}`)
  }

  if (loading && tickets.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support Tickets</h1>
          <p className="text-sm text-foreground/60 mt-1">Manage user-submitted tickets from Centcom</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support Tickets</h1>
          <p className="text-sm text-foreground/60 mt-1">Manage user-submitted tickets from Centcom</p>
        </div>
        <div className="glass-card p-4 border-red-500/20">
          <div className="flex">
            <Warning className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-foreground">Error loading tickets</h3>
              <p className="mt-1 text-sm text-foreground/60">{error}</p>
              <div className="mt-2 flex space-x-2">
                <button
                  onClick={() => loadTickets()}
                  className="text-sm text-cyan-400 hover:text-cyan-300 underline"
                >
                  Try again
                </button>
                {error?.includes('setup') && (
                  <button
                    onClick={getSetupInstructions}
                    className="btn-primary text-sm px-3 py-1"
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
          <h1 className="text-2xl font-bold text-foreground">Support Tickets</h1>
          <p className="text-sm text-foreground/60 mt-1">Manage user-submitted tickets from Centcom</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-ghost inline-flex items-center px-3 py-2"
          >
            <Funnel className="h-4 w-4 mr-2" />
            Filters
          </button>
          <button
            onClick={() => loadTickets()}
            className="btn-primary inline-flex items-center px-3 py-2"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card p-4">
        <form onSubmit={handleSearch} className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-3 h-4 w-4 text-foreground/40" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search tickets by key, title, description, username, application, or tags..."
                className="glass-input pl-10 w-full px-3 py-2 text-sm text-foreground placeholder-foreground/40"
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn-primary px-4 py-2 text-sm font-medium"
          >
            Search
          </button>
        </form>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-cyan-500/10">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="glass-input w-full px-3 py-2 text-sm text-foreground"
                >
                  <option value="">All Statuses</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Type</label>
                <select
                  value={filters.ticket_type}
                  onChange={(e) => handleFilterChange('ticket_type', e.target.value)}
                  className="glass-input w-full px-3 py-2 text-sm text-foreground"
                >
                  <option value="">All Types</option>
                  {Object.entries(ticketTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="glass-input w-full px-3 py-2 text-sm text-foreground"
                >
                  <option value="">All Priorities</option>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Severity</label>
                <select
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                  className="glass-input w-full px-3 py-2 text-sm text-foreground"
                >
                  <option value="">All Severities</option>
                  {Object.entries(severityLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Application</label>
                <select
                  value={filters.application_section}
                  onChange={(e) => handleFilterChange('application_section', e.target.value)}
                  className="glass-input w-full px-3 py-2 text-sm text-foreground"
                >
                  <option value="">All Applications</option>
                  <option value="main_application">Main Application</option>
                  <option value="data_export">Data Export</option>
                  <option value="reports">Reports</option>
                  <option value="settings">Settings</option>
                  <option value="plugins">Plugins</option>
                  <option value="integrations">Integrations</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Assigned To</label>
                <select
                  value={filters.assigned_to}
                  onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
                  className="glass-input w-full px-3 py-2 text-sm text-foreground"
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
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-cyan-500/10">
            <thead className="bg-background">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-foreground/60 uppercase tracking-wider w-16">
                  View
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider w-24">
                  Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-foreground/60 uppercase tracking-wider w-16">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                  Application
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                  Submitter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                  Activity
                </th>
              </tr>
            </thead>
            <tbody className="bg-background divide-y divide-cyan-500/10">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-cyan-500/5 transition-colors">
                  {/* View Button Column */}
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => openTicketView(ticket)}
                      className="text-cyan-400 hover:text-cyan-300 p-1 rounded-full hover:bg-cyan-500/10 transition-colors"
                      title="View ticket details"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </td>

                  {/* Key Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-cyan-400">{ticket.ticket_key}</span>
                      <div className={`ml-2 w-2 h-2 rounded-full ${getPriorityColor(ticket.priority)}`}></div>
                    </div>
                  </td>

                  {/* Title Column */}
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <div className="text-sm text-foreground font-medium truncate">
                        {ticket.title}
                      </div>
                      <div className="text-sm text-foreground/60 truncate">
                        {ticket.description}
                      </div>
                    </div>
                  </td>
                  
                  {/* Type Icon Column */}
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div title={ticketTypeLabels[ticket.ticket_type]}>
                      {getTypeIcon(ticket.ticket_type)}
                    </div>
                  </td>
                  
                  {/* Status Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                      {statusLabels[ticket.status]}
                    </span>
                  </td>

                  {/* Priority Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {priorityLabels[ticket.priority]}
                  </td>

                  {/* Severity Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {ticket.severity ? (
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(ticket.severity)}`}>
                        {severityLabels[ticket.severity]}
                      </span>
                    ) : (
                      <span className="text-xs text-foreground/40">-</span>
                    )}
                  </td>

                  {/* Tags Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {ticket.tags && ticket.tags.length > 0 ? (
                        ticket.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-foreground/40">-</span>
                      )}
                      {ticket.tags && ticket.tags.length > 3 && (
                        <span className="text-xs text-foreground/60">+{ticket.tags.length - 3}</span>
                      )}
                    </div>
                  </td>

                  {/* Application Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {ticket.application_section || 'Main Application'}
                      </div>
                      {ticket.plugin_name && (
                        <div className="text-xs text-foreground/60">
                          📦 {ticket.plugin_name}
                        </div>
                      )}
                      {ticket.centcom_version && (
                        <div className="text-xs text-foreground/60">
                          v{ticket.centcom_version}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Submitter Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-foreground/40 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-foreground">{ticket.username}</div>
                        <div className="text-sm text-foreground/60">{ticket.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Created Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-foreground">
                      <CalendarBlank className="h-4 w-4 text-foreground/40 mr-2" />
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </div>
                  </td>

                  {/* Activity Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center text-sm text-foreground/60">
                        <ChatCircle className="h-4 w-4 mr-1" />
                        {ticket.comments_count?.[0]?.count || 0}
                      </div>
                      <div className="flex items-center text-sm text-foreground/60">
                        <Paperclip className="h-4 w-4 mr-1" />
                        {ticket.attachments_count?.[0]?.count || 0}
                      </div>
                    </div>
                  </td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTickets.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-foreground/60">
              <Ticket className="mx-auto h-12 w-12 text-foreground/40" weight="duotone" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No tickets found</h3>
              <p className="mt-1 text-sm text-foreground/60">
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
            className="btn-ghost inline-flex items-center px-4 py-2 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}


      {/* Setup Instructions Modal */}
      {setupInstructions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 w-11/12 max-w-4xl glass-card">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-foreground">Database Setup Instructions</h2>
              <button
                onClick={() => setSetupInstructions(null)}
                className="p-2 rounded-lg text-foreground/50 hover:text-cyan-400 hover:bg-cyan-500/10"
              >
                <X className="h-5 w-5" weight="bold" />
              </button>
            </div>

            <div className="space-y-4">
              {setupInstructions.success ? (
                <div className="glass-card p-4 border-emerald-500/20">
                  <p className="text-emerald-400">{setupInstructions.message}</p>
                </div>
              ) : (
                <>
                  <div className="glass-card p-4 border-amber-500/20">
                    <p className="text-amber-400">{setupInstructions.message}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Instructions:</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-foreground/60">
                      {setupInstructions.instructions?.map((instruction: string, index: number) => (
                        <li key={index}>{instruction}</li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">SQL Script:</h3>
                    <div className="glass-card p-3 max-h-96 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap font-mono text-foreground">
                        {setupInstructions.sql_script}
                      </pre>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(setupInstructions.sql_script)}
                      className="btn-primary mt-2 text-sm px-3 py-1"
                    >
                      Copy SQL Script
                    </button>
                  </div>

                  <div className="pt-4">
                    <p className="text-sm text-foreground/60 mb-2">
                      After running the SQL script in your Supabase dashboard, click "Try again" to refresh this page.
                    </p>
                    <button
                      onClick={() => {
                        setSetupInstructions(null)
                        loadTickets()
                      }}
                      className="btn-primary px-4 py-2"
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
