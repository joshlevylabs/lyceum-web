'use client'

import { useState, useEffect } from 'react'
import { User, Plus, Trash, CurrencyDollar } from '@phosphor-icons/react'

interface User {
  id: string
  email: string
  full_name?: string
  username?: string
}

interface AssignedUser extends User {
  assigned_at?: string
}

interface UserAssignmentManagerProps {
  licenseId: string
  assignedUsers: AssignedUser[]
  responsibleUser?: User
  licenseType?: string
  onAssignmentChange: () => void
}

export default function UserAssignmentManager({ 
  licenseId, 
  assignedUsers: initialAssignedUsers = [], 
  responsibleUser,
  licenseType,
  onAssignmentChange 
}: UserAssignmentManagerProps) {
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>(initialAssignedUsers)
  const [loading, setLoading] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [showChangeResponsible, setShowChangeResponsible] = useState(false)
  const [selectedNewUser, setSelectedNewUser] = useState('')
  const [selectedNewResponsible, setSelectedNewResponsible] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadAllUsers()
    loadAssignedUsers()
  }, [licenseId])

  useEffect(() => {
    setAssignedUsers(initialAssignedUsers)
  }, [initialAssignedUsers])

  const loadAllUsers = async () => {
    try {
      const response = await fetch('/api/admin/users/list')
      const data = await response.json()
      if (data.success) {
        setAllUsers(data.users || [])
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const loadAssignedUsers = async () => {
    try {
      const response = await fetch(`/api/admin/licenses/get-assigned-users?license_id=${licenseId}`)
      const data = await response.json()
      if (data.success) {
        setAssignedUsers(data.assigned_users || [])
      }
    } catch (error) {
      console.error('Failed to load assigned users:', error)
    }
  }

  const handleAssignUser = async () => {
    if (!selectedNewUser) return

    try {
      setLoading(true)
      const response = await fetch('/api/admin/licenses/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_id: licenseId,
          user_id: selectedNewUser
        })
      })

      if (response.ok) {
        setShowAddUser(false)
        setSelectedNewUser('')
        setSearchTerm('')
        await loadAssignedUsers() // Refresh assigned users list
        onAssignmentChange()
      } else {
        const result = await response.json()
        alert(`Failed to assign user: ${result.error}`)
      }
    } catch (error) {
      console.error('Error assigning user:', error)
      alert('Failed to assign user')
    } finally {
      setLoading(false)
    }
  }

  const handleUnassignUser = async (userId: string) => {
    if (!confirm('Are you sure you want to unassign this user from the license?')) return

    try {
      setLoading(true)
      const response = await fetch('/api/admin/licenses/unassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_id: licenseId,
          user_id: userId
        })
      })

      if (response.ok) {
        await loadAssignedUsers() // Refresh assigned users list
        onAssignmentChange()
      } else {
        const result = await response.json()
        alert(`Failed to unassign user: ${result.error}`)
      }
    } catch (error) {
      console.error('Error unassigning user:', error)
      alert('Failed to unassign user')
    } finally {
      setLoading(false)
    }
  }

  const handleChangeResponsibleUser = async () => {
    if (!selectedNewResponsible) return

    try {
      setLoading(true)
      const response = await fetch('/api/admin/licenses/set-responsible-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_id: licenseId,
          responsible_user_id: selectedNewResponsible,
          table_name: 'license_keys'
        })
      })

      if (response.ok) {
        const result = await response.json()
        setShowChangeResponsible(false)
        setSelectedNewResponsible('')
        setSearchTerm('')
        onAssignmentChange()
        alert(`Payment responsibility transferred to ${result.responsible_user?.full_name || result.responsible_user?.email}`)
      } else {
        const result = await response.json()
        alert(`Failed to transfer responsibility: ${result.error}`)
      }
    } catch (error) {
      console.error('Error changing responsible user:', error)
      alert('Failed to change responsible user')
    } finally {
      setLoading(false)
    }
  }

  // Filter users for selection (exclude already assigned users)
  const availableUsers = allUsers.filter(user => 
    !assignedUsers.some(assigned => assigned.id === user.id) &&
    (user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.username?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Filter all users for responsible user selection
  const availableResponsibleUsers = allUsers.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Assigned Users Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Assigned Users ({assignedUsers.length})
          </h3>
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add User
          </button>
        </div>

        {assignedUsers.length === 0 ? (
          <p className="text-gray-500 text-sm">No users assigned to this license</p>
        ) : (
          <div className="space-y-2">
            {assignedUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="font-medium text-gray-900">{user.full_name || user.email}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  {user.assigned_at && (
                    <p className="text-xs text-gray-400">
                      Assigned: {new Date(user.assigned_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleUnassignUser(user.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Remove user"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Responsibility Section - Only show for non-gratis licenses */}
      {licenseType !== 'gratis' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <CurrencyDollar className="h-5 w-5 mr-2" />
              Payment Responsible User
            </h3>
            <button
              onClick={() => setShowChangeResponsible(true)}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              Change Responsibility
            </button>
          </div>

          {responsibleUser ? (
            <div className="p-3 bg-green-50 rounded-md border border-green-200">
              <p className="font-medium text-gray-900">{responsibleUser.full_name || responsibleUser.email}</p>
              <p className="text-sm text-gray-600">{responsibleUser.email}</p>
              <p className="text-xs text-green-700 mt-1">This user will be charged for license costs</p>
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
              <p className="text-yellow-800">No responsible user set</p>
              <p className="text-xs text-yellow-600">License costs may not be properly billed</p>
            </div>
          )}
        </div>
      )}

      {/* Gratis License Notice */}
      {licenseType === 'gratis' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <CurrencyDollar className="h-5 w-5 mr-2" />
              Payment Information
            </h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-blue-800 font-medium">Gratis License - No Payment Required</p>
            <p className="text-xs text-blue-600 mt-1">This license is provided free of charge and does not require a responsible user for billing</p>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">Assign User to License</h4>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {availableUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedNewUser(user.id)}
                  className={`p-2 rounded-md cursor-pointer ${
                    selectedNewUser === user.id 
                      ? 'bg-blue-100 border border-blue-300' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <p className="font-medium">{user.full_name || user.email}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddUser(false)
                  setSelectedNewUser('')
                  setSearchTerm('')
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignUser}
                disabled={!selectedNewUser || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Assigning...' : 'Assign User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Responsible User Modal */}
      {showChangeResponsible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">Change Payment Responsible User</h4>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {availableResponsibleUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedNewResponsible(user.id)}
                  className={`p-2 rounded-md cursor-pointer ${
                    selectedNewResponsible === user.id 
                      ? 'bg-green-100 border border-green-300' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <p className="font-medium">{user.full_name || user.email}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  {user.id === responsibleUser?.id && (
                    <p className="text-xs text-green-600">Current responsible user</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowChangeResponsible(false)
                  setSelectedNewResponsible('')
                  setSearchTerm('')
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeResponsibleUser}
                disabled={!selectedNewResponsible || loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Changing...' : 'Transfer Responsibility'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
