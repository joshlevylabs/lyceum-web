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
  XMarkIcon,
  ClockIcon,
  DocumentIcon,
  PaperClipIcon,
  PhotoIcon,
  VideoCameraIcon,
  EyeIcon,
  TrashIcon,
  ChatBubbleLeftIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  BugAntIcon
} from '@heroicons/react/24/outline'
import FileUpload from '@/components/FileUpload'

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

interface TimelineEvent {
  id: string
  commentId?: string // The actual comment UUID for edit/delete operations (when type is 'comment')
  type: 'created' | 'comment' | 'status_change' | 'assignment' | 'resolution' | 'attachment' | 'update' | 'comment_edit' | 'comment_delete'
  timestamp: string
  author: string
  authorType: 'user' | 'admin' | 'system'
  title: string
  description?: string
  metadata?: Record<string, any>
  attachments?: any[] // Attachments associated with this timeline event (e.g., comment attachments)
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

// Function to get timeline event icon
const getTimelineIcon = (eventType: TimelineEvent['type']) => {
  switch (eventType) {
    case 'created':
      return <ClockIcon className="h-3 w-3 text-blue-500" />
    case 'comment':
      return <ChatBubbleLeftIcon className="h-3 w-3 text-green-500" />
    case 'comment_edit':
      return <PencilIcon className="h-3 w-3 text-orange-500" />
    case 'comment_delete':
      return <TrashIcon className="h-3 w-3 text-red-500" />
    case 'status_change':
      return <ArrowPathIcon className="h-3 w-3 text-purple-500" />
    case 'assignment':
      return <UserIcon className="h-3 w-3 text-indigo-500" />
    case 'resolution':
      return <CheckIcon className="h-3 w-3 text-green-600" />
    case 'attachment':
      return <PaperClipIcon className="h-3 w-3 text-gray-500" />
    case 'update':
      return <PencilIcon className="h-3 w-3 text-blue-400" />
    default:
      return <ClockIcon className="h-3 w-3 text-gray-400" />
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
  const ticketKey = params.ticketKey as string

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentAttachments, setCommentAttachments] = useState<any[]>([])
  const [fileUploadResetTrigger, setFileUploadResetTrigger] = useState(0)
  const [attachments, setAttachments] = useState<any[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)

  // Edit form states
  const [editForm, setEditForm] = useState<Partial<Ticket>>({})
  
  // Comment editing states
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [isUpdatingComment, setIsUpdatingComment] = useState(false)
  const [isDeletingComment, setIsDeletingComment] = useState<string | null>(null)
  
  // Delete confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<{ id: string; hasAttachments: boolean } | null>(null)

  const loadTicket = async () => {
    try {
      const response = await fetch(`/api/tickets/by-key/${ticketKey}`)
      
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

  const loadTimeline = async () => {
    try {
      const response = await fetch(`/api/tickets/by-key/${ticketKey}/timeline`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTimeline(data.timeline || [])
        }
      }
    } catch (err: any) {
      console.error('Error loading timeline:', err)
    }
  }

  const loadAttachments = async () => {
    if (!ticket?.id) return

    setLoadingAttachments(true)
    try {
      const response = await fetch(`/api/tickets/by-id/${ticket.id}/attachments`)
      if (response.ok) {
        const data = await response.json()
        setAttachments(data.attachments || [])
      } else {
        console.error('Failed to load attachments:', response.statusText)
      }
    } catch (error) {
      console.error('Error loading attachments:', error)
    } finally {
      setLoadingAttachments(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!user || !ticket) return

    try {
      const response = await fetch(`/api/tickets/by-key/${ticketKey}`, {
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
          // Reload timeline to show status changes
          loadTimeline()
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
    if (!user || !newComment.trim() || !ticket) return

    setIsSubmittingComment(true)
    try {
      const response = await fetch(`/api/tickets/by-key/${ticketKey}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newComment,
          is_internal: false,
          attachment_ids: commentAttachments.map(att => att.id) // Include attached files
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setNewComment('')
          setCommentAttachments([]) // Clear comment attachments
          setFileUploadResetTrigger(prev => prev + 1) // Reset FileUpload component
          // Reload timeline and attachments to show new comment
          loadTimeline()
          loadAttachments()
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

  const handleEditComment = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId)
    setEditingCommentText(currentText)
  }

  const handleCancelEditComment = () => {
    setEditingCommentId(null)
    setEditingCommentText('')
  }

  const handleSaveEditComment = async () => {
    if (!editingCommentId || !editingCommentText.trim()) return

    setIsUpdatingComment(true)
    try {
      const response = await fetch(`/api/tickets/by-key/${ticketKey}/comments`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          commentId: editingCommentId,
          content: editingCommentText,
          edit_reason: 'Content updated'
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setEditingCommentId(null)
          setEditingCommentText('')
          // Reload timeline to show updated comment
          loadTimeline()
        } else {
          alert('Failed to update comment: ' + data.error)
        }
      } else {
        const data = await response.json()
        alert('Failed to update comment: ' + data.error)
      }
    } catch (err: any) {
      console.error('Error updating comment:', err)
      alert('Failed to update comment')
    } finally {
      setIsUpdatingComment(false)
    }
  }

  const handleDeleteComment = (commentId: string) => {
    // Find the comment to check if it has attachments
    const comment = timeline.find(event => event.type === 'comment' && (event.commentId || event.id) === commentId)
    const hasAttachments = comment?.attachments && comment.attachments.length > 0
    
    setCommentToDelete({ id: commentId, hasAttachments: Boolean(hasAttachments) })
    setShowDeleteModal(true)
  }

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return

    setIsDeletingComment(commentToDelete.id)
    setShowDeleteModal(false)
    
    try {
      const response = await fetch(`/api/tickets/by-key/${ticketKey}/comments`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          commentId: commentToDelete.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Reload timeline and attachments to reflect deletion
          loadTimeline()
          loadAttachments()
        } else {
          alert('Failed to delete comment: ' + data.error)
        }
      } else {
        const data = await response.json()
        alert('Failed to delete comment: ' + data.error)
      }
    } catch (err: any) {
      console.error('Error deleting comment:', err)
      alert('Failed to delete comment')
    } finally {
      setIsDeletingComment(null)
      setCommentToDelete(null)
    }
  }

  const cancelDeleteComment = () => {
    setShowDeleteModal(false)
    setCommentToDelete(null)
  }

  const handleFileUploadComplete = (newAttachments: any[]) => {
    // Refresh attachments and timeline
    loadAttachments()
    loadTimeline()
  }

  const handleCommentFileUploadComplete = (newAttachments: any[]) => {
    // Add to comment attachments (for files attached to comments)
    setCommentAttachments(prev => [...prev, ...newAttachments])
  }

  const handleFileUploadError = (error: string) => {
    alert(`Upload error: ${error}`)
  }

  useEffect(() => {
    if (user) {
      Promise.all([loadTicket(), loadTimeline()]).finally(() => {
        setLoading(false)
      })
    }
  }, [user, ticketKey])

  // Load attachments after ticket is loaded
  useEffect(() => {
    if (ticket?.id) {
      loadAttachments()
    }
  }, [ticket?.id])

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

          {/* Attachments Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">            
            {ticket && (
              <FileUpload
                ticketId={ticket.id}
                onUploadComplete={handleFileUploadComplete}
                onUploadError={handleFileUploadError}
                maxFiles={10}
                showExisting={true}
                existingAttachments={attachments}
                collapsible={true}
                defaultCollapsed={true}
                title="Ticket Attachments"
                className="w-full"
              />
            )}
            
            {loadingAttachments && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Loading attachments...</span>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💬 Comments</h3>
            
            {/* Add Comment */}
            <div className="mb-6">
              <div className="border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  placeholder="Add a comment..."
                  className="w-full border-0 resize-none px-3 py-2 text-sm focus:outline-none focus:ring-0"
                />
                
                {/* Compact File Upload for Comments */}
                <div className="border-t border-gray-200 px-3 py-2 bg-gray-50">
                  <div className="flex items-center justify-between">
                    {ticket && (
                      <FileUpload
                        ticketId={ticket.id}
                        onUploadComplete={handleCommentFileUploadComplete}
                        onUploadError={handleFileUploadError}
                        maxFiles={5}
                        compactMode={true}
                        showExisting={false}
                        resetTrigger={fileUploadResetTrigger}
                        className="flex-1"
                      />
                    )}
                    
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || isSubmittingComment}
                      className="ml-3 inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                      {isSubmittingComment ? 'Adding...' : 'Add Comment'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {timeline.filter(event => event.type === 'comment').length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No comments yet</p>
                </div>
              ) : (
                timeline.filter(event => event.type === 'comment').map((comment) => (
                  <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{comment.author}</span>
                        <span className="text-xs text-gray-500">
                          {comment.authorType === 'admin' ? 'Admin' : 'User'}
                        </span>
                        {comment.metadata?.edited && (
                          <span className="text-xs text-gray-400 italic">(edited)</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {new Date(comment.timestamp).toLocaleString()}
                        </span>
                        
                        {/* Edit/Delete buttons */}
                        <div className="flex items-center space-x-1">
                          {editingCommentId === (comment.commentId || comment.id) ? (
                            <>
                              <button
                                onClick={handleCancelEditComment}
                                disabled={isUpdatingComment}
                                className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                                title="Cancel editing"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                              <button
                                onClick={handleSaveEditComment}
                                disabled={isUpdatingComment || !editingCommentText.trim()}
                                className="p-1 hover:bg-green-100 rounded text-green-600 hover:text-green-700"
                                title="Save changes"
                              >
                                <CheckIcon className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditComment(comment.commentId || comment.id, comment.description)}
                                className="p-1 hover:bg-blue-100 rounded text-blue-600 hover:text-blue-700"
                                title="Edit comment"
                              >
                                <PencilIcon className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.commentId || comment.id)}
                                disabled={isDeletingComment === (comment.commentId || comment.id)}
                                className="p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-700"
                                title="Delete comment"
                              >
                                {isDeletingComment === (comment.commentId || comment.id) ? (
                                  <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <TrashIcon className="h-3 w-3" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Comment content - editable if in edit mode */}
                    {editingCommentId === (comment.commentId || comment.id) ? (
                      <div className="mb-3">
                        <textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          rows={3}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Edit your comment..."
                        />
                      </div>
                    ) : (
                      <div className="text-sm text-gray-900 whitespace-pre-wrap mb-3">
                        {comment.description}
                      </div>
                    )}
                    
                    {/* Comment Attachments */}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                          <PaperClipIcon className="h-3 w-3 mr-1" />
                          Attachments ({comment.attachments.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {comment.attachments.map((attachment: any) => (
                            <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                              <div className="flex-shrink-0">
                                {attachment.mime_type?.startsWith('image/') ? (
                                  <PhotoIcon className="h-4 w-4 text-blue-500" />
                                ) : attachment.mime_type?.startsWith('video/') ? (
                                  <VideoCameraIcon className="h-4 w-4 text-green-500" />
                                ) : (
                                  <DocumentIcon className="h-4 w-4 text-gray-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate">
                                  {attachment.original_filename}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {attachment.file_size ? `${Math.round(attachment.file_size / 1024)} KB` : 'Unknown size'}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                <button
                                  onClick={() => window.open(attachment.public_url, '_blank')}
                                  className="p-1 hover:bg-blue-100 rounded text-blue-600 hover:text-blue-700 transition-colors"
                                  title="View file"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

          {/* Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">📅 Timeline</h3>
            
            {/* Timeline Events */}
            <div className="space-y-3">
              {timeline.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <ClockIcon className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                  <p className="text-xs">No activity yet</p>
                </div>
              ) : (
                <div className="flow-root">
                  <ul className="-mb-2">
                    {timeline.map((event, index) => (
                      <li key={event.id}>
                        <div className="relative pb-3">
                          {index !== timeline.length - 1 && (
                            <span className="absolute top-3 left-2 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                          )}
                          <div className="relative flex space-x-2">
                            <div className="h-4 w-4 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                              {getTimelineIcon(event.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-gray-900">{event.title}</div>
                              <div className="text-xs text-gray-500">
                                by {event.author} • {new Date(event.timestamp).toLocaleDateString()}
                              </div>
                              {event.type === 'comment' && event.description && (
                                <div className="text-xs text-gray-600 mt-1 truncate">
                                  "{event.description.substring(0, 50)}{event.description.length > 50 ? '...' : ''}"
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
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

      {/* Delete Comment Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Comment
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this comment? This action cannot be undone.
              {commentToDelete?.hasAttachments && (
                <span className="block mt-2 text-orange-600 font-medium">
                  ⚠️ This will also delete any attachments associated with this comment.
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeleteComment}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteComment}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Delete Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
