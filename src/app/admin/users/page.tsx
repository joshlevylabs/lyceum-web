'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MagnifyingGlassIcon,
  UserIcon,
  KeyIcon,
  CalendarIcon,
  PencilIcon,
  LockClosedIcon,
  LockOpenIcon,
  EyeIcon,
  FunnelIcon,
  UserPlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CreditCardIcon,
  CircleStackIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ServerIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

// Helper function to generate stable user keys
async function generateStableUserKeys(users: User[]): Promise<User[]> {
  // Sort users by creation date to ensure consistent ordering
  const sortedUsers = users.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  
  return sortedUsers.map((user, index) => ({
    ...user,
    user_key: `USER-${index + 1}`
  }))
}

interface User {
  id: string
  email: string
  username: string
  full_name: string
  company?: string
  role: string
  is_active: boolean
  created_at: string
  last_sign_in?: string
  license?: {
    id: string
    key_code: string
    license_type: string
    status: string
    expires_at?: string
  }
  onboarding_status?: string
  projects_count: number
  sessions_count: number
  payment_status?: {
    status: string
    subscription_type: string
    monthly_amount?: number
    currency?: string
    next_billing_date?: string
    last_payment_date?: string
    payment_failures?: number
  }
  resource_usage?: {
    database_clusters_count: number
    storage_used_mb: number
    storage_limit_mb: number
    bandwidth_used_mb: number
    bandwidth_limit_mb: number
    api_calls_count: number
    api_calls_limit: number
    compute_hours_used: number
    compute_hours_limit: number
  }
  database_clusters?: Array<{
    id: string
    cluster_name: string
    cluster_type: string
    status: string
    region: string
    storage_size_mb: number
    last_accessed?: string
  }>
  all_licenses?: Array<{
    id: string
    key_code: string
    license_type: string
    plugin_id: string
    status: string
    expires_at?: string
    assigned_at?: string
  }>
  subscription?: {
    id: string
    plan_name: string
    status: string
    billing_cycle: string
    monthly_amount: number
    currency: string
    current_period_end: string
    cancel_at_period_end: boolean
  }
  invoices?: Array<{
    id: string
    invoice_number: string
    status: string
    total_amount: number
    currency: string
    due_date: string
    paid_date?: string
  }>
  payment_methods?: Array<{
    id: string
    payment_type: string
    last_four_digits?: string
    card_brand?: string
    is_default: boolean
    is_active: boolean
  }>
  user_key?: string // USER-1, USER-2, etc.
}

