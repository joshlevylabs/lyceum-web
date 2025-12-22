'use client'

import { useState } from 'react'
import {
  CheckCircle,
  XCircle,
  Warning,
  Clock,
  Pencil
} from '@phosphor-icons/react'

interface LicenseStatusManagerProps {
  licenseId: string
  currentStatus: string
  onStatusChange: (newStatus: string) => void
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', description: 'License is active and can be used' },
  { value: 'inactive', label: 'Inactive', description: 'License is disabled but not expired' },
  { value: 'trial', label: 'Trial', description: 'License is in trial period' },
  { value: 'expired', label: 'Expired', description: 'License has expired' },
  { value: 'revoked', label: 'Revoked', description: 'License has been permanently revoked' }
]

export default function LicenseStatusManager({ 
  licenseId, 
  currentStatus, 
  onStatusChange 
}: LicenseStatusManagerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(currentStatus)
  const [updating, setUpdating] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'inactive':
        return <XCircle className="h-5 w-5 text-gray-500" />
      case 'trial':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'revoked':
        return <Warning className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'trial':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'revoked':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const handleStatusUpdate = async () => {
    if (selectedStatus === currentStatus) {
      setIsEditing(false)
      return
    }

    try {
      setUpdating(true)
      
      const response = await fetch(`/api/admin/licenses/${licenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus })
      })

      if (response.ok) {
        onStatusChange(selectedStatus)
        setIsEditing(false)
      } else {
        const result = await response.json()
        alert(`Failed to update status: ${result.error}`)
        setSelectedStatus(currentStatus) // Reset on error
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
      setSelectedStatus(currentStatus) // Reset on error
    } finally {
      setUpdating(false)
    }
  }

  const cancelEdit = () => {
    setSelectedStatus(currentStatus)
    setIsEditing(false)
  }

  const currentStatusOption = STATUS_OPTIONS.find(option => option.value === currentStatus)

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Change License Status</h4>
        
        <div className="space-y-3">
          {STATUS_OPTIONS.map((option) => (
            <div
              key={option.value}
              onClick={() => setSelectedStatus(option.value)}
              className={`p-3 rounded-md border cursor-pointer transition-colors ${
                selectedStatus === option.value
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                {getStatusIcon(option.value)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{option.label}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(option.value)}`}>
                      {option.value}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </div>
                {selectedStatus === option.value && (
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={cancelEdit}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleStatusUpdate}
            disabled={updating}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {updating ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon(currentStatus)}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">License Status</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(currentStatus)}`}>
                {currentStatus}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {currentStatusOption?.description || 'Current license status'}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          <Pencil className="h-4 w-4 mr-1" />
          Change Status
        </button>
      </div>
    </div>
  )
}

