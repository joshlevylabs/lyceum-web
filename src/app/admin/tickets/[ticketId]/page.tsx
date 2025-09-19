'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeftIcon,
  PencilIcon,
  ChatBubbleLeftRightIcon,
  TagIcon,
  UserIcon,
  CalendarIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

// Custom Bug Icon Component
const BugIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    fill="currentColor" 
    viewBox="0 0 24 24"
  >
    <path d="M12 2c-1.1 0-2 .9-2 2 0 .74.4 1.38 1 1.73V7h2V5.73c.6-.35 1-.99 1-1.73 0-1.1-.9-2-2-2zm-4 7.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5V11h2v-.5c0-1.93-1.57-3.5-3.5-3.5h-5C7.57 7 6 8.57 6 10.5V11h2v-.5zM5 12v1.5c0 .83.67 1.5 1.5 1.5h1v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V15h2v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V15h1c.83 0 1.5-.67 1.5-1.5V12h2v1.5c0 1.93-1.57 3.5-3.5 3.5h-1v1.5c0 1.93-1.57 3.5-3.5 3.5s-3.5-1.57-3.5-3.5V17h-1C4.57 17 3 15.43 3 13.5V12h2z"/>
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

interface Comment {
  id: string
  ticket_id: string
  author_id: string
  author_name: string
  author_type: 'user' | 'admin' | 'system'
  content: string
  is_internal: boolean
  created_at: string
  updated_at: string
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
    case 'bug': return <BugIcon className="h-5 w-5 text-red-500" />
    case 'feature_request': return <CheckIcon className="h-5 w-5 text-blue-500" />
    case 'improvement': return <ArrowLeftIcon className="h-5 w-5 text-purple-500" />
    case 'support': return <ChatBubbleLeftRightIcon className="h-5 w-5 text-green-500" />
    default: return <TagIcon className="h-5 w-5 text-gray-500" />
  }
}

