'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import {
  UsersThree,
  Users,
  Folder,
  Clock,
  Gear,
  Plus,
  Trash,
  Pencil,
  ShieldCheck,
  Eye,
  X,
  Check
} from '@phosphor-icons/react'

interface GroupDetails {
  id: string
  key: string
  name: string
  description: string | null
  slug: string
  owner_id: string
  is_owner: boolean
  user_role: string
  member_count: number
  max_members: number
  role_distribution: {
    owner: number
    admin: number
    editor: number
    viewer: number
  }
  resource_count: number
  created_at: string
}

interface Member {
  id: string
  user_id: string
  email: string
  full_name: string
  username: string
  role: string
  joined_at: string
}

interface Activity {
  id: string
  action: string
  details: any
  created_at: string
  user: {
    id: string
    email: string
    full_name: string
  } | null
}

export default function GroupDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const groupKey = params.id as string  // This is actually the key like "GROUP-1"

  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'resources' | 'activity' | 'settings'>('overview')
  const [group, setGroup] = useState<GroupDetails | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('viewer')
  const [addingMember, setAddingMember] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin')
    } else if (user && groupKey) {
      fetchGroupDetails()
    }
  }, [user, authLoading, groupKey, router])

  const fetchGroupDetails = async () => {
    setLoading(true)
    try {
      // Get auth token from Supabase session
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.warn('No access token found')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/groups/by-key/${groupKey}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setGroup(data.group)
      } else if (response.status === 404) {
        router.push('/groups')
      }
    } catch (error) {
      console.error('Error fetching group:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMembers = async () => {
    if (!group?.id) return
    
    try {
      // Get auth token from Supabase session
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.warn('No access token found')
        return
      }

      const response = await fetch(`/api/groups/${group.id}/members`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members || [])
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const fetchActivity = async () => {
    if (!group?.id) return
    
    try {
      // Get auth token from Supabase session
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.warn('No access token found')
        return
      }

      const response = await fetch(`/api/groups/${group.id}/activity`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error('Error fetching activity:', error)
    }
  }

  useEffect(() => {
    if (activeTab === 'members' && members.length === 0) {
      fetchMembers()
    } else if (activeTab === 'activity' && activities.length === 0) {
      fetchActivity()
    }
  }, [activeTab])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberEmail.trim() || !group?.id) return

    setAddingMember(true)
    try {
      // Get auth token from Supabase session
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        alert('Authentication required. Please refresh the page and try again.')
        setAddingMember(false)
        return
      }

      const response = await fetch(`/api/groups/${group.id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: memberEmail, role: memberRole })
      })

      if (response.ok) {
        setMemberEmail('')
        setMemberRole('viewer')
        fetchMembers()
        fetchGroupDetails() // Refresh member count
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add member')
      }
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Failed to add member')
    } finally {
      setAddingMember(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?') || !group?.id) return

    try {
      // Get auth token from Supabase session
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        alert('Authentication required. Please refresh the page and try again.')
        return
      }

      const response = await fetch(`/api/groups/${group.id}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        fetchMembers()
        fetchGroupDetails()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member')
    }
  }

  const canManageMembers = group && ['owner', 'admin'].includes(group.user_role)

  const getRoleBadge = (role: string) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
      admin: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
      editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
      viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
    }
    return colors[role as keyof typeof colors] || colors.viewer
  }

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!group) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Group not found</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <UserGroup className="h-12 w-12 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-mono font-medium text-gray-500 dark:text-gray-400">
                  {group.key}
                </span>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
              </div>
              {group.description && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{group.description}</p>
              )}
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{group.member_count} members</span>
                <span>•</span>
                <span>{group.resource_count} resources</span>
                <span>•</span>
                <span className={`px-2 py-1 rounded-full ${getRoleBadge(group.user_role)}`}>
                  {group.user_role}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push('/groups')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Back to Groups
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'members', 'resources', 'activity', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Members by Role</h3>
              <div className="space-y-3">
                {Object.entries(group.role_distribution).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between">
                    <span className="capitalize text-gray-700 dark:text-gray-300">{role}</span>
                    <span className={`px-3 py-1 rounded-full ${getRoleBadge(role)}`}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Group Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Slug</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{group.slug}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {new Date(group.created_at).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Capacity</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {group.member_count} / {group.max_members} members
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Members</h3>
            </div>
            
            {canManageMembers && (
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <form onSubmit={handleAddMember} className="flex items-center space-x-3">
                  <input
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="Email address"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="submit"
                    disabled={addingMember}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </button>
                </form>
              </div>
            )}

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {members.map((member) => (
                <div key={member.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-300 font-medium">
                          {member.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{member.full_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadge(member.role)}`}>
                      {member.role}
                    </span>
                    {canManageMembers && member.role !== 'owner' && member.user_id !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-center py-12">
              <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">No resources shared yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Share clusters, sessions, and other resources with your group to collaborate.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Activity Log</h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="px-6 py-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <Clock className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-medium">
                            {activity.user?.full_name || 'System'}
                          </span>
                          {' '}
                          {formatAction(activity.action)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-12 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No activity yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Group Settings</h3>
            {group.is_owner ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={group.name}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={group.description || ''}
                    disabled
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
                        // Delete group logic here
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Group
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Cog6Tooth className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Only the group owner can modify settings
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
