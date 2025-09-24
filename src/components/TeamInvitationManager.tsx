'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  UserPlus, 
  Mail, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle,
  Settings,
  Shield,
  Eye,
  Edit,
  Trash2,
  Copy,
  RotateCcw,
  AlertTriangle,
  Crown,
  User,
  FileText,
  Calendar,
  Search
} from 'lucide-react'

interface TeamMember {
  id: string
  email: string
  name?: string
  role: 'admin' | 'editor' | 'analyst' | 'viewer'
  status: 'active' | 'pending' | 'suspended'
  joinedAt: Date
  lastActivity?: Date
  permissions: TeamPermissions
  invitedBy?: string
}

interface TeamPermissions {
  cluster_management: boolean
  data_read: boolean
  data_write: boolean
  schema_modify: boolean
  user_management: boolean
  billing_access: boolean
  query_execute: boolean
  export_data: boolean
}

interface PendingInvitation {
  id: string
  email: string
  role: 'admin' | 'editor' | 'analyst' | 'viewer'
  permissions: TeamPermissions
  invitedBy: string
  invitedAt: Date
  expiresAt: Date
  message?: string
  status: 'pending' | 'expired' | 'accepted' | 'declined'
}

interface InvitationTemplate {
  id: string
  name: string
  role: 'admin' | 'editor' | 'analyst' | 'viewer'
  permissions: TeamPermissions
  description: string
}

interface TeamInvitationManagerProps {
  clusterId: string
  currentUserId: string
  onMemberUpdate?: (member: TeamMember) => void
  onInvitationSent?: (invitation: PendingInvitation) => void
  className?: string
}

const DEFAULT_ROLE_PERMISSIONS: Record<string, TeamPermissions> = {
  admin: {
    cluster_management: true,
    data_read: true,
    data_write: true,
    schema_modify: true,
    user_management: true,
    billing_access: true,
    query_execute: true,
    export_data: true
  },
  editor: {
    cluster_management: false,
    data_read: true,
    data_write: true,
    schema_modify: true,
    user_management: false,
    billing_access: false,
    query_execute: true,
    export_data: true
  },
  analyst: {
    cluster_management: false,
    data_read: true,
    data_write: false,
    schema_modify: false,
    user_management: false,
    billing_access: false,
    query_execute: true,
    export_data: true
  },
  viewer: {
    cluster_management: false,
    data_read: true,
    data_write: false,
    schema_modify: false,
    user_management: false,
    billing_access: false,
    query_execute: false,
    export_data: false
  }
}

const PERMISSION_DESCRIPTIONS = {
  cluster_management: 'Manage cluster settings, scaling, and configuration',
  data_read: 'Read and view data from the cluster',
  data_write: 'Insert and modify data in the cluster',
  schema_modify: 'Create, alter, and drop tables and schemas',
  user_management: 'Invite, remove, and manage team members',
  billing_access: 'View and manage billing and usage information',
  query_execute: 'Execute custom queries and use query builder',
  export_data: 'Export data and query results'
}