export default function TicketDetailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const ticketId = params.ticketId as string

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  // Edit form states
  const [editForm, setEditForm] = useState<Partial<Ticket>>({})

  const loadTicket = async () => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ticket: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        setTicket(data.ticket)
        setEditForm(data.ticket)
      } else {
        setError(data.error || 'Failed to load ticket')
      }
    } catch (err: any) {
      console.error('Error loading ticket:', err)
      setError(err.message || 'Failed to load ticket')
    }
  }

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/comments`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setComments(data.comments || [])
        }
      }
    } catch (err: any) {
      console.error('Error loading comments:', err)
    }
  }

  const handleSaveEdit = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTicket(data.ticket)
          setIsEditing(false)
        } else {
          alert('Failed to update ticket: ' + data.error)
        }
      } else {
        const data = await response.json()
        alert('Failed to update ticket: ' + data.error)
      }
    } catch (err: any) {
      console.error('Error updating ticket:', err)
      alert('Failed to update ticket')
    }
  }

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return

    setIsSubmittingComment(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newComment,
          is_internal: false
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setComments(prev => [...prev, data.comment])
          setNewComment('')
        } else {
          alert('Failed to add comment: ' + data.error)
        }
      } else {
        const data = await response.json()
        alert('Failed to add comment: ' + data.error)
      }
    } catch (err: any) {
      console.error('Error adding comment:', err)
      alert('Failed to add comment')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  useEffect(() => {
    if (user) {
      Promise.all([loadTicket(), loadComments()]).finally(() => {
        setLoading(false)
      })
    }
  }, [user, ticketId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3 mt-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/admin/tickets')}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Tickets
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error || 'Ticket not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/admin/tickets')}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Tickets
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <div className="flex items-center space-x-2">
            {getTypeIcon(ticket.ticket_type)}
            <h1 className="text-2xl font-bold text-gray-900">
              {ticket.ticket_key}: {ticket.title}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditForm(ticket)
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Save Changes
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Ticket
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center space-x-4">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
          {statusLabels[ticket.status]}
        </span>
        <span className="text-sm text-gray-600">Priority: {priorityLabels[ticket.priority]}</span>
        <div className={`w-2 h-2 rounded-full ${getPriorityColor(ticket.priority)}`}></div>
        {ticket.severity && (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(ticket.severity)}`}>
            {severityLabels[ticket.severity]}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Context */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">📱 Application Context</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Section:</span>
                <div className="text-sm text-gray-900">{ticket.application_section || 'Main Application'}</div>
              </div>
              {ticket.plugin_name && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Plugin:</span>
                  <div className="text-sm text-gray-900">📦 {ticket.plugin_name}</div>
                </div>
              )}
              {ticket.centcom_version && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Version:</span>
                  <div className="text-sm text-gray-900">v{ticket.centcom_version}</div>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-600">Submitter:</span>
                <div className="text-sm text-gray-900">{ticket.username}</div>
                <div className="text-xs text-gray-500">{ticket.email}</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Description</h3>
            {isEditing ? (
              <textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={6}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div className="text-sm text-gray-900 whitespace-pre-wrap">
                {ticket.description}
              </div>
            )}
          </div>

          {/* Bug Report Details */}
          {ticket.ticket_type === 'bug' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-4">🐛 Bug Report Details</h3>
              
              {(ticket.steps_to_reproduce || isEditing) && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Steps to Reproduce:</h4>
                  {isEditing ? (
                    <textarea
                      value={editForm.steps_to_reproduce || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, steps_to_reproduce: e.target.value }))}
                      rows={4}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter steps to reproduce..."
                    />
                  ) : (
                    <div className="text-sm text-gray-900 bg-white border rounded p-3 whitespace-pre-wrap">
                      {ticket.steps_to_reproduce}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(ticket.expected_behavior || isEditing) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Expected Behavior:</h4>
                    {isEditing ? (
                      <textarea
                        value={editForm.expected_behavior || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, expected_behavior: e.target.value }))}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter expected behavior..."
                      />
                    ) : (
                      <div className="text-sm text-gray-900 bg-white border rounded p-3 whitespace-pre-wrap">
                        {ticket.expected_behavior}
                      </div>
                    )}
                  </div>
                )}

                {(ticket.actual_behavior || isEditing) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Actual Behavior:</h4>
                    {isEditing ? (
                      <textarea
                        value={editForm.actual_behavior || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, actual_behavior: e.target.value }))}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter actual behavior..."
                      />
                    ) : (
                      <div className="text-sm text-gray-900 bg-white border rounded p-3 whitespace-pre-wrap">
                        {ticket.actual_behavior}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {(ticket.reproduction_rate || isEditing) && (
                <div className="mt-4">
                  <span className="text-sm font-medium text-gray-700">Reproduction Rate:</span>
                  {isEditing ? (
                    <select
                      value={editForm.reproduction_rate || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, reproduction_rate: e.target.value as any }))}
                      className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      <option value="always">Always</option>
                      <option value="sometimes">Sometimes</option>
                      <option value="rarely">Rarely</option>
                      <option value="once">Once</option>
                    </select>
                  ) : (
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getReproductionRateColor(ticket.reproduction_rate)}`}>
                      {reproductionRateLabels[ticket.reproduction_rate!]}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Environment Information */}
          {ticket.environment_info && Object.keys(ticket.environment_info).length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4">💻 Environment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ticket.environment_info.os && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Operating System:</span>
                    <div className="text-sm text-gray-900">{ticket.environment_info.os}</div>
                  </div>
                )}
                {ticket.environment_info.browser && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Browser:</span>
                    <div className="text-sm text-gray-900">{ticket.environment_info.browser}</div>
                  </div>
                )}
                {ticket.environment_info.screen_resolution && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Screen Resolution:</span>
                    <div className="text-sm text-gray-900">{ticket.environment_info.screen_resolution}</div>
                  </div>
                )}
                {ticket.environment_info.memory && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Memory:</span>
                    <div className="text-sm text-gray-900">{ticket.environment_info.memory}</div>
                  </div>
                )}
                {ticket.environment_info.additional_notes && (
                  <div className="col-span-2">
                    <span className="text-sm font-medium text-gray-600">Additional Notes:</span>
                    <div className="text-sm text-gray-900 bg-white border rounded p-3 mt-1 whitespace-pre-wrap">
                      {ticket.environment_info.additional_notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💬 Comments</h3>
            
            {/* Add Comment */}
            <div className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                placeholder="Add a comment..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                  {isSubmittingComment ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No comments yet</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{comment.author_name}</span>
                        <span className="text-xs text-gray-500">
                          {comment.author_type === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">
                      {comment.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Priority */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Status & Priority</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                {isEditing ? (
                  <select
                    value={editForm.status || ticket.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                    {statusLabels[ticket.status]}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                {isEditing ? (
                  <select
                    value={editForm.priority || ticket.priority}
                    onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900">{priorityLabels[ticket.priority]}</span>
                    <div className={`ml-2 w-2 h-2 rounded-full ${getPriorityColor(ticket.priority)}`}></div>
                  </div>
                )}
              </div>
              {(ticket.severity || isEditing) && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
                  {isEditing ? (
                    <select
                      value={editForm.severity || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, severity: e.target.value as any }))}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">None</option>
                      {Object.entries(severityLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  ) : (
                    ticket.severity && (
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(ticket.severity)}`}>
                        {severityLabels[ticket.severity]}
                      </span>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {ticket.tags && ticket.tags.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">🏷️ Tags</h3>
              <div className="flex flex-wrap gap-2">
                {ticket.tags.map((tag, index) => (
                  <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <TagIcon className="h-3 w-3 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Workflow Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">⚙️ Workflow</h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="font-medium text-gray-600">Created:</span>
                <div className="text-gray-900">{new Date(ticket.created_at).toLocaleString()}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Last Updated:</span>
                <div className="text-gray-900">{new Date(ticket.updated_at).toLocaleString()}</div>
              </div>
              {ticket.assigned_admin && (
                <div>
                  <span className="font-medium text-gray-600">Assigned To:</span>
                  <div className="text-gray-900">{ticket.assigned_admin.username}</div>
                </div>
              )}
            </div>
          </div>

          {/* Resolution */}
          {(ticket.resolution || isEditing) && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Resolution</h3>
              {isEditing ? (
                <textarea
                  value={editForm.resolution || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, resolution: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter resolution..."
                />
              ) : (
                ticket.resolution && (
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">
                    {ticket.resolution}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