interface Column {
  id: string
  name: string
  align?: 'left' | 'center' | 'right'
  width?: string
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'engineer' | 'analyst' | 'viewer'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterOnboarding, setFilterOnboarding] = useState<'all' | 'completed' | 'pending'>('all')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null)
  const [showSubscriptionForm, setShowSubscriptionForm] = useState<string | null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState<{userId: string, invoices: any[]} | null>(null)
  const [showLicenseModal, setShowLicenseModal] = useState<{userId: string, licenses: any[]} | null>(null)
  const [showClusterModal, setShowClusterModal] = useState<{userId: string, clusters: any[]} | null>(null)
  const [passwordResetLink, setPasswordResetLink] = useState<string | null>(null)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  
  // Column order state
  const [columnOrder, setColumnOrder] = useState<Column[]>([
    { id: 'view', name: 'View Profile', align: 'center' },
    { id: 'key', name: 'Key', align: 'left' },
    { id: 'username', name: 'Username', align: 'left' },
    { id: 'full_name', name: 'Full Name', align: 'left' },
    { id: 'email', name: 'Email', align: 'left' },
    { id: 'company', name: 'Company', align: 'left' },
    { id: 'role', name: 'Role', align: 'left' },
    { id: 'joined', name: 'Joined', align: 'left' },
    { id: 'last_login', name: 'Last Login', align: 'left' },
    { id: 'payment', name: 'Payment', align: 'center' },
    { id: 'subscription', name: 'Subscription', align: 'left' },
    { id: 'status', name: 'Status', align: 'center' },
    { id: 'licenses', name: 'Licenses', align: 'center' },
    { id: 'clusters', name: 'Clusters', align: 'center' },
    { id: 'invoices', name: 'Invoices', align: 'center' },
    { id: 'edit', name: 'Edit Profile', align: 'center' }
  ])

  useEffect(() => {
    loadUsers()
  }, [filterRole, filterStatus, filterOnboarding, searchTerm])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/users/list', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load users')

      let data: User[] = json.users || []

      // Generate stable user keys based on creation order
      data = await generateStableUserKeys(data)

      if (filterRole !== 'all') data = data.filter(u => u.role === filterRole)
      if (filterStatus !== 'all') data = data.filter(u => filterStatus === 'active' ? u.is_active : !u.is_active)
      if (filterOnboarding !== 'all') data = data.filter(u => (filterOnboarding === 'completed' ? u.onboarding_status === 'completed' : u.onboarding_status !== 'completed'))
      if (searchTerm) {
        const t = searchTerm.toLowerCase()
        data = data.filter(u =>
          u.email?.toLowerCase().includes(t)
          || u.full_name?.toLowerCase().includes(t)
          || u.username?.toLowerCase().includes(t)
          || (u.company || '').toLowerCase().includes(t)
          || u.user_key?.toLowerCase().includes(t)
        )
      }

      setUsers(data)
    } catch (error) {
      console.error('Failed to load users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'engineer': return 'bg-blue-100 text-blue-800'
      case 'analyst': return 'bg-green-100 text-green-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getLicenseTypeColor = (type: string) => {
    switch (type) {
      case 'enterprise': return 'bg-purple-100 text-purple-800'
      case 'professional': return 'bg-blue-100 text-blue-800'
      case 'standard': return 'bg-green-100 text-green-800'
      case 'trial': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getOnboardingColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'suspended': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getClusterStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'suspended': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getUsagePercentage = (used: number, limit: number) => {
    return limit > 0 ? Math.round((used / limit) * 100) : 0
  }

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircleIcon className="h-5 w-5 text-green-500" title="Active" />
    ) : (
      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" title="Inactive" />
    )
  }

  const openLicenseModal = (user: User) => {
    setShowLicenseModal({
      userId: user.id,
      licenses: user.all_licenses || []
    })
  }

  const openClusterModal = (user: User) => {
    setShowClusterModal({
      userId: user.id,
      clusters: user.database_clusters || []
    })
  }

  // Column drag handlers
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropColumnId: string) => {
    e.preventDefault()
    if (!draggedColumn || draggedColumn === dropColumnId) {
      setDraggedColumn(null)
      return
    }

    const draggedIndex = columnOrder.findIndex(col => col.id === draggedColumn)
    const dropIndex = columnOrder.findIndex(col => col.id === dropColumnId)
    
    const newColumnOrder = [...columnOrder]
    const draggedCol = newColumnOrder.splice(draggedIndex, 1)[0]
    newColumnOrder.splice(dropIndex, 0, draggedCol)
    
    setColumnOrder(newColumnOrder)
    setDraggedColumn(null)
  }

  const handleDragEnd = () => {
    setDraggedColumn(null)
  }

  // Function to render cell content based on column type
  const renderCellContent = (column: Column, user: User) => {
    switch (column.id) {
      case 'view':
        return (
          <td key="view" className="px-6 py-4 whitespace-nowrap text-center">
            <Link
              href={`/admin/users/${user.id}/profile`}
              className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
              title="View full user profile"
            >
              <EyeIcon className="h-4 w-4 mr-1" />
              View
            </Link>
          </td>
        )
      case 'key':
        return (
          <td key="key" className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
              <span className="text-sm font-mono font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {user.user_key}
              </span>
            </div>
          </td>
        )
      case 'username':
        return (
          <td key="username" className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm font-medium text-gray-900">
              {user.username}
            </div>
          </td>
        )
      case 'full_name':
        return (
          <td key="full_name" className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                user.is_active ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <UserIcon className={`h-4 w-4 ${
                  user.is_active ? 'text-blue-600' : 'text-gray-400'
                }`} />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {user.full_name}
                </div>
              </div>
            </div>
          </td>
        )
      case 'email':
        return (
          <td key="email" className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-900">{user.email}</div>
          </td>
        )
      case 'company':
        return (
          <td key="company" className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-500">{user.company || '-'}</div>
          </td>
        )
      case 'role':
        return (
          <td key="role" className="px-6 py-4 whitespace-nowrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
              {user.role}
            </span>
          </td>
        )
      case 'joined':
        return (
          <td key="joined" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatDate(user.created_at)}
          </td>
        )
      case 'last_login':
        return (
          <td key="last_login" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {user.last_sign_in ? formatDate(user.last_sign_in) : 'Never'}
          </td>
        )
      case 'payment':
        return (
          <td key="payment" className="px-6 py-4 whitespace-nowrap text-center">
            <button
              onClick={() => setShowPaymentForm(user.id)}
              className={`p-2 rounded-full hover:bg-gray-100 ${
                user.payment_status?.status === 'active' ? 'text-green-600' :
                user.payment_status?.status === 'overdue' ? 'text-red-600' :
                'text-gray-400'
              }`}
              title={`Payment Status: ${user.payment_status?.status || 'Unknown'}`}
            >
              <CreditCardIcon className="h-5 w-5" />
            </button>
          </td>
        )
      case 'subscription':
        return (
          <td key="subscription" className="px-6 py-4 whitespace-nowrap">
            <button
              onClick={() => setShowSubscriptionForm(user.id)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {user.payment_status?.subscription_type || 'None'}
            </button>
          </td>
        )
      case 'status':
        return (
          <td key="status" className="px-6 py-4 whitespace-nowrap text-center">
            <button
              onClick={() => toggleUserStatus(user.id, user.is_active)}
              className="p-2 rounded-full hover:bg-gray-100"
              title={`Toggle user status (currently ${user.is_active ? 'active' : 'inactive'})`}
            >
              {getStatusIcon(user.is_active)}
            </button>
          </td>
        )
      case 'licenses':
        return (
          <td key="licenses" className="px-6 py-4 whitespace-nowrap text-center">
            <button
              onClick={() => openLicenseModal(user)}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
              title="View and manage licenses"
            >
              <KeyIcon className="h-4 w-4 mr-1" />
              {user.all_licenses?.length || 0}
            </button>
          </td>
        )
      case 'clusters':
        return (
          <td key="clusters" className="px-6 py-4 whitespace-nowrap text-center">
            <button
              onClick={() => openClusterModal(user)}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200"
              title="View database clusters"
            >
              <CircleStackIcon className="h-4 w-4 mr-1" />
              {user.database_clusters?.length || 0}
            </button>
          </td>
        )
      case 'invoices':
        return (
          <td key="invoices" className="px-6 py-4 whitespace-nowrap text-center">
            <button
              onClick={() => setShowInvoiceModal({userId: user.id, invoices: user.invoices || []})}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200"
              title="View invoices"
            >
              <BanknotesIcon className="h-4 w-4 mr-1" />
              {user.invoices?.length || 0}
            </button>
          </td>
        )
      case 'edit':
        return (
          <td key="edit" className="px-6 py-4 whitespace-nowrap text-center">
            <button
              onClick={() => {
                setEditingUser(user)
                setShowEditModal(true)
              }}
              className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
              title="Edit user profile"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </button>
          </td>
        )
      default:
        return <td key={column.id} className="px-6 py-4 whitespace-nowrap">-</td>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, is_active: !currentStatus })
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('Update failed:', json)
        alert(`Failed to update user: ${json.error || 'Unknown error'}`)
        return
      }
      loadUsers()
    } catch (e) {
      console.error('Update error:', e)
      alert('Failed to update user')
    }
  }

  const setUserRole = async (userId: string, role: string) => {
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role })
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('Role update failed:', json)
        alert(`Failed to update role: ${json.error || 'Unknown error'}`)
        return
      }
      loadUsers()
    } catch (e) {
      console.error('Role update error:', e)
      alert('Failed to update role')
    }
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setEditingUser(null)
    setShowEditModal(false)
  }

  const saveUserChanges = async (updatedUser: Partial<User>) => {
    if (!editingUser) return
    
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: editingUser.id, 
          ...updatedUser 
        })
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('User update failed:', json)
        alert(`Failed to update user: ${json.error || 'Unknown error'}`)
        return
      }
      closeEditModal()
      loadUsers()
    } catch (e) {
      console.error('User update error:', e)
      alert('Failed to update user')
    }
  }

  const unassignLicense = async (keyId: string) => {
    try {
      await fetch('/api/admin/licenses/unassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_id: keyId })
      })
      loadUsers()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            User Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage user accounts, licenses, and onboarding status
          </p>
        </div>
        
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            href="/admin/users/invite"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <UserPlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Invite User
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex flex-wrap gap-4">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="engineer">Engineer</option>
            <option value="analyst">Analyst</option>
            <option value="viewer">Viewer</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          
          <select
            value={filterOnboarding}
            onChange={(e) => setFilterOnboarding(e.target.value as any)}
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Onboarding</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Users Table - Jira Style */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading users...</span>
          </div>
        ) : users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columnOrder.map((column) => (
                    <th
                      key={column.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, column.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, column.id)}
                      onDragEnd={handleDragEnd}
                      className={`px-6 py-3 text-${column.align || 'left'} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-move hover:bg-gray-100 transition-colors ${
                        draggedColumn === column.id ? 'opacity-50' : ''
                      }`}
                      title="Drag to reorder columns"
                    >
                      <div className="flex items-center gap-1">
                        <span>{column.name}</span>
                        <FunnelIcon className="h-3 w-3 text-gray-400" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    {columnOrder.map((column) => renderCellContent(column, user))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No users match your search criteria.' : 'No users have been created yet.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link
                  href="/admin/users/invite"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Invite First User
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit User</h3>
              <EditUserForm 
                user={editingUser}
                onSave={saveUserChanges}
                onCancel={closeEditModal}
              />
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <InvoiceManagementModal 
          userId={showInvoiceModal.userId}
          invoices={showInvoiceModal.invoices}
          onClose={() => setShowInvoiceModal(null)}
        />
      )}

      {/* License Modal */}
      {showLicenseModal && (
        <LicenseManagementModal 
          userId={showLicenseModal.userId}
          licenses={showLicenseModal.licenses}
          onClose={() => setShowLicenseModal(null)}
          onRefresh={loadUsers}
        />
      )}

      {/* Cluster Modal */}
      {showClusterModal && (
        <ClusterManagementModal 
          userId={showClusterModal.userId}
          clusters={showClusterModal.clusters}
          onClose={() => setShowClusterModal(null)}
        />
      )}
    </div>
  )
}