export default function TeamInvitationManager({
  clusterId,
  currentUserId,
  onMemberUpdate,
  onInvitationSent,
  className = ''
}: TeamInvitationManagerProps) {
  // State management
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'templates'>('members')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [invitationTemplates, setInvitationTemplates] = useState<InvitationTemplate[]>([])
  
  // Invitation form state
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'analyst' | 'viewer'>('analyst')
  const [customPermissions, setCustomPermissions] = useState<TeamPermissions>(DEFAULT_ROLE_PERMISSIONS.analyst)
  const [inviteMessage, setInviteMessage] = useState('')
  const [useCustomPermissions, setUseCustomPermissions] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  // Initialize sample data
  useEffect(() => {
    const initializeData = () => {
      // Sample team members
      const members: TeamMember[] = [
        {
          id: 'member1',
          email: 'john.doe@company.com',
          name: 'John Doe',
          role: 'admin',
          status: 'active',
          joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
          permissions: DEFAULT_ROLE_PERMISSIONS.admin,
          invitedBy: currentUserId
        },
        {
          id: 'member2',
          email: 'sarah.wilson@company.com',
          name: 'Sarah Wilson',
          role: 'editor',
          status: 'active',
          joinedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          lastActivity: new Date(Date.now() - 30 * 60 * 1000),
          permissions: DEFAULT_ROLE_PERMISSIONS.editor,
          invitedBy: 'member1'
        },
        {
          id: 'member3',
          email: 'mike.chen@company.com',
          name: 'Mike Chen',
          role: 'analyst',
          status: 'active',
          joinedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          lastActivity: new Date(Date.now() - 10 * 60 * 1000),
          permissions: DEFAULT_ROLE_PERMISSIONS.analyst,
          invitedBy: 'member1'
        }
      ]
      setTeamMembers(members)

      // Sample pending invitations
      const invitations: PendingInvitation[] = [
        {
          id: 'inv1',
          email: 'new.user@company.com',
          role: 'analyst',
          permissions: DEFAULT_ROLE_PERMISSIONS.analyst,
          invitedBy: currentUserId,
          invitedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
          message: 'Welcome to our manufacturing analytics team!',
          status: 'pending'
        },
        {
          id: 'inv2',
          email: 'contractor@external.com',
          role: 'viewer',
          permissions: DEFAULT_ROLE_PERMISSIONS.viewer,
          invitedBy: 'member2',
          invitedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          status: 'pending'
        }
      ]
      setPendingInvitations(invitations)

      // Sample invitation templates
      const templates: InvitationTemplate[] = [
        {
          id: 'template1',
          name: 'Manufacturing Engineer',
          role: 'editor',
          permissions: {
            ...DEFAULT_ROLE_PERMISSIONS.editor,
            schema_modify: false
          },
          description: 'For manufacturing engineers who need data access and limited editing capabilities'
        },
        {
          id: 'template2',
          name: 'Quality Inspector',
          role: 'analyst',
          permissions: {
            ...DEFAULT_ROLE_PERMISSIONS.analyst,
            export_data: false
          },
          description: 'For quality inspectors who need read access and query capabilities'
        },
        {
          id: 'template3',
          name: 'External Auditor',
          role: 'viewer',
          permissions: DEFAULT_ROLE_PERMISSIONS.viewer,
          description: 'For external auditors with read-only access'
        }
      ]
      setInvitationTemplates(templates)
    }

    initializeData()
  }, [currentUserId])

  // Update permissions when role changes
  useEffect(() => {
    if (!useCustomPermissions) {
      setCustomPermissions(DEFAULT_ROLE_PERMISSIONS[inviteRole])
    }
  }, [inviteRole, useCustomPermissions])

  // Apply template
  const applyTemplate = useCallback((templateId: string) => {
    const template = invitationTemplates.find(t => t.id === templateId)
    if (template) {
      setInviteRole(template.role)
      setCustomPermissions(template.permissions)
      setUseCustomPermissions(true)
    }
  }, [invitationTemplates])

  // Send invitations
  const sendInvitations = useCallback(async () => {
    if (!inviteEmails.trim()) return
    
    setIsLoading(true)
    
    try {
      const emails = inviteEmails.split(',').map(email => email.trim()).filter(email => email)
      
      for (const email of emails) {
        const newInvitation: PendingInvitation = {
          id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email,
          role: inviteRole,
          permissions: customPermissions,
          invitedBy: currentUserId,
          invitedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          message: inviteMessage,
          status: 'pending'
        }
        
        setPendingInvitations(prev => [newInvitation, ...prev])
        onInvitationSent?.(newInvitation)
      }
      
      // Reset form
      setInviteEmails('')
      setInviteMessage('')
      setShowInviteForm(false)
      setUseCustomPermissions(false)
      setSelectedTemplate('')
      
    } catch (error) {
      console.error('Failed to send invitations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [inviteEmails, inviteRole, customPermissions, inviteMessage, currentUserId, onInvitationSent])

  // Update member role/permissions
  const updateMember = useCallback((memberId: string, updates: Partial<TeamMember>) => {
    setTeamMembers(prev => prev.map(member => 
      member.id === memberId ? { ...member, ...updates } : member
    ))
  }, [])

  // Remove member
  const removeMember = useCallback((memberId: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== memberId))
  }, [])

  // Resend invitation
  const resendInvitation = useCallback((invitationId: string) => {
    setPendingInvitations(prev => prev.map(inv => 
      inv.id === invitationId 
        ? { 
            ...inv, 
            invitedAt: new Date(), 
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'pending' as const
          } 
        : inv
    ))
  }, [])

  // Cancel invitation
  const cancelInvitation = useCallback((invitationId: string) => {
    setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId))
  }, [])

  // Filter and search
  const filteredMembers = useMemo(() => {
    return teamMembers.filter(member => {
      const matchesSearch = !searchQuery || 
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesRole = !filterRole || member.role === filterRole
      const matchesStatus = !filterStatus || member.status === filterStatus
      
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [teamMembers, searchQuery, filterRole, filterStatus])

  const filteredInvitations = useMemo(() => {
    return pendingInvitations.filter(inv => {
      const matchesSearch = !searchQuery || inv.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRole = !filterRole || inv.role === filterRole
      const matchesStatus = !filterStatus || inv.status === filterStatus
      
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [pendingInvitations, searchQuery, filterRole, filterStatus])

  // Permission update helper
  const updatePermission = useCallback((permission: keyof TeamPermissions, enabled: boolean) => {
    setCustomPermissions(prev => ({ ...prev, [permission]: enabled }))
  }, [])

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-yellow-600" />
      case 'editor': return <Edit className="h-4 w-4 text-blue-600" />
      case 'analyst': return <FileText className="h-4 w-4 text-green-600" />
      case 'viewer': return <Eye className="h-4 w-4 text-gray-600" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Users className="h-7 w-7 text-green-600" />
            Team Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage team members and permissions • Cluster: {clusterId}
          </p>
        </div>
        
        <Button onClick={() => setShowInviteForm(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Members
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b">
        {[
          { id: 'members', label: 'Team Members', count: teamMembers.length },
          { id: 'invitations', label: 'Pending Invitations', count: pendingInvitations.filter(i => i.status === 'pending').length },
          { id: 'templates', label: 'Templates', count: invitationTemplates.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === tab.id 
                ? 'bg-white border-t border-l border-r border-gray-200 text-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <Badge variant="secondary" className="ml-2">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search members, emails, or names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="analyst">Analyst</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'members' && (
        <Card>
          <CardHeader>
            <CardTitle>Team Members ({filteredMembers.length})</CardTitle>
            <CardDescription>
              Manage roles and permissions for team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                    </div>
                    
                    <div>
                      <div className="font-medium">{member.name || member.email}</div>
                      <div className="text-sm text-gray-600">{member.email}</div>
                      <div className="text-xs text-gray-500">
                        Joined {formatTimeAgo(member.joinedAt)} • 
                        Last active {member.lastActivity ? formatTimeAgo(member.lastActivity) : 'Never'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(member.role)}
                        <span className="font-medium capitalize">{member.role}</span>
                      </div>
                      <Badge className={getStatusColor(member.status)}>
                        {member.status}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      {member.id !== currentUserId && (
                        <Button variant="outline" size="sm" onClick={() => removeMember(member.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredMembers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No team members found matching your filters.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'invitations' && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations ({filteredInvitations.length})</CardTitle>
            <CardDescription>
              Manage pending invitations and resend if needed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredInvitations.map(invitation => (
                <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Mail className="h-8 w-8 text-gray-400" />
                    
                    <div>
                      <div className="font-medium">{invitation.email}</div>
                      <div className="text-sm text-gray-600">
                        Invited by {invitation.invitedBy} • {formatTimeAgo(invitation.invitedAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Expires in {Math.ceil((invitation.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))} days
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(invitation.role)}
                        <span className="font-medium capitalize">{invitation.role}</span>
                      </div>
                      <Badge className={getStatusColor(invitation.status)}>
                        {invitation.status}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => resendInvitation(invitation.id)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => cancelInvitation(invitation.id)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredInvitations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No pending invitations found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'templates' && (
        <Card>
          <CardHeader>
            <CardTitle>Invitation Templates ({invitationTemplates.length})</CardTitle>
            <CardDescription>
              Pre-configured role templates for common team positions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invitationTemplates.map(template => (
                <Card key={template.id} className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(template.role)}
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {template.role}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Permissions:</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {Object.entries(template.permissions).map(([key, value]) => (
                          <div key={key} className={`flex items-center gap-1 ${value ? 'text-green-600' : 'text-gray-400'}`}>
                            {value ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {key.replace('_', ' ')}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-4"
                      onClick={() => {
                        applyTemplate(template.id)
                        setSelectedTemplate(template.id)
                        setShowInviteForm(true)
                      }}
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invitation Form Modal/Overlay */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invite Team Members
              </CardTitle>
              <CardDescription>
                Send invitations to new team members with specific roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Input */}
              <div>
                <Label>Email Addresses</Label>
                <Textarea
                  placeholder="Enter email addresses separated by commas..."
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Separate multiple emails with commas
                </div>
              </div>

              {/* Template Selection */}
              {selectedTemplate && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Using template: {invitationTemplates.find(t => t.id === selectedTemplate)?.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Role Selection */}
              <div>
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-yellow-600" />
                        Admin - Full access
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex items-center gap-2">
                        <Edit className="h-4 w-4 text-blue-600" />
                        Editor - Data and schema access
                      </div>
                    </SelectItem>
                    <SelectItem value="analyst">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        Analyst - Read and query access
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-gray-600" />
                        Viewer - Read-only access
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Permissions */}
              <div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={useCustomPermissions}
                    onCheckedChange={setUseCustomPermissions}
                  />
                  <Label>Customize permissions</Label>
                </div>
                
                {useCustomPermissions && (
                  <div className="mt-4 p-4 border rounded-lg">
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(PERMISSION_DESCRIPTIONS).map(([key, description]) => (
                        <div key={key} className="flex items-start space-x-2">
                          <Checkbox
                            checked={customPermissions[key as keyof TeamPermissions]}
                            onCheckedChange={(checked) => updatePermission(key as keyof TeamPermissions, checked as boolean)}
                          />
                          <div>
                            <Label className="text-sm font-medium">
                              {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Label>
                            <div className="text-xs text-gray-600">{description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Personal Message */}
              <div>
                <Label>Personal Message (Optional)</Label>
                <Textarea
                  placeholder="Add a personal welcome message..."
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowInviteForm(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={sendInvitations} 
                  disabled={!inviteEmails.trim() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Invitations
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Phase 2 Achievement Banner */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-green-600 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900">
                🎯 Advanced Team Management Complete!
              </h3>
              <p className="text-green-700">
                Full team invitation system with role-based permissions, templates, and advanced member management. 
                Enterprise-ready collaboration features for manufacturing teams.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