// Edit User Form Component
interface EditUserFormProps {
  user: User
  onSave: (updatedUser: Partial<User>) => void
  onCancel: () => void
}

function EditUserForm({ user, onSave, onCancel }: EditUserFormProps) {
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    username: user.username || '',
    company: user.company || '',
    role: user.role || 'engineer',
    is_active: user.is_active
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false)
  const [passwordResetSent, setPasswordResetSent] = useState(false)
  const [resetLinkGenerated, setResetLinkGenerated] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Fallback: select the text
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handlePasswordReset = async () => {
    setSendingPasswordReset(true)
    try {
      // Try the new rate-limit-free link generation first
      const linkResponse = await fetch('/api/admin/users/generate-reset-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id,
          email: user.email 
        })
      })

      const linkResult = await linkResponse.json()
      
      if (linkResult.success && linkResult.reset_link) {
        // Show modal with copy-to-clipboard option
        setResetLinkGenerated(linkResult.reset_link)
        setPasswordResetSent(true)
        return
      }

      // Fallback to original method if link generation fails
      const response = await fetch('/api/admin/users/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id,
          email: user.email 
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setPasswordResetSent(true)
        setTimeout(() => setPasswordResetSent(false), 5000) // Hide message after 5 seconds
      } else {
        alert(`Failed to send password reset: ${result.error}\n\nTip: Try using the debug dashboard for alternative methods.`)
      }
    } catch (error) {
      alert('Failed to send password reset email')
    } finally {
      setSendingPasswordReset(false)
    }
  }

  // Generate masked password display
  const getMaskedPassword = () => {
    if (showPassword) {
      return '[ENCRYPTED] SHA-256 Hash: 5f4dcc3b5...a2b7e8c9d1' // Simulated hash display
    }
    return '••••••••••••••••' // 16 dots to represent encrypted password
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="text"
          value={user.email}
          disabled
          className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-500"
        />
      </div>

      {/* Password Management Section */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showPassword ? 'Hide' : 'Show'} Password
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={getMaskedPassword()}
              disabled
              className={`block w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono ${
                showPassword 
                  ? 'bg-yellow-50 text-yellow-800 border-yellow-300' 
                  : 'bg-gray-100 text-gray-500'
              }`}
              placeholder="Encrypted password"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {showPassword ? (
                <EyeIcon className="h-4 w-4 text-yellow-600" />
              ) : (
                <LockClosedIcon className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>

          {passwordResetSent && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm text-green-800">
                    Password reset email sent to {user.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={sendingPasswordReset || passwordResetSent}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingPasswordReset ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending Reset Email...
              </>
            ) : passwordResetSent ? (
              <>
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Reset Email Sent
              </>
            ) : (
              <>
                <KeyIcon className="h-4 w-4 mr-2" />
                Send Password Reset Email
              </>
            )}
          </button>

          <p className="text-xs text-gray-500">
            This will send an email to the user with instructions to create a new password.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Full Name</label>
        <input
          type="text"
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Username</label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Company</label>
        <input
          type="text"
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Role</label>
        <select
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="viewer">Viewer</option>
          <option value="analyst">Analyst</option>
          <option value="engineer">Engineer</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
          Active User
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>

      {/* Password Reset Link Modal */}
      {resetLinkGenerated && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Password Reset Link Generated
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setResetLinkGenerated(null)
                    setLinkCopied(false)
                    setPasswordResetSent(false)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-green-800">Success!</h4>
                      <p className="mt-1 text-sm text-green-700">
                        Password reset link generated successfully for <strong>{user.email}</strong>
                      </p>
                      <p className="mt-1 text-xs text-green-600">
                        Method: Rate-limit-free generation • No email delivery required • Works immediately
                      </p>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Instructions:</h4>
                  <ol className="text-sm text-blue-700 space-y-1">
                    <li>1. Copy the link below using the "Copy Link" button</li>
                    <li>2. Send it to {user.email} via email, Slack, Teams, or any messaging platform</li>
                    <li>3. The link works immediately and bypasses email delivery issues</li>
                    <li>4. Link expires in 1 hour for security</li>
                  </ol>
                </div>

                {/* Link Display */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Password Reset Link:
                  </label>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={resetLinkGenerated}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono bg-gray-50 resize-none"
                      rows={3}
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={() => copyToClipboard(resetLinkGenerated)}
                        className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md transition-colors ${
                          linkCopied
                            ? 'text-green-800 bg-green-100 hover:bg-green-200'
                            : 'text-blue-800 bg-blue-100 hover:bg-blue-200'
                        }`}
                      >
                        {linkCopied ? (
                          <>
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy Link
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        const subject = encodeURIComponent('Password Reset - Lyceum')
                        const body = encodeURIComponent(
                          `Hi ${user.full_name || user.username},\n\nYou can reset your password using this secure link:\n\n${resetLinkGenerated}\n\nThis link will expire in 1 hour for security reasons.\n\nBest regards,\nLyceum Admin Team`
                        )
                        window.open(`mailto:${user.email}?subject=${subject}&body=${body}`)
                      }}
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <EnvelopeIcon className="h-4 w-4 mr-2" />
                      Send via Email
                    </button>
                    <button
                      onClick={() => copyToClipboard(resetLinkGenerated)}
                      className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      {linkCopied ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          Copied to Clipboard
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy to Clipboard
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Close Button */}
                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={() => {
                      setResetLinkGenerated(null)
                      setLinkCopied(false)
                      setPasswordResetSent(false)
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}

// User Details Panel Component
interface UserDetailsPanelProps {
  user: User
}

function UserDetailsPanel({ user }: UserDetailsPanelProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getUsagePercentage = (used: number, limit: number) => {
    return limit > 0 ? Math.round((used / limit) * 100) : 0
  }

  const getClusterStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'suspended': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Subscription Information */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <BanknotesIcon className="h-4 w-4 mr-2" />
            Subscription
          </h4>
          
          {user.subscription ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan:</span>
                <span className="font-medium">{user.subscription.plan_name}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  user.subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                  user.subscription.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {user.subscription.status}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">
                  ${user.subscription.monthly_amount}/{user.subscription.billing_cycle}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Renews:</span>
                <span>{new Date(user.subscription.current_period_end).toLocaleDateString()}</span>
              </div>
              
              {user.subscription.cancel_at_period_end && (
                <div className="text-red-600 text-xs">
                  ⚠️ Cancels at period end
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No active subscription</p>
          )}
          
          <button 
            onClick={() => setShowSubscriptionForm(user.id)}
            className="mt-3 w-full text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Manage Subscription
          </button>
        </div>

        {/* Payment & Billing Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <CreditCardIcon className="h-4 w-4 mr-2" />
            Payment & Billing
          </h4>
          
          {user.payment_status ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  user.payment_status.status === 'active' ? 'bg-green-100 text-green-800' :
                  user.payment_status.status === 'overdue' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {user.payment_status.status}
                </span>
              </div>
              
              {user.payment_status.monthly_amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">
                    ${user.payment_status.monthly_amount}/{user.payment_status.currency || 'USD'} monthly
                  </span>
                </div>
              )}
              
              {user.payment_status.next_billing_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Next billing:</span>
                  <span>{new Date(user.payment_status.next_billing_date).toLocaleDateString()}</span>
                </div>
              )}
              
              {user.payment_status.payment_failures > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Payment failures:</span>
                  <span className="font-medium">{user.payment_status.payment_failures}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No payment information available</p>
          )}
          
          {/* Payment Methods */}
          {user.payment_methods && user.payment_methods.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Payment Methods:</p>
              {user.payment_methods.map((method) => (
                <div key={method.id} className="flex justify-between items-center text-xs mb-1">
                  <span className="text-gray-600">
                    {method.card_brand?.toUpperCase()} ****{method.last_four_digits}
                  </span>
                  {method.is_default && (
                    <span className="bg-blue-100 text-blue-800 px-1 rounded text-xs">Default</span>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Recent Invoices */}
          {user.invoices && user.invoices.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-medium text-gray-700">Recent Invoices:</p>
                <button 
                  onClick={() => setShowInvoiceModal({userId: user.id, invoices: user.invoices || []})}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  View All
                </button>
              </div>
              {user.invoices.slice(0, 2).map((invoice) => (
                <div key={invoice.id} className="flex justify-between items-center text-xs mb-1">
                  <span className="text-gray-600">{invoice.invoice_number}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">${invoice.total_amount}</span>
                    <span className={`px-1 rounded text-xs ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resource Usage */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <ChartBarIcon className="h-4 w-4 mr-2" />
            Resource Usage
          </h4>
          
          {user.resource_usage ? (
            <div className="space-y-3">
              {/* Storage Usage */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Storage</span>
                  <span className="font-medium">
                    {formatBytes(user.resource_usage.storage_used_mb * 1024 * 1024)} / {formatBytes(user.resource_usage.storage_limit_mb * 1024 * 1024)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      getUsagePercentage(user.resource_usage.storage_used_mb, user.resource_usage.storage_limit_mb) > 80 ? 
                      'bg-red-500' : getUsagePercentage(user.resource_usage.storage_used_mb, user.resource_usage.storage_limit_mb) > 60 ?
                      'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${getUsagePercentage(user.resource_usage.storage_used_mb, user.resource_usage.storage_limit_mb)}%` }}
                  ></div>
                </div>
              </div>

              {/* API Calls */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">API Calls</span>
                  <span className="font-medium">
                    {user.resource_usage.api_calls_count.toLocaleString()} / {user.resource_usage.api_calls_limit.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      getUsagePercentage(user.resource_usage.api_calls_count, user.resource_usage.api_calls_limit) > 80 ? 
                      'bg-red-500' : getUsagePercentage(user.resource_usage.api_calls_count, user.resource_usage.api_calls_limit) > 60 ?
                      'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${getUsagePercentage(user.resource_usage.api_calls_count, user.resource_usage.api_calls_limit)}%` }}
                  ></div>
                </div>
              </div>

              {/* Compute Hours */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Compute Hours</span>
                  <span className="font-medium">
                    {user.resource_usage.compute_hours_used} / {user.resource_usage.compute_hours_limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      getUsagePercentage(user.resource_usage.compute_hours_used, user.resource_usage.compute_hours_limit) > 80 ? 
                      'bg-red-500' : getUsagePercentage(user.resource_usage.compute_hours_used, user.resource_usage.compute_hours_limit) > 60 ?
                      'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${getUsagePercentage(user.resource_usage.compute_hours_used, user.resource_usage.compute_hours_limit)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No usage data available</p>
          )}
        </div>

        {/* Onboarding & Profile */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <UserIcon className="h-4 w-4 mr-2" />
            Profile & Status
          </h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Onboarding:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                user.onboarding_status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user.onboarding_status || 'Pending'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Account Status:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Projects:</span>
              <span className="font-medium">{user.projects_count}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Sessions:</span>
              <span className="font-medium">{user.sessions_count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Database Clusters */}
      {user.database_clusters && user.database_clusters.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <ServerIcon className="h-4 w-4 mr-2" />
            Database Clusters ({user.database_clusters.length})
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {user.database_clusters.map((cluster) => (
              <div key={cluster.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-gray-900">{cluster.cluster_name}</h5>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getClusterStatusColor(cluster.status)}`}>
                    {cluster.status}
                  </span>
                </div>
                
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Type: {cluster.cluster_type}</div>
                  <div>Region: {cluster.region}</div>
                  <div>Storage: {formatBytes(cluster.storage_size_mb * 1024 * 1024)}</div>
                  {cluster.last_accessed && (
                    <div>Last accessed: {new Date(cluster.last_accessed).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Licenses */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <ShieldCheckIcon className="h-4 w-4 mr-2" />
          Licenses ({user.all_licenses?.length || 0})
        </h4>
        
        {user.all_licenses && user.all_licenses.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plugin</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {user.all_licenses.map((license) => (
                  <tr key={license.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {license.plugin_id}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {license.license_type}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        license.status === 'active' ? 'bg-green-100 text-green-800' :
                        license.status === 'expired' ? 'bg-red-100 text-red-800' :
                        license.status === 'revoked' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {license.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                        {license.key_code.substring(0, 12)}...
                      </code>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <div className="flex space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-900 text-xs"
                          title="Edit license"
                        >
                          Edit
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-900 text-xs"
                          title="Revoke license"
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <ShieldCheckIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">No licenses assigned</p>
            <button className="mt-2 text-sm text-blue-600 hover:text-blue-800">
              Assign License
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Payment Management Form Component
interface PaymentManagementFormProps {
  user: User
  onClose: () => void
  onSave: (paymentData: any) => void
}

function PaymentManagementForm({ user, onClose, onSave }: PaymentManagementFormProps) {
  const [formData, setFormData] = useState({
    payment_status: user.payment_status?.status || 'pending',
    subscription_type: user.payment_status?.subscription_type || 'trial',
    monthly_amount: user.payment_status?.monthly_amount || 0,
    currency: user.payment_status?.currency || 'USD',
    next_billing_date: user.payment_status?.next_billing_date ? 
      new Date(user.payment_status.next_billing_date).toISOString().split('T')[0] : '',
    notes: ''
  })
  
  const [showSensitiveFields, setShowSensitiveFields] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const res = await fetch('/api/admin/users/payment/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          ...formData
        })
      })
      
      const json = await res.json()
      if (res.ok) {
        onSave(json)
      } else {
        alert(`Failed to update payment: ${json.error}`)
      }
    } catch (error) {
      alert('Failed to update payment information')
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CreditCardIcon className="h-5 w-5 mr-2" />
            Manage Payment - {user.full_name}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Status</label>
              <select
                value={formData.payment_status}
                onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="overdue">Overdue</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Subscription Type</label>
              <select
                value={formData.subscription_type}
                onChange={(e) => setFormData({ ...formData, subscription_type: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="trial">Trial</option>
                <option value="basic">Basic</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_sensitive"
                checked={showSensitiveFields}
                onChange={(e) => setShowSensitiveFields(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="show_sensitive" className="ml-2 block text-sm text-gray-900">
                Show payment details (admin only)
              </label>
            </div>

            {showSensitiveFields && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Monthly Amount</label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <BanknotesIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.monthly_amount}
                      onChange={(e) => setFormData({ ...formData, monthly_amount: parseFloat(e.target.value) || 0 })}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Next Billing Date</label>
                  <input
                    type="date"
                    value={formData.next_billing_date}
                    onChange={(e) => setFormData({ ...formData, next_billing_date: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Admin Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Internal notes about payment status..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Update Payment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// License Management Modal Component
interface LicenseManagementModalProps {
  userId: string
  licenses: any[]
  onClose: () => void
  onRefresh: () => void
}

function LicenseManagementModal({ userId, licenses, onClose, onRefresh }: LicenseManagementModalProps) {
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [showCreateLicenseForm, setShowCreateLicenseForm] = useState(false)
  const [availableLicenses, setAvailableLicenses] = useState<any[]>([])
  const [selectedLicense, setSelectedLicense] = useState<string>('')

  useEffect(() => {
    loadAvailableLicenses()
  }, [])

  const loadAvailableLicenses = async () => {
    try {
      const res = await fetch('/api/admin/licenses/list')
      const json = await res.json()
      if (json.success) {
        // Filter to only unassigned licenses (check both user_id and assigned_to for legacy compatibility)
        const unassigned = (json.licenses || []).filter((license: any) => {
          const isAssigned = license.user_id || license.assigned_to || license.assigned_to?.id
          return !isAssigned
        })
        setAvailableLicenses(unassigned)
      }
    } catch (error) {
      console.error('Failed to load available licenses:', error)
    }
  }

  const handleAssignExisting = async () => {
    if (!selectedLicense) return

    try {
      const res = await fetch('/api/admin/licenses/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key_id: selectedLicense,
          user_id: userId
        })
      })

      if (res.ok) {
        onRefresh()
        loadAvailableLicenses()
        setShowAssignForm(false)
        setSelectedLicense('')
        alert('License assigned successfully')
      } else {
        const json = await res.json()
        alert(`Failed to assign license: ${json.error}`)
      }
    } catch (error) {
      alert('Failed to assign license')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'revoked': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const revokeLicense = async (licenseId: string) => {
    if (!confirm('Are you sure you want to revoke this license?')) return

    try {
      const res = await fetch('/api/admin/licenses/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_id: licenseId })
      })
      
      if (res.ok) {
        onRefresh()
        alert('License revoked successfully')
      } else {
        const json = await res.json()
        alert(`Failed to revoke license: ${json.error}`)
      }
    } catch (error) {
      alert('Failed to revoke license')
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-[900px] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ShieldCheckIcon className="h-5 w-5 mr-2" />
              License Management
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAssignForm(true)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Assign Existing License
              </button>
              <button
                onClick={() => setShowCreateLicenseForm(true)}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Create New License
              </button>
            </div>
          </div>
          
          {licenses.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Plugin</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {licenses.map((license) => (
                    <tr key={license.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {license.plugin_id}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {license.license_type}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(license.status)}`}>
                          {license.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-4 py-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                          {license.key_code.substring(0, 16)}...
                        </code>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {license.assigned_at ? new Date(license.assigned_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex space-x-2">
                          <button 
                            className="text-blue-600 hover:text-blue-900 text-xs"
                            title="Edit license"
                          >
                            Edit
                          </button>
                          {license.status === 'active' && (
                            <button 
                              onClick={() => revokeLicense(license.id)}
                              className="text-red-600 hover:text-red-900 text-xs"
                              title="Revoke license"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No licenses assigned to this user</p>
              <button
                onClick={() => setShowAssignForm(true)}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Assign a license
              </button>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>

          {/* Assign Existing License Form */}
          {showAssignForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Assign Existing License</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Select License</label>
                    <select
                      value={selectedLicense}
                      onChange={(e) => setSelectedLicense(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a license...</option>
                      {availableLicenses.map((license) => (
                        <option key={license.key_id || license.id} value={license.key_id || license.id}>
                          {license.plugin_id || license.key_code || 'General'} - {license.license_type} 
                          {license.expires_at && ` (Expires: ${new Date(license.expires_at).toLocaleDateString()})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {availableLicenses.length === 0 && (
                    <div className="text-sm text-gray-500">
                      No unassigned licenses available. Create a new license instead.
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAssignForm(false)
                      setSelectedLicense('')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignExisting}
                    disabled={!selectedLicense}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    Assign License
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create License Form */}
          {showCreateLicenseForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Create New License</h4>
                
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    This will create a new license and automatically assign it to this user.
                  </p>
                  <div className="flex justify-center">
                    <a
                      href="/admin/licenses/create"
                      target="_blank"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      Open License Creator
                    </a>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateLicenseForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Cluster Management Modal Component
interface ClusterManagementModalProps {
  userId: string
  clusters: any[]
  onClose: () => void
}

function ClusterManagementModal({ userId, clusters, onClose }: ClusterManagementModalProps) {
  const getClusterStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'suspended': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-[900px] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CircleStackIcon className="h-5 w-5 mr-2" />
              Database Clusters ({clusters.length})
            </h3>
            <button
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Create New Cluster
            </button>
          </div>
          
          {clusters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clusters.map((cluster) => (
                <div key={cluster.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">{cluster.cluster_name}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getClusterStatusColor(cluster.status)}`}>
                      {cluster.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="font-medium">{cluster.cluster_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Region:</span>
                      <span className="font-medium">{cluster.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Storage:</span>
                      <span className="font-medium">{formatBytes(cluster.storage_size_mb * 1024 * 1024)}</span>
                    </div>
                    {cluster.last_accessed && (
                      <div className="flex justify-between">
                        <span>Last accessed:</span>
                        <span className="font-medium">{new Date(cluster.last_accessed).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <button className="flex-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200">
                      Manage
                    </button>
                    <button className="flex-1 px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200">
                      Monitor
                    </button>
                    <button className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CircleStackIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No database clusters found for this user</p>
              <button className="mt-2 text-green-600 hover:text-green-800">
                Create the first cluster
              </button>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
